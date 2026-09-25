import { useState, useEffect } from 'react';
import {
  Receipt,
  Download,
  Search,
  Sparkles,
  ArrowRight,
  Brain,
  AlertTriangle,
  CheckCircle2,
  Sliders,
} from 'lucide-react';
import { useTransactions } from '@/lib/hooks';
import { useApp } from '@/context/AppContext';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TransactionTable } from '@/components/TransactionTable';
import { RiskBadge, PredictionBadge } from '@/components/ui/Badge';
import { RiskGauge } from '@/components/ui/RiskGauge';
import { api } from '@/lib/api';
import type { Transaction } from '@/types';

export function TransactionsPage({ viewTransaction }: { viewTransaction: (id: string) => void }) {
  const { transactions, loading, refresh } = useTransactions();
  const { addToast } = useApp();

  const [samples, setSamples] = useState<any[]>([]);
  const [selectedSampleIdx, setSelectedSampleIdx] = useState<number>(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeResult, setActiveResult] = useState<any | null>(null);

  // Form fields
  const [txTime, setTxTime] = useState<number>(45000);
  const [txAmount, setTxAmount] = useState<number>(149.99);
  const [vValues, setVValues] = useState<Record<string, number>>({});

  useEffect(() => {
    api
      .getSampleTransactions(50)
      .then((res) => {
        if (res.samples && res.samples.length > 0) {
          setSamples(res.samples);
          loadSampleIntoForm(res.samples[0]);
        }
      })
      .catch(() => {});
  }, []);

  const loadSampleIntoForm = (sample: any) => {
    setTxTime(sample.Time ?? 0);
    setTxAmount(sample.Amount ?? 0);
    const newV: Record<string, number> = {};
    for (let i = 1; i <= 28; i++) {
      newV[`V${i}`] = sample[`V${i}`] ?? 0;
    }
    setVValues(newV);
  };

  const handleSelectSample = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const idx = parseInt(e.target.value, 10);
    setSelectedSampleIdx(idx);
    if (samples[idx]) {
      loadSampleIntoForm(samples[idx]);
    }
  };

  const handleRunPrediction = async () => {
    setAnalyzing(true);
    try {
      const payload = {
        Time: Number(txTime),
        Amount: Number(txAmount),
        ...vValues,
      };

      const result = await api.predictTransaction(payload);
      setActiveResult(result);
      addToast({
        type: result.prediction === 1 ? 'warning' : 'success',
        title: `Model Prediction: ${result.label}`,
        message: `Probability: ${(result.probability * 100).toFixed(1)}% | Risk Score: ${result.risk_score}/100`,
      });
      refresh();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Inference Error',
        message: err.message || 'Failed to score transaction.',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleExport = () => {
    if (!transactions.length) return;
    const headers = ['transactionId', 'Time', 'Amount', 'prediction', 'fraudProbability', 'riskScore', 'riskLevel', 'anomaly'];
    const rows = transactions.map((t) =>
      [t.transactionId, t.Time, t.Amount, t.prediction, t.fraudProbability, t.riskScore, t.riskLevel, t.anomaly].join(',')
    );
    const csvContent = `data:text/csv;charset=utf-8,${headers.join(',')}\n${rows.join('\n')}`;
    const encoded = encodeURI(csvContent);
    const a = document.createElement('a');
    a.href = encoded;
    a.download = `transactions_export_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Transaction Analysis</h1>
          <p className="text-sm text-slate-500 mt-1">
            Score transactions in real time with the genuine XGBoost model and SHAP explainability.
          </p>
        </div>
        <Button variant="outline" size="sm" icon={<Download className="w-4 h-4" />} onClick={handleExport}>
          Export Scored CSV
        </Button>
      </div>

      {/* Real-time Inference Playground */}
      <Card className="border-brand-500/20 bg-gradient-to-b from-brand-500/[0.03] to-transparent">
        <CardHeader
          title="Interactive Model Scoring Playground"
          subtitle="Load authentic test cases from Kaggle or fine-tune features to observe model and SHAP response."
          icon={<Brain className="w-4 h-4 text-brand-400" />}
        />

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-slate-400 font-medium">Load Kaggle Test Sample:</span>
            <select
              className="bg-ink-800 text-xs text-slate-200 border border-white/[0.1] rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-500"
              value={selectedSampleIdx}
              onChange={handleSelectSample}
            >
              {samples.map((s, idx) => (
                <option key={idx} value={idx}>
                  Sample #{idx + 1} — Amount: ${Number(s.Amount).toFixed(2)} | Ground Truth:{' '}
                  {s.Class === 1 ? 'FRAUD' : 'Legitimate'}
                </option>
              ))}
            </select>
            <Button
              variant="primary"
              size="sm"
              icon={<Sparkles className="w-4 h-4" />}
              onClick={handleRunPrediction}
              disabled={analyzing}
            >
              {analyzing ? 'Evaluating Pipeline...' : 'Run Real Prediction'}
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-white/[0.04]">
            <div>
              <label className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                Time (seconds)
              </label>
              <input
                type="number"
                value={txTime}
                onChange={(e) => setTxTime(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-1.5 text-xs bg-ink-800/80 border border-white/[0.06] rounded-lg text-slate-200"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                Amount ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={txAmount}
                onChange={(e) => setTxAmount(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-1.5 text-xs bg-ink-800/80 border border-white/[0.06] rounded-lg text-slate-200"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                Latent V14 (High Imp.)
              </label>
              <input
                type="number"
                step="0.01"
                value={vValues['V14'] ?? 0}
                onChange={(e) => setVValues({ ...vValues, V14: parseFloat(e.target.value) || 0 })}
                className="w-full mt-1 px-3 py-1.5 text-xs bg-ink-800/80 border border-white/[0.06] rounded-lg text-slate-200 font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                Latent V10 (High Imp.)
              </label>
              <input
                type="number"
                step="0.01"
                value={vValues['V10'] ?? 0}
                onChange={(e) => setVValues({ ...vValues, V10: parseFloat(e.target.value) || 0 })}
                className="w-full mt-1 px-3 py-1.5 text-xs bg-ink-800/80 border border-white/[0.06] rounded-lg text-slate-200 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Prediction Results Banner */}
        {activeResult && (
          <div className="mt-6 pt-6 border-t border-white/[0.08] animate-fade-in space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-ink-900/60 border border-white/[0.06]">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Model Verdict</p>
                <div className="mt-2 flex items-center gap-3">
                  <PredictionBadge
                    prediction={activeResult.prediction === 1 ? 'Fraudulent' : 'Legitimate'}
                  />
                  <span className="text-xs font-mono text-slate-300">
                    Prob: {(activeResult.probability * 100).toFixed(2)}%
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  Calibrated Decision Threshold: <span className="font-mono text-amber-400">{activeResult.threshold_used}</span>
                </p>
              </div>

              <div className="p-4 rounded-xl bg-ink-900/60 border border-white/[0.06] flex items-center gap-4">
                <RiskGauge score={activeResult.risk_score} size="md" />
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Risk Rating</p>
                  <p className="text-base font-bold text-slate-100 mt-0.5">{activeResult.risk_category}</p>
                  <p className="text-[10px] text-slate-500 mt-1">Project-defined heuristic (0-100)</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-ink-900/60 border border-white/[0.06]">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                  Unsupervised Anomaly (Isolation Forest)
                </p>
                <div className="mt-2">
                  {activeResult.anomaly_detection?.is_anomaly ? (
                    <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      ⚠️ Anomalous Transaction Detected
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      ✓ Normal Statistical Profile
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-2">
                  {activeResult.anomaly_detection?.message}
                </p>
              </div>
            </div>

            {/* Top SHAP Explanations */}
            {activeResult.top_contributing_factors?.length > 0 && (
              <div className="p-4 rounded-xl bg-ink-900/40 border border-white/[0.04]">
                <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  SHAP Feature Contributions (Why this prediction was made)
                </p>
                <div className="space-y-2">
                  {activeResult.top_contributing_factors.map((f: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-4 p-2.5 rounded-lg bg-ink-800/40 border border-white/[0.02] text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-semibold text-brand-400">{f.feature}</span>
                        <span className="text-slate-400">{f.description}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span
                          className={
                            f.direction === 'increases_risk' ? 'text-red-400 font-semibold' : 'text-emerald-400'
                          }
                        >
                          {f.shap_value > 0 ? `+${f.shap_value}` : f.shap_value}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Evaluated Transactions Table */}
      <Card>
        <CardHeader
          title="All Evaluated Transactions"
          subtitle="Click on any transaction to drill into the full feature vector and explanation."
          icon={<Receipt className="w-4 h-4" />}
        />
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-ink-800/50 animate-pulse" />
            ))}
          </div>
        ) : (
          <TransactionTable
            transactions={transactions}
            onSelect={(tx: Transaction) => viewTransaction(tx.transactionId)}
            pageSize={12}
          />
        )}
      </Card>
    </div>
  );
}
