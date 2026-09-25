"""
Model Service for FraudShield AI.
Loads serialized models, applies thresholding, generates predictions,
calculates risk scores, and orchestrates SHAP explainability.
"""

import os
import json
import logging
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
import joblib

from app.preprocessing.pipeline import clean_input_record, RAW_FEATURE_COLUMNS, validate_raw_dataframe
from app.explainability.explainer import FraudExplainer
from app.utils.risk_scorer import compute_risk_score

logger = logging.getLogger(__name__)

MODELS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'models'))
DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'data'))


class FraudModelService:
    _instance = None

    def __init__(self):
        self.model_pipeline = None
        self.anomaly_pipeline = None
        self.metadata = {}
        self.explainer = None
        self.threshold = 0.5
        self.load_models()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def load_models(self):
        fraud_model_path = os.path.join(MODELS_DIR, 'fraud_model.joblib')
        anomaly_model_path = os.path.join(MODELS_DIR, 'anomaly_model.joblib')
        meta_path = os.path.join(MODELS_DIR, 'model_metadata.json')

        if not os.path.exists(fraud_model_path):
            logger.warning(f"Fraud model file not found at {fraud_model_path}.")
            return

        logger.info(f"Loading fraud detection model from {fraud_model_path}...")
        self.model_pipeline = joblib.load(fraud_model_path)

        if os.path.exists(anomaly_model_path):
            self.anomaly_pipeline = joblib.load(anomaly_model_path)
            logger.info("Loaded Isolation Forest anomaly model.")

        if os.path.exists(meta_path):
            with open(meta_path, 'r') as f:
                self.metadata = json.load(f)
            self.threshold = float(self.metadata.get('decision_threshold', 0.5))
            logger.info(f"Loaded model metadata. Active threshold: {self.threshold}")
        else:
            self.threshold = 0.5

        # Initialize SHAP explainer
        preprocessor = self.model_pipeline.named_steps['preprocessor']
        classifier = self.model_pipeline.named_steps['classifier']
        self.explainer = FraudExplainer(classifier, preprocessor)
        logger.info("Initialized SHAP TreeExplainer.")

    @property
    def is_loaded(self) -> bool:
        return self.model_pipeline is not None

    def predict_single(self, transaction: Dict[str, Any], include_explanation: bool = True) -> Dict[str, Any]:
        """
        Executes genuine ML prediction for a single transaction record.
        """
        if not self.is_loaded:
            raise RuntimeError("Model is not loaded. Please train or verify models/fraud_model.joblib.")

        raw_df = clean_input_record(transaction)

        # 1. Supervised Fraud Prediction
        probs = self.model_pipeline.predict_proba(raw_df)
        fraud_prob = float(probs[0, 1])

        # Apply calibrated data-driven threshold
        is_fraud = bool(fraud_prob >= self.threshold)
        prediction_label = "Fraud" if is_fraud else "Legitimate"

        # 2. Risk Score & Category (Honest Project-Defined)
        risk_score, risk_cat, disclaimer = compute_risk_score(fraud_prob)

        # 3. Isolation Forest Unsupervised Anomaly Detection
        is_anomaly = False
        anomaly_msg = "Transaction conforms to expected legitimate profile."
        if self.anomaly_pipeline is not None:
            iso_pred = self.anomaly_pipeline.predict(raw_df)[0]
            if iso_pred == -1:
                is_anomaly = True
                anomaly_msg = "Anomalous transaction detected — further investigation recommended."

        # 4. Genuine SHAP Explanations
        contributions = []
        if include_explanation and self.explainer is not None:
            contributions = self.explainer.explain_transaction(raw_df, top_k=5)

        tx_id = str(transaction.get('transactionId', transaction.get('id', f"TX-{abs(hash(str(raw_df.values.tobytes()))) % 1000000:06d}")))

        return {
            'transaction_id': tx_id,
            'prediction': 1 if is_fraud else 0,
            'label': prediction_label,
            'probability': round(fraud_prob, 4),
            'threshold_used': round(self.threshold, 4),
            'risk_score': risk_score,
            'risk_category': risk_cat,
            'risk_disclaimer': disclaimer,
            'anomaly_detection': {
                'is_anomaly': is_anomaly,
                'message': anomaly_msg,
                'method': 'Isolation Forest (Unsupervised)'
            },
            'top_contributing_factors': contributions,
            'model_info': {
                'model_name': self.metadata.get('selected_model', 'Trained Classifier'),
                'training_timestamp': self.metadata.get('training_timestamp')
            }
        }

    def predict_batch(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Executes genuine ML predictions for a batch DataFrame.
        """
        if not self.is_loaded:
            raise RuntimeError("Model is not loaded.")

        # Ensure required features exist
        missing = [c for c in RAW_FEATURE_COLUMNS if c not in df.columns]
        if missing:
            raise ValueError(f"Batch dataset missing required columns: {missing}")

        raw_df = df[RAW_FEATURE_COLUMNS].astype(float)

        probs = self.model_pipeline.predict_proba(raw_df)[:, 1]
        preds = (probs >= self.threshold).astype(int)

        iso_preds = None
        if self.anomaly_pipeline is not None:
            iso_preds = self.anomaly_pipeline.predict(raw_df)

        results = []
        for i, prob in enumerate(probs):
            prob_val = float(prob)
            is_fraud = bool(preds[i] == 1)
            score, cat, disc = compute_risk_score(prob_val)

            is_anom = False
            anom_msg = "Transaction conforms to expected legitimate profile."
            if iso_preds is not None and iso_preds[i] == -1:
                is_anom = True
                anom_msg = "Anomalous transaction detected — further investigation recommended."

            row_id = str(df.iloc[i].get('transactionId', df.iloc[i].get('id', f"TX-{i+1:05d}")))
            ground_truth = int(df.iloc[i]['Class']) if 'Class' in df.columns else None

            item = {
                'transaction_id': row_id,
                'prediction': int(preds[i]),
                'label': "Fraud" if is_fraud else "Legitimate",
                'probability': round(prob_val, 4),
                'threshold_used': round(self.threshold, 4),
                'risk_score': score,
                'risk_category': cat,
                'is_anomaly': is_anom,
                'anomaly_message': anom_msg,
                'amount': float(raw_df.iloc[i]['Amount']),
                'time': float(raw_df.iloc[i]['Time'])
            }
            if ground_truth is not None:
                item['ground_truth'] = ground_truth

            results.append(item)

        return results

    def get_sample_transactions(self, n: int = 50) -> List[Dict[str, Any]]:
        sample_path = os.path.join(DATA_DIR, 'sample_test_transactions.csv')
        if not os.path.exists(sample_path):
            return []
        sample_df = pd.read_csv(sample_path)
        return sample_df.head(n).to_dict(orient='records')
