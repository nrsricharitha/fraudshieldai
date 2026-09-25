"""
Explainability module for FraudShield AI.
Uses SHAP (SHapley Additive exPlanations) on the trained model pipeline
to explain why a transaction is flagged as fraud or legitimate.
"""

from typing import List, Dict, Any
import numpy as np
import pandas as pd
import shap


class FraudExplainer:
    """
    SHAP-based explainer for the trained fraud detection model.
    Attributed directly to actual input and engineered feature values.
    """

    def __init__(self, classifier, preprocessor):
        self.classifier = classifier
        self.preprocessor = preprocessor
        self.feature_names = preprocessor.named_steps['feature_engineer'].get_feature_names_out().tolist()
        self.explainer = shap.TreeExplainer(classifier)

    def explain_transaction(self, raw_df: pd.DataFrame, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Calculates SHAP values for a single transaction (as a 1-row DataFrame)
        and returns the top-k contributing factors.
        """
        # Transform raw features to engineered scaled space
        proc_features = self.preprocessor.transform(raw_df)
        shap_res = self.explainer(proc_features)

        # Handle different SHAP output formats (binary vs raw margin)
        vals = shap_res.values[0]
        if len(vals.shape) > 1 and vals.shape[-1] == 2:
            # If (n_features, 2) binary output, take Class 1 (fraud)
            vals = vals[:, 1]

        # Rank by absolute magnitude of contribution
        abs_order = np.argsort(np.abs(vals))[::-1]

        contributions = []
        for idx in abs_order[:top_k]:
            feat = str(self.feature_names[idx])
            val_shap = float(vals[idx])
            direction = 'increases_risk' if val_shap > 0 else 'decreases_risk'

            # Get raw feature value if exists
            raw_val_str = ""
            if feat in raw_df.columns:
                val = raw_df[feat].iloc[0]
                raw_val_str = f" (Value: {val:.2f})" if isinstance(val, (int, float, np.floating)) else f" (Value: {val})"

            # Factual description based on actual feature type
            if feat.startswith('V'):
                if 'mean' in feat or 'std' in feat or 'abs' in feat:
                    desc = f"Aggregate PCA statistic '{feat}' indicates atypical feature dispersion profile."
                else:
                    desc = f"Latent PCA component '{feat}' deviated significantly from standard legitimate transaction bounds{raw_val_str}."
            elif 'Amount' in feat:
                desc = f"Transaction amount magnitude '{feat}' contributed to the risk score calculation{raw_val_str}."
            elif 'Hour' in feat or 'Day' in feat:
                desc = f"Temporal feature '{feat}' aligned with risk patterns for time-of-day execution."
            else:
                desc = f"Engineered feature '{feat}' influenced the classification outcome."

            contributions.append({
                'feature': feat,
                'shap_value': round(val_shap, 4),
                'direction': direction,
                'description': desc
            })

        return contributions
