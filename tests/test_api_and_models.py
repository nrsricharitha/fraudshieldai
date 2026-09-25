"""
Comprehensive Unit & Integration Tests for FraudShield AI.
Tests ML pipeline, preprocessing, threshold application, and FastAPI endpoints.
"""

import os
import sys
import pandas as pd
import pytest
from fastapi.testclient import TestClient

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.api.main import app
from app.preprocessing.pipeline import build_preprocessor, validate_raw_dataframe, clean_input_record
from app.models.model_service import FraudModelService

client = TestClient(app)


def test_preprocessing_and_feature_engineering():
    """Verify preprocessor produces expected shape and engineered columns."""
    sample_path = os.path.join('data', 'sample_test_transactions.csv')
    assert os.path.exists(sample_path), "Sample test dataset must exist"
    df = pd.read_csv(sample_path)
    X = df.drop(columns=['Class'], errors='ignore')

    preprocessor = build_preprocessor()
    X_proc = preprocessor.fit_transform(X)

    feature_names = preprocessor.named_steps['feature_engineer'].get_feature_names_out()
    assert len(feature_names) == 37, f"Expected 37 features, got {len(feature_names)}"
    assert 'Amount_log' in feature_names
    assert 'Hour_sin' in feature_names
    assert 'V_abs_sum' in feature_names
    assert X_proc.shape == (len(df), 37)


def test_model_service_loading():
    """Verify model service loads trained model and metadata."""
    service = FraudModelService.get_instance()
    assert service.is_loaded is True
    assert service.threshold > 0.0
    assert service.metadata.get('selected_model') == 'XGBoost'


def test_api_health():
    """Verify GET /health endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "operational"
    assert data["model_loaded"] is True
    assert data["model_name"] == "XGBoost"
    assert "decision_threshold" in data


def test_api_model_info():
    """Verify GET /model-info returns real measured metrics."""
    response = client.get("/model-info")
    assert response.status_code == 200
    data = response.json()
    assert data["dataset"] == "Kaggle Credit Card Fraud Detection"
    assert "selected_model_metrics" in data
    assert "all_models_evaluated" in data
    # Ensure no fabricated placeholder metrics
    assert data["selected_model_metrics"]["pr_auc"] > 80.0


def test_api_predict_endpoint():
    """Verify POST /predict returns real prediction, probability, score, and SHAP."""
    sample_path = os.path.join('data', 'sample_test_transactions.csv')
    df = pd.read_csv(sample_path)
    row = df.iloc[0].to_dict()

    payload = {
        "Time": float(row["Time"]),
        "Amount": float(row["Amount"]),
        **{f"V{i}": float(row[f"V{i}"]) for i in range(1, 29)}
    }

    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["prediction"] in (0, 1)
    assert data["label"] in ("Fraud", "Legitimate")
    assert 0.0 <= data["probability"] <= 1.0
    assert 0 <= data["risk_score"] <= 100
    assert data["risk_category"] in ("Low Risk", "Medium Risk", "High Risk")
    assert "risk_disclaimer" in data
    assert "anomaly_detection" in data
    assert len(data["top_contributing_factors"]) > 0


def test_api_batch_predict():
    """Verify POST /batch-predict endpoint."""
    sample_path = os.path.join('data', 'sample_test_transactions.csv')
    df = pd.read_csv(sample_path).head(5)

    tx_list = []
    for _, row in df.iterrows():
        tx_list.append({
            "Time": float(row["Time"]),
            "Amount": float(row["Amount"]),
            **{f"V{i}": float(row[f"V{i}"]) for i in range(1, 29)}
        })

    response = client.post("/batch-predict", json={"transactions": tx_list})
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 5
    assert len(data["results"]) == 5
