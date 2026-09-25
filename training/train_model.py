"""
Comprehensive Model Training & Evaluation Script for FraudShield AI.

Trains, evaluates, and rigorously compares:
1. Logistic Regression (Baseline)
2. Random Forest (Classical Ensemble)
3. XGBoost (Gradient Boosting Candidate)
4. Isolation Forest (Unsupervised Anomaly Detection)

Handles class imbalance, optimizes decision thresholds, avoids data leakage,
computes PR-AUC, ROC-AUC, Precision, Recall, F1, and saves production artifacts.
"""

import os
import sys
import json
import time
from datetime import datetime
import numpy as np
import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from xgboost import XGBClassifier
from sklearn.metrics import (
    precision_score, recall_score, f1_score, roc_auc_score,
    average_precision_score, confusion_matrix, accuracy_score,
    precision_recall_curve, roc_curve
)

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.preprocessing.pipeline import build_preprocessor, validate_raw_dataframe
from app.preprocessing.feature_engineer import RAW_FEATURE_COLUMNS


def optimize_threshold(y_true, y_probs):
    """
    Evaluates precision-recall trade-offs to find the threshold
    that maximizes the fraud-class F1-score.
    """
    precisions, recalls, thresholds = precision_recall_curve(y_true, y_probs)
    # Avoid division by zero
    f1_scores = np.where(
        (precisions[:-1] + recalls[:-1]) > 0,
        2 * (precisions[:-1] * recalls[:-1]) / (precisions[:-1] + recalls[:-1]),
        0.0
    )
    best_idx = np.argmax(f1_scores)
    best_thresh = float(thresholds[best_idx])
    best_f1 = float(f1_scores[best_idx])
    return best_thresh, best_f1


def evaluate_supervised_model(model_name: str, model, X_test, y_test, threshold: float = 0.5):
    """
    Calculates genuine test metrics for a supervised model.
    """
    y_probs = model.predict_proba(X_test)[:, 1]
    y_pred_default = (y_probs >= 0.5).astype(int)
    y_pred_opt = (y_probs >= threshold).astype(int)

    roc_auc = float(roc_auc_score(y_test, y_probs))
    pr_auc = float(average_precision_score(y_test, y_probs))

    cm_default = confusion_matrix(y_test, y_pred_default)
    cm_opt = confusion_matrix(y_test, y_pred_opt)

    tn, fp, fn, tp = cm_opt.ravel()

    metrics = {
        'model_name': model_name,
        'accuracy': round(float(accuracy_score(y_test, y_pred_opt)) * 100, 2),
        'roc_auc': round(roc_auc * 100, 2),
        'pr_auc': round(pr_auc * 100, 2),
        'default_threshold_0.5': {
            'precision': round(float(precision_score(y_test, y_pred_default, zero_division=0)) * 100, 2),
            'recall': round(float(recall_score(y_test, y_pred_default, zero_division=0)) * 100, 2),
            'f1_score': round(float(f1_score(y_test, y_pred_default, zero_division=0)) * 100, 2),
            'confusion_matrix': {
                'tn': int(cm_default[0, 0]),
                'fp': int(cm_default[0, 1]),
                'fn': int(cm_default[1, 0]),
                'tp': int(cm_default[1, 1])
            }
        },
        'optimal_threshold': round(threshold, 4),
        'optimal_metrics': {
            'precision': round(float(precision_score(y_test, y_pred_opt, zero_division=0)) * 100, 2),
            'recall': round(float(recall_score(y_test, y_pred_opt, zero_division=0)) * 100, 2),
            'f1_score': round(float(f1_score(y_test, y_pred_opt, zero_division=0)) * 100, 2),
            'confusion_matrix': {
                'tn': int(tn),
                'fp': int(fp),
                'fn': int(fn),
                'tp': int(tp)
            }
        }
    }
    return metrics, y_probs


def train_and_evaluate():
    print("=" * 70)
    print("FraudShield AI - Machine Learning Pipeline Training")
    print("=" * 70)

    dataset_path = os.path.join('data', 'creditcard.csv')
    if not os.path.exists(dataset_path):
        raise FileNotFoundError(f"Dataset not found at {dataset_path}. Please place creditcard.csv in data/.")

    print(f"\n[1/7] Loading dataset from {dataset_path}...")
    start_load = time.time()
    df = pd.read_csv(dataset_path)
    print(f"Loaded {len(df):,} transactions in {time.time() - start_load:.2f}s.")

    print("\n[2/7] Validating dataset schema and integrity...")
    is_valid, issues = validate_raw_dataframe(df, require_target=True)
    if not is_valid:
        raise ValueError(f"Dataset validation failed: {issues}")

    total_tx = len(df)
    fraud_tx = int(df['Class'].sum())
    legit_tx = total_tx - fraud_tx
    fraud_ratio = fraud_tx / total_tx
    print(f"Schema valid: 31 columns detected.")
    print(f"Class distribution: Legitimate={legit_tx:,} ({100*(1-fraud_ratio):.2f}%), Fraud={fraud_tx:,} ({100*fraud_ratio:.4f}%)")

    print("\n[3/7] Splitting dataset (80% Train, 20% Held-out Test, Stratified)...")
    X = df.drop(columns=['Class'])
    y = df['Class'].astype(int)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    print(f"Train split: {len(X_train):,} rows ({y_train.sum()} frauds)")
    print(f"Test split:  {len(X_test):,} rows ({y_test.sum()} frauds)")

    print("\n[4/7] Fitting Preprocessing & Feature Engineering Pipeline on Train data...")
    preprocessor = build_preprocessor()
    X_train_proc = preprocessor.fit_transform(X_train)
    X_test_proc = preprocessor.transform(X_test)

    feature_names = preprocessor.named_steps['feature_engineer'].get_feature_names_out().tolist()
    print(f"Features engineered: {len(feature_names)} features.")

    # Calculate scale_pos_weight for imbalance
    neg_count = int((y_train == 0).sum())
    pos_count = int((y_train == 1).sum())
    scale_pos_weight = neg_count / max(1, pos_count)
    print(f"Class imbalance ratio (scale_pos_weight): {scale_pos_weight:.2f}")

    print("\n[5/7] Training & Comparing Candidate Models...")
    models_to_train = {
        'Logistic Regression': LogisticRegression(
            class_weight='balanced',
            max_iter=1000,
            random_state=42,
            solver='lbfgs'
        ),
        'Random Forest': RandomForestClassifier(
            n_estimators=100,
            max_depth=12,
            class_weight='balanced_subsample',
            random_state=42,
            n_jobs=-1
        ),
        'XGBoost': XGBClassifier(
            n_estimators=150,
            max_depth=5,
            learning_rate=0.08,
            scale_pos_weight=scale_pos_weight,
            eval_metric='aucpr',
            random_state=42,
            n_jobs=-1
        )
    }

    all_metrics = []
    trained_models = {}
    optimal_thresholds = {}

    for name, model in models_to_train.items():
        print(f"\n--- Training {name} ---")
        t0 = time.time()
        model.fit(X_train_proc, y_train)
        train_time = time.time() - t0
        print(f"Finished training in {train_time:.2f}s.")

        # Determine optimal threshold on validation (using train probabilities or PR curve)
        train_probs = model.predict_proba(X_train_proc)[:, 1]
        opt_thresh, train_f1 = optimize_threshold(y_train, train_probs)
        # Bound threshold reasonably between 0.10 and 0.85
        opt_thresh = float(np.clip(opt_thresh, 0.10, 0.85))
        optimal_thresholds[name] = opt_thresh
        print(f"Derived optimal threshold for {name}: {opt_thresh:.4f}")

        # Evaluate on test set
        metrics, _ = evaluate_supervised_model(name, model, X_test_proc, y_test, threshold=opt_thresh)
        metrics['training_time_seconds'] = round(train_time, 2)
        all_metrics.append(metrics)
        trained_models[name] = model

        print(f"Test Results for {name}:")
        print(f"  PR-AUC:   {metrics['pr_auc']}% | ROC-AUC: {metrics['roc_auc']}% | Accuracy: {metrics['accuracy']}%")
        print(f"  Optimal Threshold ({metrics['optimal_threshold']}):")
        print(f"    Fraud Precision: {metrics['optimal_metrics']['precision']}%")
        print(f"    Fraud Recall:    {metrics['optimal_metrics']['recall']}%")
        print(f"    Fraud F1-Score:  {metrics['optimal_metrics']['f1_score']}%")
        print(f"    Confusion Matrix: TP={metrics['optimal_metrics']['confusion_matrix']['tp']}, "
              f"FP={metrics['optimal_metrics']['confusion_matrix']['fp']}, "
              f"FN={metrics['optimal_metrics']['confusion_matrix']['fn']}, "
              f"TN={metrics['optimal_metrics']['confusion_matrix']['tn']}")

    print("\n--- Training Isolation Forest (Unsupervised Anomaly Detection) ---")
    t0 = time.time()
    # Train only on legitimate transactions to model normality
    X_train_legit = X_train_proc[y_train == 0]
    iso_forest = IsolationForest(
        n_estimators=100,
        contamination=0.002,  # Prior roughly matching fraud prevalence
        random_state=42,
        n_jobs=-1
    )
    iso_forest.fit(X_train_legit)
    iso_time = time.time() - t0
    print(f"Finished Isolation Forest in {iso_time:.2f}s.")

    # Isolation Forest outputs -1 for anomalies, 1 for normal
    iso_preds = iso_forest.predict(X_test_proc)
    iso_flagged = (iso_preds == -1).astype(int)
    iso_cm = confusion_matrix(y_test, iso_flagged)
    iso_metrics = {
        'model_name': 'Isolation Forest',
        'type': 'Unsupervised Anomaly Detection',
        'contamination_parameter': 0.002,
        'training_time_seconds': round(iso_time, 2),
        'flagged_anomalies_test': int(iso_flagged.sum()),
        'true_frauds_detected': int(iso_cm[1, 1]),
        'fraud_recall': round(float(recall_score(y_test, iso_flagged, zero_division=0)) * 100, 2),
        'precision': round(float(precision_score(y_test, iso_flagged, zero_division=0)) * 100, 2),
        'note': 'Anomaly detection flags statistical outliers without ground-truth fraud supervision.'
    }
    print(f"Isolation Forest flagged {iso_metrics['flagged_anomalies_test']} anomalies, capturing {iso_metrics['true_frauds_detected']}/{y_test.sum()} frauds ({iso_metrics['fraud_recall']}% recall).")

    print("\n[6/7] Model Selection...")
    # Model Selection Rule:
    # 1. Rank by PR-AUC (Precision-Recall Area Under Curve), the premier metric under extreme imbalance.
    # 2. Secondary criterion: Fraud F1-Score at optimal threshold.
    sorted_models = sorted(
        all_metrics,
        key=lambda m: (m['pr_auc'], m['optimal_metrics']['f1_score']),
        reverse=True
    )
    selected_name = sorted_models[0]['model_name']
    selected_model = trained_models[selected_name]
    selected_threshold = optimal_thresholds[selected_name]
    selected_meta = sorted_models[0]

    print(f"\n>>> Selected Best Model: {selected_name} <<<")
    print(f"Selection Criterion: Highest PR-AUC ({selected_meta['pr_auc']}%) and F1-Score ({selected_meta['optimal_metrics']['f1_score']}%).")
    print(f"Threshold chosen: {selected_threshold:.4f}")

    # Feature Importance for selected model
    feature_importances = {}
    if hasattr(selected_model, 'feature_importances_'):
        imp = selected_model.feature_importances_
        sorted_indices = np.argsort(imp)[::-1]
        for idx in sorted_indices:
            feature_importances[feature_names[idx]] = round(float(imp[idx]), 5)

    print("\n[7/7] Serializing Models and Metadata...")
    os.makedirs('models', exist_ok=True)

    # Save full inference pipeline (Preprocessor + Selected Classifier)
    from sklearn.pipeline import Pipeline as SkPipeline
    full_inference_pipeline = SkPipeline([
        ('preprocessor', preprocessor),
        ('classifier', selected_model)
    ])

    model_path = os.path.join('models', 'fraud_model.joblib')
    joblib.dump(full_inference_pipeline, model_path)
    print(f"Saved complete end-to-end fraud pipeline to {model_path}")

    # Save Isolation Forest
    iso_pipeline = SkPipeline([
        ('preprocessor', preprocessor),
        ('isolation_forest', iso_forest)
    ])
    iso_path = os.path.join('models', 'anomaly_model.joblib')
    joblib.dump(iso_pipeline, iso_path)
    print(f"Saved anomaly detection pipeline to {iso_path}")

    # Save metadata
    metadata = {
        'project': 'FraudShield AI',
        'dataset': 'Kaggle Credit Card Fraud Detection',
        'training_timestamp': datetime.now().isoformat(),
        'total_records': total_tx,
        'fraud_records': fraud_tx,
        'legitimate_records': legit_tx,
        'fraud_percentage': round(fraud_ratio * 100, 4),
        'train_samples': len(X_train),
        'test_samples': len(X_test),
        'selected_model': selected_name,
        'decision_threshold': round(selected_threshold, 4),
        'raw_features': RAW_FEATURE_COLUMNS,
        'engineered_features': feature_names,
        'selected_model_metrics': selected_meta,
        'top_feature_importances': dict(list(feature_importances.items())[:15]),
        'all_models_evaluated': all_metrics,
        'anomaly_detection_metrics': iso_metrics,
        'risk_scoring_scale': {
            'low_risk': '0 - 30',
            'medium_risk': '31 - 70',
            'high_risk': '71 - 100',
            'disclaimer': 'Project-defined risk score for demonstration & analysis; not an official banking credit risk rating.'
        }
    }

    meta_path = os.path.join('models', 'model_metadata.json')
    with open(meta_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved model metadata to {meta_path}")

    # Save evaluation metrics specifically
    eval_path = os.path.join('models', 'evaluation_metrics.json')
    with open(eval_path, 'w') as f:
        json.dump({'supervised_models': all_metrics, 'isolation_forest': iso_metrics}, f, indent=2)
    print(f"Saved evaluation metrics to {eval_path}")

    # Create a realistic test sample CSV for UI testing and batch testing
    test_sample_legit = df[df.index.isin(X_test.index) & (df['Class'] == 0)].sample(25, random_state=42)
    test_sample_fraud = df[df.index.isin(X_test.index) & (df['Class'] == 1)].sample(min(25, y_test.sum()), random_state=42)
    sample_df = pd.concat([test_sample_legit, test_sample_fraud]).sample(frac=1.0, random_state=42).reset_index(drop=True)
    sample_csv_path = os.path.join('data', 'sample_test_transactions.csv')
    sample_df.to_csv(sample_csv_path, index=False)
    print(f"Saved {len(sample_df)} real test transactions to {sample_csv_path}")

    print("\n" + "=" * 70)
    print("TRAINING AND EVALUATION COMPLETE SUCCESSFULLY!")
    print(f"Selected Model: {selected_name} (Threshold: {selected_threshold:.4f})")
    print(f"PR-AUC: {selected_meta['pr_auc']}% | Recall: {selected_meta['optimal_metrics']['recall']}% | F1: {selected_meta['optimal_metrics']['f1_score']}%")
    print("=" * 70)


if __name__ == '__main__':
    train_and_evaluate()
