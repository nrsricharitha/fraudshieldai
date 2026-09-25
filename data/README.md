# Dataset Guide: Kaggle Credit Card Fraud Detection

This directory is designated for the Kaggle Credit Card Fraud Detection dataset (`creditcard.csv`).

## 1. Dataset Source & Overview
- **Source**: [Kaggle Credit Card Fraud Detection](https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud)
- **Origin**: Credit card transactions made in September 2013 by European cardholders.
- **Records**: 284,807 transactions.
- **Class Balance**: 
  - Legitimate (`Class = 0`): 284,315 (99.83%)
  - Fraudulent (`Class = 1`): 492 (0.1727%)
- **Feature Structure**:
  - `Time`: Elapsed seconds since the first transaction in the dataset.
  - `V1` to `V28`: 28 principal components obtained via PCA (anonymized for user confidentiality).
  - `Amount`: Transaction monetary amount.
  - `Class`: Response variable (1 for fraud, 0 for legitimate).

## 2. Setup Instructions

Due to GitHub size limitations, the full `creditcard.csv` (~143 MB uncompressed) should not be committed to Git.

### Option A: Automatic Download via Script
Run the automated downloader included with the project:
```bash
python -c "
import urllib.request
url = 'https://raw.githubusercontent.com/nsethi31/Kaggle-Data-Credit-Card-Fraud-Detection/master/creditcard.csv'
urllib.request.urlretrieve(url, 'data/creditcard.csv')
"
```

### Option B: Direct Download from Kaggle
1. Visit https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud
2. Download `archive.zip` and extract `creditcard.csv`.
3. Place `creditcard.csv` inside this `data/` folder.

## 3. Sample Dataset for Quick Testing
The repository includes `sample_test_transactions.csv` (50 authentic transactions from the held-out test split, including both legitimate and fraud cases). This allows immediate verification of the API, single predictions, and batch CSV scoring without needing to re-download the full 284k dataset.
