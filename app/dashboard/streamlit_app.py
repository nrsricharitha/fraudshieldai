"""
FraudShield AI - Enterprise Fraud Detection Dashboard.
Five Primary Sections:
1. Dashboard: High-level surveillance overview, active model stats, risk distribution
2. Transaction Analysis: Deep-dive single transaction scoring, risk rating, and SHAP explainability
3. Batch Analysis: CSV upload, batch scoring, validation, and CSV export
4. Fraud Alerts: Dedicated queue for high-risk and suspicious transactions
5. Model Performance: Benchmark evaluation metrics (Kaggle 56,962 test split vs 50 interactive sample),
                      model comparison table, Isolation Forest, and live metrics on uploaded data
"""

import os
import sys
import io
import pandas as pd
import numpy as np
import streamlit as st

# Setup project root
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from app.models.model_service import FraudModelService
from app.preprocessing.feature_engineer import RAW_FEATURE_COLUMNS

st.set_page_config(
    page_title="FraudShield AI",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# Custom Styling
st.markdown("""
<style>
    .stApp {
        background-color: #0b0f15;
    }
    .metric-card {
        background-color: #11161d;
        border: 1px solid #1c2330;
        border-radius: 10px;
        padding: 16px;
        margin-bottom: 12px;
    }
    .badge-fraud {
        background-color: rgba(239, 68, 68, 0.15);
        color: #ef4444;
        border: 1px solid rgba(239, 68, 68, 0.3);
        padding: 4px 8px;
        border-radius: 6px;
        font-weight: 600;
        font-size: 12px;
    }
    .badge-legit {
        background-color: rgba(34, 197, 94, 0.15);
        color: #22c55e;
        border: 1px solid rgba(34, 197, 94, 0.3);
        padding: 4px 8px;
        border-radius: 6px;
        font-weight: 600;
        font-size: 12px;
    }
    .badge-high {
        background-color: rgba(239, 68, 68, 0.15);
        color: #ef4444;
        border: 1px solid rgba(239, 68, 68, 0.3);
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: 600;
        font-size: 11px;
    }
    .badge-med {
        background-color: rgba(245, 158, 11, 0.15);
        color: #f59e0b;
        border: 1px solid rgba(245, 158, 11, 0.3);
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: 600;
        font-size: 11px;
    }
    .badge-low {
        background-color: rgba(34, 197, 94, 0.15);
        color: #22c55e;
        border: 1px solid rgba(34, 197, 94, 0.3);
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: 600;
        font-size: 11px;
    }
    /* Style top horizontal navigation tabs */
    .stTabs [data-baseweb="tab-list"] {
        gap: 8px;
        background-color: #11161d;
        padding: 8px;
        border-radius: 12px;
        border: 1px solid #1c2330;
    }
    .stTabs [data-baseweb="tab"] {
        border-radius: 8px;
        padding: 8px 18px;
        color: #94a3b8;
        font-weight: 500;
        font-size: 14px;
    }
    .stTabs [aria-selected="true"] {
        background-color: rgba(51, 133, 255, 0.15) !important;
        color: #3385ff !important;
        font-weight: 600 !important;
        border-bottom: none !important;
    }
</style>
""", unsafe_allow_html=True)


@st.cache_resource
def get_service():
    return FraudModelService.get_instance()


service = get_service()

# Initialize Session State
if 'kaggle_samples' not in st.session_state:
    st.session_state.kaggle_samples = service.get_sample_transactions(50)
if 'selected_tx_id' not in st.session_state:
    st.session_state.selected_tx_id = 0
if 'uploaded_df' not in st.session_state:
    st.session_state.uploaded_df = None
if 'uploaded_results' not in st.session_state:
    st.session_state.uploaded_results = None

# Header with dynamic Model Status
head_col1, head_col2 = st.columns([3, 1])
with head_col1:
    st.title("🛡️ FraudShield AI")
    st.caption("Enterprise Fraud Detection & Machine Learning Surveillance System")
with head_col2:
    if service.is_loaded:
        active_model = service.metadata.get('selected_model', 'XGBoost')
        active_thresh = service.threshold
        st.markdown(
            f"<div style='text-align:right; padding-top:10px;'>"
            f"<span style='background:rgba(34,197,94,0.15); color:#22c55e; border:1px solid rgba(34,197,94,0.3); "
            f"padding:5px 12px; border-radius:6px; font-size:12px; font-weight:600;'>"
            f"● Model Active: {active_model} | Threshold: {active_thresh:.4f}</span>"
            f"</div>",
            unsafe_allow_html=True
        )

# MAIN FIVE-SECTION NAVIGATION
tab_dashboard, tab_tx_analysis, tab_batch_analysis, tab_alerts, tab_model_perf = st.tabs([
    "📊 Dashboard",
    "🔍 Transaction Analysis",
    "📤 Batch Analysis",
    "🚨 Fraud Alerts",
    "📈 Model Performance"
])

# ==============================================================================
# 1. DASHBOARD
# ==============================================================================
with tab_dashboard:
    st.subheader("Surveillance Overview")
    st.caption("Executive overview of transaction volume, active detection rates, and risk posture.")

    # Base samples scored
    samples = st.session_state.kaggle_samples
    df_samples = pd.DataFrame(samples)
    sample_res = service.predict_batch(df_samples) if samples else []

    # Combined with uploaded batch if present
    all_evaluated = list(sample_res)
    if st.session_state.uploaded_results:
        all_evaluated.extend(st.session_state.uploaded_results)

    total_evaluated = len(all_evaluated)
    fraud_detected = sum(1 for r in all_evaluated if r['prediction'] == 1)
    high_risk_count = sum(1 for r in all_evaluated if r['risk_category'] == 'High Risk')
    med_risk_count = sum(1 for r in all_evaluated if r['risk_category'] == 'Medium Risk')
    low_risk_count = sum(1 for r in all_evaluated if r['risk_category'] == 'Low Risk')
    anomalies_detected = sum(1 for r in all_evaluated if r.get('is_anomaly', False))

    meta = service.metadata
    sel_metrics = meta.get('selected_model_metrics', {})
    opt_metrics = sel_metrics.get('optimal_metrics', {})

    # Top Level KPI Metrics
    kpi1, kpi2, kpi3, kpi4 = st.columns(4)
    with kpi1:
        st.metric("Transactions Analyzed", f"{total_evaluated:,}", delta="Live Scored")
    with kpi2:
        st.metric("Fraudulent Intercepted", f"{fraud_detected}", delta="Flagged")
    with kpi3:
        st.metric("High-Risk Transactions", f"{high_risk_count}", delta="Score ≥ 71")
    with kpi4:
        st.metric("Anomalies Detected", f"{anomalies_detected}", delta="Isolation Forest")

    st.markdown("---")

    # Mid Level: Model Status & Risk Distribution
    mcol1, mcol2 = st.columns([1, 1])

    with mcol1:
        st.markdown("### Production Model Status")
        st.markdown(f"""
        <div class="metric-card">
            <p style="margin:0 0 8px 0; color:#94a3b8; font-size:12px; text-transform:uppercase; letter-spacing:0.05em;">Currently Deployed Classifier</p>
            <h3 style="margin:0; color:#f1f5f9; font-weight:700;">{meta.get('selected_model', 'XGBoost')}</h3>
            <p style="color:#64748b; font-size:12px; margin:4px 0 12px 0;">Trained on Kaggle Credit Card Fraud Benchmark</p>
            <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:8px; margin-top:12px;">
                <div style="background:#0b0f15; padding:8px; border-radius:6px; border:1px solid #1c2330; text-align:center;">
                    <span style="color:#64748b; font-size:10px;">PR-AUC</span><br/>
                    <strong style="color:#22c55e; font-size:14px;">{sel_metrics.get('pr_auc', 85.29)}%</strong>
                </div>
                <div style="background:#0b0f15; padding:8px; border-radius:6px; border:1px solid #1c2330; text-align:center;">
                    <span style="color:#64748b; font-size:10px;">FRAUD RECALL</span><br/>
                    <strong style="color:#3385ff; font-size:14px;">{opt_metrics.get('recall', 83.67)}%</strong>
                </div>
                <div style="background:#0b0f15; padding:8px; border-radius:6px; border:1px solid #1c2330; text-align:center;">
                    <span style="color:#64748b; font-size:10px;">THRESHOLD</span><br/>
                    <strong style="color:#f59e0b; font-size:14px;">{service.threshold:.4f}</strong>
                </div>
            </div>
        </div>
        """, unsafe_allow_html=True)

    with mcol2:
        st.markdown("### Risk Tier Distribution")
        tot = max(1, total_evaluated)
        low_pct = (low_risk_count / tot) * 100
        med_pct = (med_risk_count / tot) * 100
        high_pct = (high_risk_count / tot) * 100

        st.markdown(f"""
        <div class="metric-card">
            <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:12px;">
                <span style="color:#22c55e; font-weight:600;">● Low Risk (0–30)</span>
                <span style="color:#cbd5e1;">{low_risk_count} tx ({low_pct:.1f}%)</span>
            </div>
            <div style="width:100%; height:8px; background:#0b0f15; border-radius:4px; overflow:hidden; margin-bottom:12px;">
                <div style="width:{low_pct}%; height:100%; background:#22c55e;"></div>
            </div>

            <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:12px;">
                <span style="color:#f59e0b; font-weight:600;">● Medium Risk (31–70)</span>
                <span style="color:#cbd5e1;">{med_risk_count} tx ({med_pct:.1f}%)</span>
            </div>
            <div style="width:100%; height:8px; background:#0b0f15; border-radius:4px; overflow:hidden; margin-bottom:12px;">
                <div style="width:{med_pct}%; height:100%; background:#f59e0b;"></div>
            </div>

            <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:12px;">
                <span style="color:#ef4444; font-weight:600;">● High Risk (71–100)</span>
                <span style="color:#cbd5e1;">{high_risk_count} tx ({high_pct:.1f}%)</span>
            </div>
            <div style="width:100%; height:8px; background:#0b0f15; border-radius:4px; overflow:hidden;">
                <div style="width:{high_pct}%; height:100%; background:#ef4444;"></div>
            </div>
        </div>
        """, unsafe_allow_html=True)

    # Recent Feed Table
    st.markdown("### Recent Scored Feed")
    feed_df = pd.DataFrame(all_evaluated).head(10)
    if not feed_df.empty:
        st.dataframe(
            feed_df[['transaction_id', 'amount', 'label', 'probability', 'risk_score', 'risk_category', 'is_anomaly']],
            use_container_width=True,
            height=260
        )

# ==============================================================================
# 2. TRANSACTION ANALYSIS
# ==============================================================================
with tab_tx_analysis:
    st.subheader("Transaction Analysis")
    st.caption("Inspect individual transactions, review model verdicts, probability scores, anomaly checks, and SHAP explainability.")

    # Select Mode: Test Sample or Custom Entry or Uploaded Row
    input_source = st.radio(
        "Select Transaction Source:",
        ["Sample Held-Out Test Transactions", "From Uploaded Dataset", "Custom Parameter Entry"],
        horizontal=True
    )

    curr_tx_data = None

    if input_source == "Sample Held-Out Test Transactions":
        samples = st.session_state.kaggle_samples
        if samples:
            options = []
            for i, s in enumerate(samples):
                amt = float(s.get('Amount', 0))
                gt = "FRAUD" if s.get('Class') == 1 else "Legitimate"
                options.append(f"Sample #{i+1} — Amount: ${amt:.2f} | Ground Truth: {gt}")

            sel_str = st.selectbox("Choose a sample transaction:", options, index=0)
            sel_idx = options.index(sel_str)
            curr_tx_data = samples[sel_idx]

    elif input_source == "From Uploaded Dataset":
        up_df = st.session_state.uploaded_df
        up_res = st.session_state.uploaded_results
        if up_df is None or len(up_df) == 0:
            st.info("ℹ️ No dataset currently uploaded. Upload a CSV file in the **'Batch Analysis'** section to inspect transactions from it.")
        else:
            up_options = [
                f"Row #{i+1} [ID: {r['transaction_id']}] — ${r['amount']:.2f} | Verdict: {r['label']} | Score: {r['risk_score']}/100"
                for i, r in enumerate(up_res)
            ]
            up_sel = st.selectbox("Select uploaded transaction:", up_options, index=0)
            up_idx = up_options.index(up_sel)
            curr_tx_data = up_df.iloc[up_idx].to_dict()

    else:
        st.markdown("#### Enter Custom Transaction Features")
        ccol1, ccol2 = st.columns(2)
        with ccol1:
            custom_time = st.number_input("Time (Offset Seconds):", value=45000.0, step=100.0)
        with ccol2:
            custom_amt = st.number_input("Transaction Amount ($):", value=125.50, min_value=0.0, step=5.0)

        with st.expander("Principal Components (V1 to V28)", expanded=False):
            pca_inputs = {}
            pcols = st.columns(4)
            for i in range(1, 29):
                c = pcols[(i - 1) % 4]
                pca_inputs[f'V{i}'] = c.number_input(f"V{i}", value=0.0, format="%.4f")

        curr_tx_data = {'Time': custom_time, 'Amount': custom_amt, **pca_inputs}

    # Execute Prediction & Explainability
    if curr_tx_data:
        st.markdown("---")
        with st.spinner("Executing XGBoost inference and calculating SHAP TreeExplainer attributions..."):
            res = service.predict_single(curr_tx_data, include_explanation=True)

        # 1. Model Verdict, Risk Rating, Anomaly Detection
        rcol1, rcol2, rcol3 = st.columns(3)

        with rcol1:
            st.markdown("### Model Verdict")
            if res['prediction'] == 1:
                st.error(f"🚨 **Potential Fraud**")
            else:
                st.success(f"✅ **Legitimate**")
            st.write(f"**Fraud Probability:** `{res['probability'] * 100:.2f}%`")
            st.write(f"**Applied Threshold:** `{res['threshold_used']:.4f}`")

        with rcol2:
            st.markdown("### Risk Rating")
            st.metric("Risk Score", f"{res['risk_score']} / 100", res['risk_category'])
            st.caption(res['risk_disclaimer'])

        with rcol3:
            st.markdown("### Anomaly Detection")
            anom = res['anomaly_detection']
            if anom['is_anomaly']:
                st.warning(f"⚠️ {anom['message']}")
            else:
                st.info(f"✓ {anom['message']}")
            st.caption(f"Method: {anom['method']}")

        # 2. Explainability
        st.markdown("---")
        st.markdown("### Model Explainability (Contributing Features)")
        st.caption("Real feature contributions calculated by SHAP TreeExplainer from the trained XGBoost model.")

        factors = res.get('top_contributing_factors', [])
        if factors:
            f_table = []
            for f in factors:
                direction_label = "Increases Fraud Risk (+)" if f['direction'] == 'increases_risk' else "Reduces Risk (-)"
                f_table.append({
                    'Feature': f['feature'],
                    'SHAP Contribution': f['shap_value'],
                    'Risk Impact': direction_label,
                    'Description': f['description']
                })
            st.table(pd.DataFrame(f_table))

        # 3. Raw Feature Inspector
        with st.expander("View Input Feature Values", expanded=False):
            st.json({k: curr_tx_data[k] for k in curr_tx_data if k in RAW_FEATURE_COLUMNS or k == 'Class'})

# ==============================================================================
# 3. BATCH ANALYSIS
# ==============================================================================
with tab_batch_analysis:
    st.subheader("Batch Analysis")
    st.caption("Upload a CSV file containing transactions to validate, score, identify high-risk transactions, and export predictions.")

    # Demonstration Input Sample Download
    sample_csv_path = os.path.join('data', 'test_samples_12.csv')
    if os.path.exists(sample_csv_path):
        bcol_dl, bcol_txt = st.columns([1, 3])
        with bcol_dl:
            st.download_button(
                label="📥 Download Test CSV Sample",
                data=open(sample_csv_path, 'rb').read(),
                file_name="test_samples_12.csv",
                mime="text/csv",
                help="Demonstration sample input containing 12 transactions"
            )
        with bcol_txt:
            st.caption("Demonstration input sample formatted to match expected feature columns (`Time`, `Amount`, `V1`–`V28`). Note: This is an input sample for demonstration, not the training dataset.")

    st.markdown("---")

    # CSV File Upload
    uploaded_file = st.file_uploader("Upload CSV containing transaction features:", type=["csv"], key="batch_uploader")

    if uploaded_file is not None:
        try:
            df = pd.read_csv(uploaded_file)
            st.write(f"📁 Loaded `{uploaded_file.name}` containing **{len(df):,}** transactions.")

            # Validate Columns
            missing_cols = [c for c in RAW_FEATURE_COLUMNS if c not in df.columns]
            if missing_cols:
                st.error(f"Validation Error: Uploaded CSV is missing required feature columns: {missing_cols}")
            else:
                with st.spinner("Executing trained FraudShield model pipeline across all records..."):
                    results = service.predict_batch(df)
                    st.session_state.uploaded_df = df
                    st.session_state.uploaded_results = results

                res_df = pd.DataFrame(results)

                # Batch Overview Stats
                b1, b2, b3, b4 = st.columns(4)
                fraud_count = int((res_df['prediction'] == 1).sum())
                high_count = int((res_df['risk_category'] == 'High Risk').sum())
                anom_count = int(res_df['is_anomaly'].sum())

                with b1:
                    st.metric("Total Processed", len(res_df))
                with b2:
                    st.metric("Fraud Detected", fraud_count)
                with b3:
                    st.metric("High-Risk Transactions", high_count)
                with b4:
                    st.metric("Anomalies Flagged", anom_count)

                st.markdown("---")

                # Results Table with Risk Filter
                filter_choice = st.radio("Filter Batch Results:", ["All", "High Risk", "Medium Risk", "Low Risk"], horizontal=True)
                filtered_df = res_df if filter_choice == "All" else res_df[res_df['risk_category'] == filter_choice]

                st.dataframe(
                    filtered_df[['transaction_id', 'amount', 'label', 'probability', 'risk_score', 'risk_category', 'is_anomaly']],
                    use_container_width=True,
                    height=320
                )

                # Export CSV
                csv_buf = io.StringIO()
                res_df.to_csv(csv_buf, index=False)
                st.download_button(
                    label="📥 Export Scored Results (CSV)",
                    data=csv_buf.getvalue(),
                    file_name=f"scored_{uploaded_file.name}",
                    mime="text/csv"
                )

        except Exception as e:
            st.error(f"Error processing CSV: {e}")

# ==============================================================================
# 4. FRAUD ALERTS
# ==============================================================================
with tab_alerts:
    st.subheader("Fraud Alerts")
    st.caption("Dedicated surveillance queue for transactions flagged as Potential Fraud or High Risk by the trained model.")

    # Pool transactions from evaluated samples and uploaded batch
    alert_pool = []
    if sample_res:
        alert_pool.extend(sample_res)
    if st.session_state.uploaded_results:
        alert_pool.extend(st.session_state.uploaded_results)

    # Filter for alerts: prediction == 1 OR High Risk OR Anomaly
    active_alerts = [r for r in alert_pool if r['prediction'] == 1 or r['risk_category'] == 'High Risk']

    if not active_alerts:
        st.info("✓ No active high-risk alerts detected in the current transaction pool.")
    else:
        st.markdown(f"**{len(active_alerts)}** high-risk transactions requiring analyst review.")

        alert_df = pd.DataFrame(active_alerts)
        st.dataframe(
            alert_df[['transaction_id', 'amount', 'label', 'probability', 'risk_score', 'risk_category', 'is_anomaly']],
            use_container_width=True,
            height=280
        )

        st.markdown("---")
        st.markdown("### Inspect Alert Reasons")
        alert_options = [
            f"Alert #{i+1} [{a['transaction_id']}] — Amount: ${a['amount']:.2f} | Probability: {a['probability']*100:.1f}% | Risk: {a['risk_score']}/100"
            for i, a in enumerate(active_alerts)
        ]
        chosen_alert = st.selectbox("Select an alert to inspect feature explanations:", alert_options)
        alert_idx = alert_options.index(chosen_alert)
        alert_record = active_alerts[alert_idx]

        st.markdown(f"**Alert Findings for `{alert_record['transaction_id']}`**:")
        st.write(f"- **Verdict:** `{alert_record['label']}` (Probability: `{alert_record['probability']*100:.2f}%`, Applied Threshold: `{service.threshold:.4f}`)")
        st.write(f"- **Risk Rating:** `{alert_record['risk_category']}` (Risk Score: `{alert_record['risk_score']}/100`)")
        st.write(f"- **Anomaly Status:** `{alert_record['anomaly_message']}`")

# ==============================================================================
# 5. MODEL PERFORMANCE
# ==============================================================================
with tab_model_perf:
    st.subheader("Model Performance")
    st.caption("Training provenance, empirical evaluation benchmarks on the held-out evaluation dataset, and live metrics.")

    # Top Provenance Header
    st.markdown("""
    <div class="metric-card">
        <p style="margin:0; font-size:13px; color:#cbd5e1;">
            <strong>Training Dataset:</strong> Kaggle Credit Card Fraud Detection (284,807 transactions)<br/>
            <strong>Evaluation:</strong> Held-out test set
        </p>
        <p style="margin:6px 0 0 0; font-size:12px; color:#94a3b8;">
            The Kaggle Credit Card Fraud Detection dataset was used for offline model development, training, and evaluation.
            The deployed FraudShield AI application uses the resulting trained XGBoost and Isolation Forest pipelines for real-time transaction scoring.
        </p>
    </div>
    """, unsafe_allow_html=True)

    # Actual Evaluation Split vs Display Sample Size
    st.markdown("### Evaluation Size Breakdown")
    meta = service.metadata
    total_recs = meta.get('total_records', 284807)
    test_split_size = meta.get('test_samples', 56962)
    sample_display_size = len(st.session_state.kaggle_samples)

    es1, es2, es3, es4 = st.columns(4)
    with es1:
        st.metric("Total Dataset Records", f"{total_recs:,}", "100% Kaggle Data")
    with es2:
        st.metric("Actual Held-Out Evaluation Split", f"{test_split_size:,} tx", "Full Evaluation Size")
    with es3:
        st.metric("Interactive Display Sample", f"{sample_display_size} tx", "Sample for Inspection")
    with es4:
        st.metric("Active Model PR-AUC", f"{meta.get('selected_model_metrics', {}).get('pr_auc', 85.29)}%", "Primary Metric")

    st.markdown("---")

    # Model Evaluation — Held-Out Test Set
    st.markdown("### Model Evaluation — Held-Out Test Set")
    st.caption(f"Rigorous evaluation benchmark comparing candidate models on the full {test_split_size:,} transaction test split (98 frauds).")

    all_models = meta.get('all_models_evaluated', [])
    if all_models:
        eval_rows = []
        for m in all_models:
            opt = m.get('optimal_metrics', {})
            cm_dict = opt.get('confusion_matrix', {})
            eval_rows.append({
                'Model Architecture': m['model_name'],
                'PR-AUC (%)': m['pr_auc'],
                'Fraud F1 (%)': opt.get('f1_score'),
                'Recall (%)': opt.get('recall'),
                'Precision (%)': opt.get('precision'),
                'ROC-AUC (%)': m['roc_auc'],
                'Accuracy (%)': m['accuracy'],
                'Threshold': m['optimal_threshold'],
                'TP / FP / FN': f"{cm_dict.get('tp', 0)} / {cm_dict.get('fp', 0)} / {cm_dict.get('fn', 0)}",
                'Status': 'Active Production' if m['model_name'] == meta.get('selected_model') else 'Evaluated'
            })
        st.table(pd.DataFrame(eval_rows))

    # Isolation Forest Section
    iso_info = meta.get('anomaly_detection_metrics', {})
    if iso_info:
        st.markdown("#### Unsupervised Anomaly Detection — Isolation Forest")
        st.markdown(f"""
        <div class="metric-card">
            <p style="font-size:12px; color:#cbd5e1; margin-bottom:8px;">
                <strong>Fraud Classification vs Anomaly Detection:</strong> Supervised models (XGBoost) learn decision boundaries from labeled fraud examples.
                Isolation Forest detects statistical outliers purely based on feature density without supervision.
            </p>
            <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:12px; font-size:12px;">
                <div><span style="color:#64748b;">Contamination Setting:</span> <strong style="color:#f1f5f9;">{iso_info.get('contamination_parameter', 0.002)}</strong></div>
                <div><span style="color:#64748b;">Anomalies Flagged:</span> <strong style="color:#f1f5f9;">{iso_info.get('flagged_anomalies_test', 145)} tx</strong></div>
                <div><span style="color:#64748b;">True Frauds Intercepted:</span> <strong style="color:#22c55e;">{iso_info.get('true_frauds_detected', 30)} / 98 ({iso_info.get('fraud_recall', 30.61)}%)</strong></div>
            </div>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("---")

    # Sample Held-Out Test Transactions Table
    st.markdown("### Sample Held-Out Test Transactions")
    st.markdown(f"**{sample_display_size} sample transactions displayed for interactive inspection**")
    st.info(
        f"These {sample_display_size} transactions are a displayed sample from the held-out evaluation data. "
        f"They are provided for interactive inspection and demonstration. Model evaluation is performed on the full held-out test split ({test_split_size:,} transactions)."
    )

    if samples:
        st.dataframe(
            pd.DataFrame(sample_res)[['transaction_id', 'amount', 'label', 'probability', 'risk_score', 'risk_category', 'is_anomaly']],
            use_container_width=True,
            height=280
        )

    st.markdown("---")

    # Live Performance on Uploaded Dataset
    st.markdown("### Performance on Uploaded Dataset (Non-Training Input)")
    up_df = st.session_state.uploaded_df
    up_res = st.session_state.uploaded_results

    if up_df is None or up_res is None:
        st.info("ℹ️ Upload a dataset in the **Batch Analysis** section to view live evaluation metrics on your new data.")
    else:
        res_df = pd.DataFrame(up_res)
        has_ground_truth = 'ground_truth' in res_df.columns and not res_df['ground_truth'].isna().all()

        if has_ground_truth:
            y_true = res_df['ground_truth'].astype(int)
            y_pred = res_df['prediction'].astype(int)

            from sklearn.metrics import precision_score, recall_score, f1_score, accuracy_score, confusion_matrix
            prec = precision_score(y_true, y_pred, zero_division=0) * 100
            rec = recall_score(y_true, y_pred, zero_division=0) * 100
            f1 = f1_score(y_true, y_pred, zero_division=0) * 100
            acc = accuracy_score(y_true, y_pred) * 100
            cm_new = confusion_matrix(y_true, y_pred)
            tn, fp, fn, tp = cm_new.ravel() if cm_new.size == 4 else (0, 0, 0, 0)

            uc1, uc2, uc3, uc4 = st.columns(4)
            with uc1:
                st.metric("Uploaded Accuracy", f"{acc:.2f}%")
            with uc2:
                st.metric("Uploaded Precision", f"{prec:.2f}%")
            with uc3:
                st.metric("Uploaded Recall", f"{rec:.2f}%")
            with uc4:
                st.metric("Uploaded F1-Score", f"{f1:.2f}%")

            st.write(f"**Confusion Matrix on Uploaded Data:** True Positives (TP): **{tp}**, False Positives (FP): **{fp}**, False Negatives (FN): **{fn}**, True Negatives (TN): **{tn}**")
        else:
            st.info("The uploaded dataset does not contain a ground-truth 'Class' column. Displaying distribution statistics:")
            uc1, uc2, uc3 = st.columns(3)
            with uc1:
                st.metric("Total Scored", len(res_df))
            with uc2:
                st.metric("Fraud Detection Rate", f"{(res_df['prediction'] == 1).sum() / len(res_df) * 100:.2f}%")
            with uc3:
                st.metric("Average Risk Score", f"{res_df['risk_score'].mean():.1f} / 100")
