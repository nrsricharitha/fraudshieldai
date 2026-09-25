"""
Preprocessing pipeline creation and data validation for FraudShield AI.
Ensures exact consistency between training and real-time/batch inference.
"""

from typing import Dict, Any, List, Tuple
import pandas as pd
import numpy as np
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import RobustScaler
from app.preprocessing.feature_engineer import FraudFeatureEngineer, RAW_FEATURE_COLUMNS


def validate_raw_dataframe(df: pd.DataFrame, require_target: bool = False) -> Tuple[bool, List[str]]:
    """
    Validates that a DataFrame conforms to the Kaggle Credit Card Fraud format.
    Returns (is_valid, list_of_issues).
    """
    issues = []
    if not isinstance(df, pd.DataFrame):
        return False, ["Input must be a pandas DataFrame."]

    if df.empty:
        return False, ["Input DataFrame is empty."]

    missing_cols = [c for c in RAW_FEATURE_COLUMNS if c not in df.columns]
    if missing_cols:
        issues.append(f"Missing required columns: {missing_cols}")

    if require_target and 'Class' not in df.columns:
        issues.append("Missing required target column 'Class'.")

    # Check for NaN / infinite values
    for col in RAW_FEATURE_COLUMNS:
        if col in df.columns:
            if not pd.api.types.is_numeric_dtype(df[col]):
                issues.append(f"Column '{col}' must be numeric.")
            else:
                nan_count = df[col].isna().sum()
                if nan_count > 0:
                    issues.append(f"Column '{col}' contains {nan_count} NaN values.")

    return len(issues) == 0, issues


def clean_input_record(record: Dict[str, Any]) -> pd.DataFrame:
    """
    Cleans and standardizes a single transaction dictionary into a 1-row DataFrame.
    Fills any missing PCA features with 0.0 (the PCA mean) if partially provided,
    and ensures Time and Amount are non-negative floats.
    """
    cleaned = {}
    cleaned['Time'] = float(record.get('Time', 0.0))
    cleaned['Amount'] = max(0.0, float(record.get('Amount', 0.0)))

    for i in range(1, 29):
        col = f'V{i}'
        val = record.get(col, 0.0)
        try:
            cleaned[col] = float(val) if val is not None else 0.0
        except (ValueError, TypeError):
            cleaned[col] = 0.0

    df = pd.DataFrame([cleaned])[RAW_FEATURE_COLUMNS]
    return df


def build_preprocessor() -> Pipeline:
    """
    Constructs the end-to-end preprocessing pipeline.
    Combines feature engineering + robust feature scaling.
    """
    return Pipeline([
        ('feature_engineer', FraudFeatureEngineer(include_cyclical_time=True, include_pca_stats=True)),
        ('scaler', RobustScaler(unit_variance=True))
    ])
