"""
Risk Scoring utilities for FraudShield AI.
Maps model fraud probability to a transparent project-defined risk score.
"""

from typing import Tuple

RISK_DISCLAIMER = (
    "Project-defined heuristic risk score derived from ML probability. "
    "Not an official financial/banking credit bureau score."
)


def compute_risk_score(probability: float) -> Tuple[int, str, str]:
    """
    Converts model probability (0.0 to 1.0) into:
    - risk_score: 0 to 100 integer
    - risk_category: 'Low Risk' | 'Medium Risk' | 'High Risk'
    - disclaimer: text disclaimer
    """
    prob_clamped = max(0.0, min(1.0, float(probability)))
    score = int(round(prob_clamped * 100))

    if score <= 30:
        category = 'Low Risk'
    elif score <= 70:
        category = 'Medium Risk'
    else:
        category = 'High Risk'

    return score, category, RISK_DISCLAIMER
