"""
FastAPI Application for FraudShield AI.
Provides RESTful endpoints for real machine-learning fraud detection,
threshold-calibrated risk scoring, SHAP explainability, and batch analysis.
"""

import io
import json
import logging
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import pandas as pd

from app.models.model_service import FraudModelService
from app.preprocessing.feature_engineer import RAW_FEATURE_COLUMNS

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("fraudshield.api")

app = FastAPI(
    title="FraudShield AI API",
    description="Production-grade real Machine Learning Fraud Detection service trained on Kaggle Credit Card data.",
    version="2.0.0"
)

# Enable CORS for frontend clients (Vite dev server, Streamlit, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Lazy model service accessor
def get_service() -> FraudModelService:
    service = FraudModelService.get_instance()
    if not service.is_loaded:
        service.load_models()
    return service


# --- Pydantic Schemas ---
class TransactionInput(BaseModel):
    transactionId: Optional[str] = Field(None, description="Optional identifier for the transaction")
    Time: float = Field(..., description="Seconds elapsed since first dataset transaction (0 to 172800)")
    Amount: float = Field(..., ge=0.0, description="Transaction monetary amount")
    V1: float = 0.0
    V2: float = 0.0
    V3: float = 0.0
    V4: float = 0.0
    V5: float = 0.0
    V6: float = 0.0
    V7: float = 0.0
    V8: float = 0.0
    V9: float = 0.0
    V10: float = 0.0
    V11: float = 0.0
    V12: float = 0.0
    V13: float = 0.0
    V14: float = 0.0
    V15: float = 0.0
    V16: float = 0.0
    V17: float = 0.0
    V18: float = 0.0
    V19: float = 0.0
    V20: float = 0.0
    V21: float = 0.0
    V22: float = 0.0
    V23: float = 0.0
    V24: float = 0.0
    V25: float = 0.0
    V26: float = 0.0
    V27: float = 0.0
    V28: float = 0.0

    class Config:
        extra = "allow"


class ExplanationItem(BaseModel):
    feature: str
    shap_value: float
    direction: str
    description: str


class AnomalyResult(BaseModel):
    is_anomaly: bool
    message: str
    method: str


class PredictionResponse(BaseModel):
    transaction_id: str
    prediction: int = Field(..., description="1 for Fraud, 0 for Legitimate")
    label: str = Field(..., description="'Fraud' or 'Legitimate'")
    probability: float = Field(..., description="Model calibrated fraud probability")
    threshold_used: float = Field(..., description="Optimal decision threshold applied")
    risk_score: int = Field(..., description="Project-defined risk score from 0 to 100")
    risk_category: str = Field(..., description="'Low Risk' | 'Medium Risk' | 'High Risk'")
    risk_disclaimer: str
    anomaly_detection: AnomalyResult
    top_contributing_factors: List[ExplanationItem]
    model_info: Dict[str, Any]


class BatchPredictionRequest(BaseModel):
    transactions: List[TransactionInput]


# --- Endpoints ---
@app.get("/health", tags=["System"])
def health():
    """Returns system status and model deployment metadata."""
    service = get_service()
    return {
        "status": "operational",
        "model_loaded": service.is_loaded,
        "model_name": service.metadata.get("selected_model", "XGBoost"),
        "decision_threshold": service.threshold,
        "features_count": len(service.metadata.get("engineered_features", [])),
        "timestamp": service.metadata.get("training_timestamp")
    }


@app.get("/model-info", tags=["ML Metadata"])
def get_model_info():
    """Returns actual measured performance metrics, model details, and confusion matrix."""
    service = get_service()
    if not service.metadata:
        raise HTTPException(status_code=404, detail="Model metadata not found. Run training/train_model.py first.")
    return service.metadata


@app.get("/sample-transactions", tags=["Testing Data"])
def get_samples(count: int = 50):
    """Returns authentic transactions from the held-out test split for immediate UI testing."""
    service = get_service()
    samples = service.get_sample_transactions(n=count)
    return {"count": len(samples), "samples": samples}


@app.post("/predict", response_model=PredictionResponse, tags=["Inference"])
def predict(tx: TransactionInput):
    """
    Predicts fraud likelihood for a single transaction using the real trained ML pipeline.
    Applies data-derived decision threshold, calculates project risk score,
    executes Isolation Forest anomaly check, and returns SHAP attribution.
    """
    service = get_service()
    if not service.is_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Machine learning model is not available. Please train the model."
        )

    try:
        input_data = tx.model_dump()
        result = service.predict_single(input_data, include_explanation=True)
        return result
    except Exception as e:
        logger.error(f"Prediction error: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/batch-predict", tags=["Inference"])
def batch_predict(payload: BatchPredictionRequest):
    """
    Predicts fraud likelihood for a JSON list of transaction records.
    """
    service = get_service()
    if not service.is_loaded:
        raise HTTPException(status_code=503, detail="Model is not loaded.")

    if not payload.transactions:
        return {"total": 0, "results": []}

    try:
        records = [tx.model_dump() for tx in payload.transactions]
        df = pd.DataFrame(records)
        results = service.predict_batch(df)
        fraud_count = sum(1 for r in results if r['prediction'] == 1)
        return {
            "total": len(results),
            "fraud_detected": fraud_count,
            "legitimate": len(results) - fraud_count,
            "threshold_used": service.threshold,
            "results": results
        }
    except Exception as e:
        logger.error(f"Batch prediction error: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/batch-predict-csv", tags=["Inference"])
async def batch_predict_csv(file: UploadFile = File(...)):
    """
    Upload a CSV file containing transactions (matching Kaggle format: Time, Amount, V1-V28).
    Returns real model predictions, risk scores, and anomaly checks for every row.
    """
    service = get_service()
    if not service.is_loaded:
        raise HTTPException(status_code=503, detail="Model is not loaded.")

    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        if df.empty:
            raise HTTPException(status_code=400, detail="Uploaded CSV file is empty.")

        # Ensure minimal columns exist
        missing = [c for c in RAW_FEATURE_COLUMNS if c not in df.columns]
        if missing:
            raise HTTPException(
                status_code=400,
                detail=f"CSV is missing required feature columns: {missing}"
            )

        results = service.predict_batch(df)
        fraud_count = sum(1 for r in results if r['prediction'] == 1)
        high_risk_count = sum(1 for r in results if r['risk_category'] == 'High Risk')
        medium_risk_count = sum(1 for r in results if r['risk_category'] == 'Medium Risk')
        low_risk_count = sum(1 for r in results if r['risk_category'] == 'Low Risk')
        anomaly_count = sum(1 for r in results if r['is_anomaly'])

        return {
            "filename": file.filename,
            "total_processed": len(results),
            "fraud_detected": fraud_count,
            "legitimate": len(results) - fraud_count,
            "anomalies_flagged": anomaly_count,
            "risk_breakdown": {
                "high_risk": high_risk_count,
                "medium_risk": medium_risk_count,
                "low_risk": low_risk_count
            },
            "threshold_used": service.threshold,
            "results": results
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"CSV Batch error: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Failed to process CSV: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.api.main:app", host="0.0.0.0", port=8000, reload=True)
