export type RiskLevel = 'Low' | 'Medium' | 'High';
export type Prediction = 'Legitimate' | 'Fraudulent' | 'Suspicious';
export type AlertStatus = 'New' | 'Investigating' | 'Resolved';

export type PageKey =
  | 'dashboard'
  | 'transactions'
  | 'batch'
  | 'alerts'
  | 'model'
  | 'anomaly';

export interface ExplanationReason {
  feature: string;
  shap_value?: number;
  contribution: number;
  direction?: 'increases_risk' | 'decreases_risk';
  description: string;
}

export interface Transaction {
  transactionId: string;
  Time: number;
  Amount: number;
  customerId?: string;
  merchant?: string;
  location?: string;
  device?: string;
  timestamp?: string;
  fraudProbability: number;
  riskScore: number;
  riskLevel: RiskLevel;
  prediction: Prediction;
  anomaly: boolean;
  anomalyMessage?: string;
  thresholdUsed?: number;
  explanationReasons: ExplanationReason[];
  rawFeatures?: Record<string, number>;
}

export interface FraudAlert {
  id: string;
  transactionId: string;
  riskScore: number;
  riskLevel: RiskLevel;
  reasons: string[];
  status: AlertStatus;
  createdAt: string;
  amount: number;
  probability: number;
}

export interface ModelMetric {
  model: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  rocAuc: number;
  prAuc: number;
  threshold: number;
  status: 'Deployed' | 'Evaluated' | 'Experimental';
  tp?: number;
  fp?: number;
  fn?: number;
  tn?: number;
}

export interface KPIData {
  totalTransactions: number;
  transactionsAnalyzed: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  fraudDetected: number;
  detectionRate: number;
  prAuc: number;
  activeModel: string;
  threshold: number;
}

export interface TrendPoint {
  label: string;
  legitimate: number;
  fraudulent: number;
}
