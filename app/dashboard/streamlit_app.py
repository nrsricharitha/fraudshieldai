"""
FraudShield AI - Streamlit Dashboard.
Top-navigation layout featuring:
1. Kaggle 50 Transactions Table
2. Kaggle Transaction Risk Reasons (SHAP Explanations)
3. Upload New Dataset (Batch Processing)
4. New Dataset Risk Analysis (Drill-down for Uploaded Transactions)
5. Model Performance (Benchmark on Kaggle + Live Metrics on Uploaded Data)
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

# Custom Styling for top navigation, dark background, and cards
st.markdown("""
<style>
    /* Clean dark theme */
    .stApp {
        background-color: #0b0f15;
    }
    .metric-box {
        background: #11161d;
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
    /* Style top tabs */
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

# Header
head_col1, head_col2 = st.columns([3, 1])
with head_col1:
    st.title("🛡️ FraudShield AI")
    st.caption("Machine Learning Fraud Detection & Explainability Platform")
with head_col2:
    if service.is_loaded:
        st.markdown(
            f"<div style='text-align:right; padding-top:10px;'>"
            f"<span style='background:rgba(34,197,94,0.15); color:#22c55e; border:1px solid rgba(34,197,94,0.3); "
            f"padding:4px 10px; border-radius:6px; font-size:12px; font-weight:600;'>"
            f"● Model Active: {service.metadata.get('selected_model', 'XGBoost')} (Threshold: {service.threshold:.2f})</span>"
            f"</div>",
            unsafe_allow_html=True
        )

# Initialize Session State
if 'kaggle_samples' not in st.session_state:
    st.session_state.kaggle_samples = service.get_sample_transactions(50)
if 'selected_kaggle_idx' not in st.session_state:
    st.session_state.selected_kaggle_idx = 0
if 'uploaded_df' not in st.session_state:
    st.session_state.uploaded_df = None
if 'uploaded_results' not in st.session_state:
    st.session_state.uploaded_results = None
if 'selected_uploaded_idx' not in st.session_state:
    st.session_state.selected_uploaded_idx = 0

# TOP NAVIGATION TABS (Replacing the Left Sidebar)
tab_kaggle_table, tab_kaggle_reasons, tab_upload, tab_upload_reasons, tab_performance = st.tabs([
    "📊 Kaggle 50 Table",
    "🔍 Kaggle Transaction Risk Reasons",
    "📤 Upload New Dataset",
    "🔎 New Dataset Risk Analysis",
    "📈 Model Performance (Kaggle & New)"
])

# ==============================================================================
# TAB 1: KAGGLE 50 TRANSACTIONS TABLE
# ==============================================================================
with tab_kaggle_table:
    st.subheader("Kaggle Held-Out Test Split (50 Sample Transactions)")
    st.caption("Scored with the trained XGBoost production pipeline and Isolation Forest.")

    samples = st.session_state.kaggle_samples
    if samples:
        df_samples = pd.DataFrame(samples)
        scored_batch = service.predict_batch(df_samples)
        res_df = pd.DataFrame(scored_batch)

        # Overview counters
        kcol1, kcol2, kcol3, kcol4 = st.columns(4)
        fraud_cnt = int((res_df['prediction'] == 1).sum())
        with kcol1:
            st.metric("Transactions Scored", len(res_df))
        with kcol2:
            st.metric("Frauds Detected", fraud_cnt)
        with kcol3:
            st.metric("High-Risk Alerts", int((res_df['risk_category'] == 'High Risk').sum()))
        with kcol4:
            st.metric("Anomalies Flagged", int(res_df['is_anomaly'].sum()))

        st.markdown("---")

        # Risk Filter
        rf = st.radio("Filter by Risk Category:", ["All", "High Risk", "Medium Risk", "Low Risk"], horizontal=True)
        display_df = res_df.copy()
        if rf != "All":
            display_df = display_df[display_df['risk_category'] == rf]

        st.dataframe(
            display_df[['transaction_id', 'amount', 'label', 'probability', 'risk_score', 'risk_category', 'is_anomaly']],
            use_container_width=True,
            height=380
        )

        st.info("💡 To inspect the detailed risk reasons and SHAP factors for any transaction, go to the **'🔍 Kaggle Transaction Risk Reasons'** tab above.")

# ==============================================================================
# TAB 2: KAGGLE TRANSACTION RISK REASONS (SHAP EXPLAINABILITY)
# ==============================================================================
with tab_kaggle_reasons:
    st.subheader("Kaggle Transaction Risk Analysis & Explanations")
    st.caption("Drill down into any Kaggle transaction to see why it was approved or flagged as fraud.")

    samples = st.session_state.kaggle_samples
    if samples:
        # Build selector options
        options = []
        for i, s in enumerate(samples):
            amt = float(s.get('Amount', 0))
            gt = "FRAUD" if s.get('Class') == 1 else "Legitimate"
            options.append(f"Sample #{i+1} — Amount: ${amt:.2f} | Ground Truth: {gt}")

        selected_opt = st.selectbox(
            "Select a Transaction to Inspect:",
            options,
            index=st.session_state.selected_kaggle_idx
        )
        curr_idx = options.index(selected_opt)
        st.session_state.selected_kaggle_idx = curr_idx

        curr_tx = samples[curr_idx]

        with st.spinner("Calculating SHAP feature attributions and Isolation Forest status..."):
            result = service.predict_single(curr_tx, include_explanation=True)

        # Verdict Cards
        vcol1, vcol2, vcol3 = st.columns(3)
        with vcol1:
            st.markdown("### Model Verdict")
            if result['prediction'] == 1:
                st.error(f"🚨 **PREDICTION: {result['label']}**")
            else:
                st.success(f"✅ **PREDICTION: {result['label']}**")
            st.write(f"**Fraud Probability:** `{result['probability'] * 100:.2f}%`")
            st.write(f"**Applied Threshold:** `{result['threshold_used']:.4f}`")

        with vcol2:
            st.markdown("### Risk Rating")
            st.metric("Project Risk Score", f"{result['risk_score']}/100", result['risk_category'])
            st.caption(result['risk_disclaimer'])

        with vcol3:
            st.markdown("### Isolation Forest")
            anom = result['anomaly_detection']
            if anom['is_anomaly']:
                st.warning(f"⚠️ {anom['message']}")
            else:
                st.info(f"✓ {anom['message']}")
            st.caption(f"Method: {anom['method']}")

        st.markdown("---")
        st.markdown("### Top Contributing Risk Factors (SHAP TreeExplainer)")
        st.caption("Empirical feature attributions explaining what pushed this transaction toward fraud or legitimate status.")

        factors = result.get('top_contributing_factors', [])
        if factors:
            f_rows = []
            for f in factors:
                direction_label = "Increases Fraud Risk (+)" if f['direction'] == 'increases_risk' else "Reduces Risk (-)"
                f_rows.append({
                    'Feature': f['feature'],
                    'Contribution (SHAP)': f['shap_value'],
                    'Impact': direction_label,
                    'Explanation': f['description']
                })
            st.table(pd.DataFrame(f_rows))

        with st.expander("Inspect Raw PCA Features (V1 to V28, Time, Amount)", expanded=False):
            raw_v = {k: curr_tx[k] for k in curr_tx if k in RAW_FEATURE_COLUMNS or k == 'Class'}
            st.json(raw_v)

# ==============================================================================
# TAB 3: UPLOAD NEW DATASET
# ==============================================================================
with tab_upload:
    st.subheader("Upload New Dataset for Batch Scoring")
    st.caption("Upload any CSV dataset containing transaction features (`Time`, `Amount`, `V1`–`V28`).")

    # Download helper
    sample_csv_path = os.path.join('data', 'test_samples_12.csv')
    if os.path.exists(sample_csv_path):
        st.download_button(
            label="📥 Download Test CSV Sample (test_samples_12.csv)",
            data=open(sample_csv_path, 'rb').read(),
            file_name="test_samples_12.csv",
            mime="text/csv",
            help="Contains 12 real benchmark transactions for immediate testing"
        )

    uploaded_file = st.file_uploader("Upload CSV file:", type=["csv"], key="csv_uploader")

    if uploaded_file is not None:
        try:
            df = pd.read_csv(uploaded_file)
            st.session_state.uploaded_df = df
            st.success(f"Loaded file: `{uploaded_file.name}` with {len(df):,} transactions.")

            with st.spinner("Scoring dataset through XGBoost & Isolation Forest pipelines..."):
                results = service.predict_batch(df)
                st.session_state.uploaded_results = results

            res_df = pd.DataFrame(results)

            ucol1, ucol2, ucol3, ucol4 = st.columns(4)
            fraud_num = int((res_df['prediction'] == 1).sum())
            with ucol1:
                st.metric("Total Processed", len(res_df))
            with ucol2:
                st.metric("Frauds Flagged", fraud_num)
            with ucol3:
                st.metric("High Risk", int((res_df['risk_category'] == 'High Risk').sum()))
            with ucol4:
                st.metric("Anomalies", int(res_df['is_anomaly'].sum()))

            st.dataframe(
                res_df[['transaction_id', 'amount', 'label', 'probability', 'risk_score', 'risk_category', 'is_anomaly']],
                use_container_width=True,
                height=350
            )

            # CSV Download
            csv_buf = io.StringIO()
            res_df.to_csv(csv_buf, index=False)
            st.download_button(
                "📥 Download Scored Results (CSV)",
                data=csv_buf.getvalue(),
                file_name=f"scored_{uploaded_file.name}",
                mime="text/csv"
            )

            st.info("👉 Now switch to **'🔎 New Dataset Risk Analysis'** tab to inspect the specific risk reasons for each transaction!")
        except Exception as e:
            st.error(f"Error processing CSV: {e}")

# ==============================================================================
# TAB 4: NEW DATASET TRANSACTION RISK ANALYSIS
# ==============================================================================
with tab_upload_reasons:
    st.subheader("New Dataset Transaction Risk Analysis")
    st.caption("Select any transaction from your uploaded dataset to inspect the reasons why it was marked as risk.")

    up_df = st.session_state.uploaded_df
    up_res = st.session_state.uploaded_results

    if up_df is None or up_res is None or len(up_df) == 0:
        st.warning("⚠️ No dataset uploaded yet! Please upload a CSV in the **'📤 Upload New Dataset'** tab first.")
    else:
        # Options from the uploaded dataset
        options_up = []
        for i, row in enumerate(up_res):
            tid = row['transaction_id']
            amt = row['amount']
            pred = row['label']
            score = row['risk_score']
            options_up.append(f"#{i+1} [{tid}] — ${amt:.2f} | Verdict: {pred} | Risk Score: {score}/100")

        selected_up_opt = st.selectbox(
            "Select an Uploaded Transaction to View Risk Reasons:",
            options_up,
            index=min(st.session_state.selected_uploaded_idx, len(options_up) - 1)
        )
        up_idx = options_up.index(selected_up_opt)
        st.session_state.selected_uploaded_idx = up_idx

        raw_row = up_df.iloc[up_idx].to_dict()

        with st.spinner("Computing real SHAP explanations for selected uploaded transaction..."):
            result_up = service.predict_single(raw_row, include_explanation=True)

        # Verdict Cards
        uc1, uc2, uc3 = st.columns(3)
        with uc1:
            st.markdown("### Model Verdict")
            if result_up['prediction'] == 1:
                st.error(f"🚨 **PREDICTION: {result_up['label']}**")
            else:
                st.success(f"✅ **PREDICTION: {result_up['label']}**")
            st.write(f"**Fraud Probability:** `{result_up['probability'] * 100:.2f}%`")
            st.write(f"**Threshold Applied:** `{result_up['threshold_used']:.4f}`")

        with uc2:
            st.markdown("### Risk Rating")
            st.metric("Risk Score", f"{result_up['risk_score']}/100", result_up['risk_category'])
            st.caption(result_up['risk_disclaimer'])

        with uc3:
            st.markdown("### Anomaly Status")
            anom_up = result_up['anomaly_detection']
            if anom_up['is_anomaly']:
                st.warning(f"⚠️ {anom_up['message']}")
            else:
                st.info(f"✓ {anom_up['message']}")
            st.caption(f"Method: {anom_up['method']}")

        st.markdown("---")
        st.markdown("### Why Was This Transaction Flagged / Approved?")
        st.caption("SHAP feature attributions computed directly for this uploaded row.")

        up_factors = result_up.get('top_contributing_factors', [])
        if up_factors:
            f_table = []
            for f in up_factors:
                f_table.append({
                    'Feature': f['feature'],
                    'Contribution': f['shap_value'],
                    'Direction': "Increases Risk (+)" if f['direction'] == 'increases_risk' else "Decreases Risk (-)",
                    'Reasoning': f['description']
                })
            st.table(pd.DataFrame(f_table))

        with st.expander("View Input Feature Values for this Row", expanded=False):
            st.json({k: raw_row[k] for k in raw_row if k in RAW_FEATURE_COLUMNS or k == 'Class'})

# ==============================================================================
# TAB 5: MODEL PERFORMANCE (KAGGLE & NEW DATASET)
# ==============================================================================
with tab_performance:
    st.subheader("Model Performance Benchmark")
    st.caption("Empirical evaluation metrics on the held-out Kaggle evaluation split (56,962 transactions) and any uploaded dataset.")

    # PART A: KAGGLE PERFORMANCE
    st.markdown("### 1. Kaggle Evaluation Split Benchmark (56,962 Transactions)")
    meta = service.metadata
    all_models = meta.get('all_models_evaluated', [])

    if all_models:
        k_rows = []
        for m in all_models:
            opt = m.get('optimal_metrics', {})
            cm_dict = opt.get('confusion_matrix', {})
            k_rows.append({
                'Model': m['model_name'],
                'PR-AUC (%)': m['pr_auc'],
                'Fraud F1 (%)': opt.get('f1_score'),
                'Recall (%)': opt.get('recall'),
                'Precision (%)': opt.get('precision'),
                'ROC-AUC (%)': m['roc_auc'],
                'Accuracy (%)': m['accuracy'],
                'Threshold': m['optimal_threshold'],
                'TP / FP / FN': f"{cm_dict.get('tp', 0)} / {cm_dict.get('fp', 0)} / {cm_dict.get('fn', 0)}"
            })
        st.table(pd.DataFrame(k_rows))

    # Isolation Forest
    iso_info = meta.get('anomaly_detection_metrics', {})
    if iso_info:
        st.markdown("#### Unsupervised Anomaly Detection (Isolation Forest)")
        icol1, icol2, icol3 = st.columns(3)
        with icol1:
            st.metric("Contamination Prior", iso_info.get('contamination_parameter', 0.002))
        with icol2:
            st.metric("Anomalies Flagged", f"{iso_info.get('flagged_anomalies_test', 145)} tx")
        with icol3:
            st.metric("True Frauds Intercepted", f"{iso_info.get('true_frauds_detected', 30)} / 98 ({iso_info.get('fraud_recall', 30.61)}%)")

    st.markdown("---")

    # PART B: PERFORMANCE ON NEW UPLOADED DATASET
    st.markdown("### 2. Live Performance on Uploaded Dataset")
    up_df = st.session_state.uploaded_df
    up_res = st.session_state.uploaded_results

    if up_df is None or up_res is None:
        st.info("ℹ️ Upload a dataset in the **'📤 Upload New Dataset'** tab to see live evaluation metrics on your new data.")
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

            pcol1, pcol2, pcol3, pcol4 = st.columns(4)
            with pcol1:
                st.metric("Uploaded Accuracy", f"{acc:.2f}%")
            with pcol2:
                st.metric("Uploaded Precision", f"{prec:.2f}%")
            with pcol3:
                st.metric("Uploaded Recall", f"{rec:.2f}%")
            with pcol4:
                st.metric("Uploaded F1-Score", f"{f1:.2f}%")

            st.write(f"**Confusion Matrix on Uploaded Data:** True Positives (TP): **{tp}**, False Positives (FP): **{fp}**, False Negatives (FN): **{fn}**, True Negatives (TN): **{tn}**")
        else:
            st.info("The uploaded dataset does not have a 'Class' column (ground truth). Displaying distribution metrics:")
            dcol1, dcol2, dcol3 = st.columns(3)
            with dcol1:
                st.metric("Total Scored", len(res_df))
            with dcol2:
                st.metric("Fraud Detection Rate", f"{(res_df['prediction'] == 1).sum() / len(res_df) * 100:.2f}%")
            with dcol3:
                st.metric("Average Risk Score", f"{res_df['risk_score'].mean():.1f} / 100")
