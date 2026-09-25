# FraudShield AI: Real-Time Machine Learning Fraud Detection

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?style=flat&logo=FastAPI&logoColor=white)](https://fastapi.tiangolo.com)
[![XGBoost](https://img.shields.io/badge/XGBoost-3.2+-eb5424.svg?style=flat&logo=XGBoost&logoColor=white)](https://xgboost.ai)
[![React](https://img.shields.io/badge/React-18.3+-61dafb.svg?style=flat&logo=React&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5+-3178c6.svg?style=flat&logo=TypeScript&logoColor=white)](https://www.typescriptlang.org)
[![Python](https://img.shields.io/badge/Python-3.11+-3776ab.svg?style=flat&logo=Python&logoColor=white)](https://python.org)

**FraudShield AI** is an end-to-end, production-grade fraud surveillance and risk analysis system. Originally scaffolded as a frontend demo, this project has been upgraded into a genuine machine-learning pipeline trained, tuned, and evaluated on the benchmark **Kaggle Credit Card Fraud Detection dataset** (284,807 transactions).

> [!NOTE]
> **Portfolio & Educational Project**: This system is designed for portfolio demonstration, architectural reference, and educational research in financial fraud detection. The 0–100 risk score is a project-defined heuristic and is not an official banking credit bureau rating.

---

## 1. Problem Statement

Financial payment fraud causes tens of billions of dollars in losses annually. Detecting fraudulent transactions presents two fundamental technical challenges:
1. **Extreme Class Imbalance**: In real-world payment networks, fraudulent transactions represent a fraction of a percent (0.17% in the benchmark dataset). Standard accuracy metrics are useless (a naive classifier predicting 100% legitimate transactions achieves 99.83% accuracy while catching zero fraud).
2. **Precision vs. Recall Trade-Off**: High recall is critical to intercept crime, but false positives disrupt legitimate cardholders, causing customer friction and transaction abandonment.

---

## 2. Dataset

- **Name**: Kaggle Credit Card Fraud Detection Dataset
- **Source**: [Kaggle / ULB Machine Learning Group](https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud)
- **Time Span**: 2 days of European cardholder transactions in September 2013
- **Total Volume**: 284,807 transactions
- **Class Breakdown**:
  - `Class = 0` (Legitimate): 284,315 (99.827%)
  - `Class = 1` (Fraudulent): 492 (0.173%)
- **Features**:
  - `Time`: Elapsed seconds since first recorded transaction.
  - `V1` to `V28`: 28 principal components obtained via PCA (anonymized for privacy).
  - `Amount`: Transaction monetary amount.
  - `Class`: Response target.

---

## 3. Real Feature Engineering

The feature engineering stage (`app/preprocessing/feature_engineer.py`) derives 7 new statistical features from raw input vectors without data leakage:
1. **Amount Log-Transformation (`Amount_log`)**: `np.log1p(Amount)` reduces extreme right-skewness and compresses heavy-tailed payment distributions.
2. **Cyclical Hour-of-Day Encodings (`Hour_sin`, `Hour_cos`)**: Captures smooth time-of-day risk fluctuations, ensuring 23:59 and 00:01 are mathematically continuous:
   $$\text{Hour} = (\text{Time} / 3600) \pmod{24}$$
   $$\text{Hour}_{\sin} = \sin\left(\frac{2\pi \cdot \text{Hour}}{24}\right), \quad \text{Hour}_{\cos} = \cos\left(\frac{2\pi \cdot \text{Hour}}{24}\right)$$
3. **Day Indicator (`Day`)**: Distinguishes Day 0 from Day 1 in the 48-hour dataset window.
4. **PCA Vector Dispersion Statistics**: Row-wise latent statistics:
   - `V_mean`: Central tendency across PCA components.
   - `V_std`: Dispersion across PCA components.
   - `V_abs_sum`: Total absolute vector magnitude ($L_1$ norm), capturing global variance spikes.
5. **Robust Scaling**: `RobustScaler` scales all 37 features using interquartile range (IQR), preventing outliers from distorting boundaries.

---

## 4. Class Imbalance Handling

To avoid **data leakage**, all imbalance corrections are fitted strictly on the 80% training split:
- **XGBoost**: Weighted positive class loss via `scale_pos_weight = 577.29` ($\approx \frac{\text{negatives}}{\text{positives}}$).
- **Random Forest**: Balanced sub-sample class weighting (`class_weight='balanced_subsample'`).
- **Logistic Regression**: Balanced inverse frequency weighting (`class_weight='balanced'`).
- **Optimal Decision Thresholding**: Rather than defaulting to $0.5$, threshold optimization maximizes the fraud-class $F_1$-score on validation data, establishing the optimal decision threshold at **0.8500**.

---

## 5. Model Evaluation & Benchmark Comparison

All models were evaluated on the identical held-out test split of **56,962 transactions (98 frauds)**:

| Model Architecture | PR-AUC (%) | Fraud $F_1$ (%) | Fraud Recall (%) | Fraud Precision (%) | ROC-AUC (%) | Optimal Threshold | TP / FP / FN | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **XGBoost (Candidate)** | **85.29%** | **81.59%** | **83.67%** | **79.61%** | **98.12%** | **0.8500** | **82 / 21 / 16** | **Deployed (Best)** |
| **Random Forest** | 82.14% | 82.05% | 81.63% | 82.47% | 96.90% | 0.5362 | 80 / 17 / 18 | Evaluated |
| **Logistic Regression** | 73.07% | 30.09% | 89.80% | 18.07% | 97.49% | 0.8500 | 88 / 399 / 10 | Evaluated |
| **Isolation Forest** | — | — | 30.61% | — | — | Contam. 0.002 | 30 / 115 / 68 | Unsupervised |

### Why PR-AUC is the Primary Decision Metric
- **ROC-AUC is Deceptive Under Extreme Imbalance**: With 56,864 true negatives in the test set, hundreds of false positives barely change the False Positive Rate ($FP / (TN + FP) < 0.7\%$), yielding deceptively high ROC-AUCs ($>97\%$).
- **PR-AUC Directly Tracks Operational Reality**: Precision-Recall Area Under Curve directly tracks the penalty of false alarms ($FP$) against caught frauds ($TP$), making it the most stringent and honest evaluation metric.

---

## 6. Unsupervised Anomaly Detection (Isolation Forest)

In addition to supervised classification, FraudShield AI trains an **Isolation Forest** (`contamination=0.002`) purely on legitimate transactions. It identifies statistical outliers without supervision:
- **Verdict Wording**: *"Anomalous transaction detected — further investigation recommended."*
- Operates as a secondary defense layer for zero-day fraud patterns.

---

## 7. Explainability (SHAP)

Every transaction scored through `POST /predict` returns real feature contributions computed by `shap.TreeExplainer`:
- Measures exact positive or negative log-odds attributions for each feature.
- Ranks top factors (e.g. latent component $V_{14}$ deviations, log-amount skew, cyclical hour timing).
- Zero fabricated reasons like "new device detected" unless supported by genuine dataset features.

---

## 8. Project Structure

```
fraudshield-ai/
├── app/
│   ├── api/                     # FastAPI backend
│   │   ├── __init__.py
│   │   └── main.py              # REST API endpoints & CORS
│   ├── dashboard/               # Streamlit dashboard
│   │   └── streamlit_app.py
│   ├── explainability/          # SHAP attribution module
│   │   ├── __init__.py
│   │   └── explainer.py
│   ├── models/                  # Inference service
│   │   ├── __init__.py
│   │   └── model_service.py
│   ├── preprocessing/           # Leak-free feature engineering
│   │   ├── __init__.py
│   │   ├── feature_engineer.py  # Sklearn transformer
│   │   └── pipeline.py          # Column scaling & validation
│   └── utils/                   # Risk scoring heuristics
│       ├── __init__.py
│       └── risk_scorer.py
├── data/
│   ├── README.md                # Dataset acquisition guide
│   └── sample_test_transactions.csv # Authentic held-out test cases
├── models/
│   ├── fraud_model.joblib       # Serialized production pipeline
│   ├── anomaly_model.joblib     # Serialized Isolation Forest
│   ├── model_metadata.json      # Complete measured metrics & parameters
│   └── evaluation_metrics.json  # Full benchmark scores
├── src/                         # Vite + React + Tailwind Frontend
│   ├── components/              # AppShell, Topbar, Sidebar, Table
│   ├── context/                 # AppContext state
│   ├── lib/                     # api.ts client & hooks
│   └── pages/                   # Dashboard, Transactions, Batch, Alerts, Model, Anomaly
├── tests/
│   └── test_api_and_models.py   # Pytest automated test suite
├── training/
│   └── train_model.py           # Reproducible model training script
├── Dockerfile                   # Docker container definition
├── package.json                 # Node frontend configuration
├── requirements.txt             # Python dependencies
└── README.md                    # Project documentation
```

---

## 9. Quickstart: Installation & Execution

### Prerequisites
- Python 3.10+ (Python 3.11 recommended)
- Node.js 18+ and npm

### Step 1: Install Python Dependencies
```bash
pip install -r requirements.txt
```

### Step 2: (Optional) Re-Train the ML Models
The trained models and metadata are already included in `models/`. To retrain from scratch:
```bash
python training/train_model.py
```

### Step 3: Run the Automated Test Suite
```bash
python -m pytest tests/test_api_and_models.py -v
```

### Step 4: Start the FastAPI Backend
```bash
uvicorn app.api.main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation will be available at: http://localhost:8000/docs

### Step 5: Start the Dashboard

#### Option A: Vite + React Frontend (Recommended)
```bash
npm install
npm run dev
```
Open http://localhost:5173 to access the FraudShield AI dashboard.

#### Option B: Streamlit Dashboard
```bash
streamlit run app/dashboard/streamlit_app.py
```
Open http://localhost:8501 to access the Python Streamlit interface.

---

## 10. API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Service health, active model name, threshold, and timestamp |
| `GET` | `/model-info` | Complete evaluation metrics, confusion matrix, and feature importances |
| `GET` | `/sample-transactions` | Authentic held-out test transactions for UI testing |
| `POST` | `/predict` | Single transaction scoring with probability, risk score, and SHAP |
| `POST` | `/batch-predict` | Batch JSON scoring of transaction arrays |
| `POST` | `/batch-predict-csv` | File upload endpoint for CSV batch evaluation and CSV export |

---

## 11. Limitations & Ethical Notice

1. **Synthetic PCA Features**: The Kaggle dataset features $V_1$ through $V_{28}$ are transformed via PCA for privacy. Real-world deployments would augment these with raw device fingerprinting, velocity checks, and geolocation data.
2. **Concept Drift**: Financial fraud strategies evolve dynamically. In a live enterprise environment, continuous monitoring and scheduled retraining are essential to combat drift.
3. **Risk Scoring Label**: Risk scores ($0-100$) are calculated as $\text{round}(\text{probability} \times 100)$ and classified as Low ($0-30$), Medium ($31-70$), and High ($71-100$). This is an explicit project-defined heuristic.
