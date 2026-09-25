"""
Feature Engineering module for Credit Card Fraud Detection.

Derives statistically sound, leak-free features from raw transaction inputs:
- Amount log transformation (np.log1p)
- Robust/Standard scaling of Amount
- Time-derived features (Hour of day, cyclical sin/cos hour encodings, Day)
- PCA vector aggregate dispersion (mean, std)
"""

import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin

RAW_FEATURE_COLUMNS = [
    'Time',
    'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10',
    'V11', 'V12', 'V13', 'V14', 'V15', 'V16', 'V17', 'V18', 'V19', 'V20',
    'V21', 'V22', 'V23', 'V24', 'V25', 'V26', 'V27', 'V28',
    'Amount'
]

PCA_COLUMNS = [f'V{i}' for i in range(1, 29)]


class FraudFeatureEngineer(BaseEstimator, TransformerMixin):
    """
    Transforms raw CreditCardFraud dataset features into engineered ML features.
    Maintains exact feature consistency across training and inference.
    """

    def __init__(self, include_cyclical_time: bool = True, include_pca_stats: bool = True):
        self.include_cyclical_time = include_cyclical_time
        self.include_pca_stats = include_pca_stats
        self.feature_names_out_ = []

    def fit(self, X, y=None):
        # Deterministic transformations; store output feature names
        self._compute_feature_names()
        return self

    def _compute_feature_names(self):
        names = list(PCA_COLUMNS)
        names.append('Amount')
        names.append('Amount_log')
        if self.include_cyclical_time:
            names.extend(['Hour', 'Hour_sin', 'Hour_cos', 'Day'])
        if self.include_pca_stats:
            names.extend(['V_mean', 'V_std', 'V_abs_sum'])
        self.feature_names_out_ = names

    def transform(self, X):
        """
        Applies feature engineering to input data.
        X can be a DataFrame or 2D array-like structure.
        """
        if isinstance(X, pd.DataFrame):
            df = X.copy()
        elif isinstance(X, dict):
            df = pd.DataFrame([X])
        else:
            df = pd.DataFrame(X, columns=RAW_FEATURE_COLUMNS[:X.shape[1]])

        # Validate required columns exist
        missing = [col for col in RAW_FEATURE_COLUMNS if col not in df.columns]
        if missing:
            raise ValueError(f"Input is missing required features: {missing}")

        engineered = pd.DataFrame(index=df.index)

        # 1. PCA features preserved
        for col in PCA_COLUMNS:
            engineered[col] = df[col].astype(float)

        # 2. Amount features
        raw_amount = df['Amount'].astype(float).clip(lower=0.0)
        engineered['Amount'] = raw_amount
        engineered['Amount_log'] = np.log1p(raw_amount)

        # 3. Time features
        if self.include_cyclical_time:
            time_sec = df['Time'].astype(float)
            hours_total = time_sec / 3600.0
            hour_of_day = (hours_total % 24.0).values
            day = (hours_total // 24.0).astype(int).values

            engineered['Hour'] = hour_of_day
            engineered['Hour_sin'] = np.sin(2.0 * np.pi * hour_of_day / 24.0)
            engineered['Hour_cos'] = np.cos(2.0 * np.pi * hour_of_day / 24.0)
            engineered['Day'] = day

        # 4. PCA vector aggregate dispersion
        if self.include_pca_stats:
            pca_matrix = df[PCA_COLUMNS].astype(float).values
            engineered['V_mean'] = np.mean(pca_matrix, axis=1)
            engineered['V_std'] = np.std(pca_matrix, axis=1)
            engineered['V_abs_sum'] = np.sum(np.abs(pca_matrix), axis=1)

        self.feature_names_out_ = engineered.columns.tolist()
        return engineered

    def get_feature_names_out(self, input_features=None):
        if not self.feature_names_out_:
            self._compute_feature_names()
        return np.array(self.feature_names_out_)
