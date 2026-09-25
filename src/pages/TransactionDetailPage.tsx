import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Receipt,
  DollarSign,
  Clock,
  Brain,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Lightbulb,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardHeader } from '@/components/ui/Card';
import { RiskBadge, PredictionBadge } from '@/components/ui/Badge';
import { RiskGauge } from '@/components/ui/RiskGauge';
import { Button } from '@/components/ui/Button';
import type { Transaction } from '@/types';

export function TransactionDetailPage({
  txId,
  onBack,
}: {
  txId: string;
  onBack: () => void;
  viewTransaction: (id: string) => void;
}) {
  const [tx, setTx] = useState<Transaction | null>(null);
  const [predictionDetail, setPredictionDetail] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getTransaction(txId).then(async (data) => {
      if (data) {
        setTx(data);
        try {
          // Fetch real model prediction and SHAP explanation
          const rawPayload = data.rawFeatures || {
            Time: data.Time,
            Amount: data.Amount,
          };
          const res = await api.predictTransaction(rawPayload);
          setPredictionDetail(res);
        } catch {
          // Keep existing values
        }
      }
      setLoading(false);
    });
  }, [txId]);

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in p-6">
        <div className="h-8 w-32 bg-ink-800/50 rounded-lg animate-pulse" />
        <div className="h-64 bg-ink-800/50 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!tx) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400">Transaction not found.</p>
        <Button variant="outline" className="mt-4" onClick={onBack} icon={<ArrowLeft className="w-4 h-4" />}>
          Back
        </Button>
      </div>
    );
  }

  const rawFeatures = tx.rawFeatures || {};
  const prob = predictionDetail?.probability ?? tx.fraudProbability;
  const score = predictionDetail?.risk_score ?? tx.riskScore;
  const isFraud = (predictionDetail?.prediction ?? (tx.prediction === 'Fraudulent' ? 1 : 0)) === 1;
  const threshold = predictionDetail?.threshold_used ?? tx.thresholdUsed ?? 0.85;
  const explanations = predictionDetail?.top_contributing_factors ?? [];
  const anomalyInfo = predictionDetail?.anomaly_detection;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />} onClick={onBack}>
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Transaction Deep-Dive</h1>
          <p className="text-sm text-slate-500 mt-0.5 font-mono">{tx.transactionId}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Basic Transaction Info */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Transaction Parameters"
            subtitle="Raw dataset attributes evaluated by the preprocessing pipeline"
            icon={<Receipt className="w-4 h-4" />}
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-ink-800/30 border border-white/[0.03]">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Transaction ID</p>
              <p className="text-sm text-slate-200 font-mono mt-1">{tx.transactionId}</p>
            </div>
            <div className="p-3 rounded-lg bg-ink-800/30 border border-white/[0.03]">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Amount</p>
              <p className="text-base font-bold text-slate-100 mt-1">${tx.Amount.toFixed(2)}</p>
            </div>
            <div className="p-3 rounded-lg bg-ink-800/30 border border-white/[0.03]">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Time (Offset Sec)</p>
              <p className="text-sm text-slate-200 font-mono mt-1">{tx.Time.toFixed(0)}s</p>
            </div>
            <div className="p-3 rounded-lg bg-ink-800/30 border border-white/[0.03]">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Hour of Day</p>
              <p className="text-sm text-slate-200 font-mono mt-1">{((tx.Time / 3600) % 24).toFixed(1)}h</p>
            </div>
            <div className="p-3 rounded-lg bg-ink-800/30 border border-white/[0.03]">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Dataset Origin</p>
              <p className="text-sm text-slate-200 mt-1">Kaggle Held-Out Test</p>
            </div>
            <div className="p-3 rounded-lg bg-ink-800/30 border border-white/[0.03]">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Target Ground Truth</p>
              <p className="text-sm font-semibold mt-1">
                {rawFeatures.Class === 1 ? (
                  <span className="text-red-400">Class 1 (Fraud)</span>
                ) : (
                  <span className="text-emerald-400">Class 0 (Legitimate)</span>
                )}
              </p>
            </div>
          </div>
        </Card>

        {/* Real ML Model Prediction */}
        <Card className="flex flex-col justify-between">
          <CardHeader
            title="Real Model Verdict"
            subtitle="XGBoost Classifier Inference"
            icon={<Brain className="w-4 h-4 text-brand-400" />}
          />
          <div className="text-center py-4 space-y-3">
            <RiskGauge score={score} size="lg" />
            <div className="mt-2">
              <PredictionBadge prediction={isFraud ? 'Fraudulent' : 'Legitimate'} />
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Fraud Probability: <span className="font-bold text-slate-100">{(prob * 100).toFixed(2)}%</span>
            </p>
            <p className="text-[11px] text-slate-500">
              Optimal Threshold: <span className="font-mono text-amber-400">{threshold}</span>
            </p>
          </div>
        </Card>
      </div>

      {/* Anomaly Detection Status */}
      <Card>
        <CardHeader
          title="Unsupervised Anomaly Detection"
          subtitle="Isolation Forest evaluation without ground truth supervision"
          icon={<AlertTriangle className="w-4 h-4 text-amber-400" />}
        />
        <div className="p-4 rounded-xl bg-ink-800/30 border border-white/[0.04] flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-200">
              {anomalyInfo?.is_anomaly ? '⚠️ Statistical Outlier Detected' : '✓ Normal Statistical Density'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {anomalyInfo?.message || (tx.anomaly ? 'Anomalous transaction detected — further investigation recommended.' : 'Conforms to normal transaction distribution.')}
            </p>
          </div>
          <span className="px-3 py-1 rounded-md text-xs font-mono bg-ink-700/50 text-slate-300">
            Contamination: 0.002
          </span>
        </div>
      </Card>

      {/* SHAP Feature Attribution */}
      <Card>
        <CardHeader
          title="Explainability: SHAP Feature Contributions"
          subtitle="Empirical Shapley values computed by TreeExplainer for this exact transaction"
          icon={<Lightbulb className="w-4 h-4 text-amber-400" />}
        />
        {explanations.length === 0 ? (
          <p className="text-sm text-slate-500 py-4">No feature explanations available.</p>
        ) : (
          <div className="space-y-2">
            {explanations.map((exp: any, i: number) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg bg-ink-800/40 border border-white/[0.03] text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-brand-400">{exp.feature}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                        exp.direction === 'increases_risk'
                          ? 'bg-red-500/10 text-red-400'
                          : 'bg-emerald-500/10 text-emerald-400'
                      }`}
                    >
                      {exp.direction === 'increases_risk' ? 'Increases Fraud Risk' : 'Reduces Fraud Risk'}
                    </span>
                  </div>
                  <p className="text-slate-400">{exp.description}</p>
                </div>
                <span className="font-mono font-bold text-slate-200 ml-4">
                  {exp.shap_value > 0 ? `+${exp.shap_value.toFixed(4)}` : exp.shap_value?.toFixed(4)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Raw PCA Feature Inspector */}
      {Object.keys(rawFeatures).length > 0 && (
        <Card>
          <CardHeader
            title="Complete Feature Vector (Kaggle PCA Components)"
            subtitle="Original PCA transformations (V1 through V28)"
            icon={<TrendingUp className="w-4 h-4" />}
          />
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 max-h-60 overflow-y-auto scrollbar-thin p-1">
            {Array.from({ length: 28 }, (_, i) => i + 1).map((num) => {
              const col = `V${num}`;
              const val = rawFeatures[col];
              return (
                <div key={col} className="p-2 rounded bg-ink-800/40 border border-white/[0.02] text-center">
                  <p className="text-[10px] font-mono text-slate-500">{col}</p>
                  <p className="text-xs font-mono text-slate-200 mt-0.5">
                    {val !== undefined ? Number(val).toFixed(3) : '-'}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
