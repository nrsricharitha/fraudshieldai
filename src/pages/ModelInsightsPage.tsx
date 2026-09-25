import { useState, useEffect } from 'react';
import { Brain, Star, TrendingUp, ShieldAlert, Award } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { ModelMetric } from '@/types';

export function ModelInsightsPage() {
  const [metrics, setMetrics] = useState<ModelMetric[]>([]);
  const [modelInfo, setModelInfo] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getModelMetrics(), api.getModelInfo()]).then(([m, info]) => {
      setMetrics(m);
      setModelInfo(info);
      setLoading(false);
    });
  }, []);

  const deployedModel = metrics.find((m) => m.status === 'Deployed') || metrics[0];

  const chartData = metrics.map((m) => ({
    model: m.model,
    'PR-AUC': m.prAuc,
    'F1 Score': m.f1Score,
    Precision: m.precision,
    Recall: m.recall,
    'ROC-AUC': m.rocAuc,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Model Performance & Evaluation</h1>
        <p className="text-sm text-slate-500 mt-1">
          Measured results from trained candidate models on the held-out evaluation dataset (56,962 transactions).
        </p>
      </div>

      {/* Deployed Model Highlight */}
      {deployedModel && (
        <Card className="border-brand-500/30 bg-gradient-to-r from-brand-500/10 via-brand-500/5 to-transparent">
          <div className="flex flex-wrap items-center justify-between gap-6 p-2">
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-xl bg-brand-500/20 text-brand-400">
                <Award className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-100">{deployedModel.model}</h2>
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-brand-500/20 text-brand-400 border border-brand-500/30">
                    Selected Production Model
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Selected via highest PR-AUC ({deployedModel.prAuc}%) and F1-Score ({deployedModel.f1Score}%)
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Calibrated Decision Threshold: <span className="font-mono text-amber-400 font-bold">{deployedModel.threshold}</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <MiniMetric label="PR-AUC" value={`${deployedModel.prAuc}%`} highlight />
              <MiniMetric label="Fraud F1" value={`${deployedModel.f1Score}%`} highlight />
              <MiniMetric label="Fraud Recall" value={`${deployedModel.recall}%`} />
              <MiniMetric label="Precision" value={`${deployedModel.precision}%`} />
              <MiniMetric label="ROC-AUC" value={`${deployedModel.rocAuc}%`} />
            </div>
          </div>
        </Card>
      )}

      {/* Model Comparison Chart */}
      <Card>
        <CardHeader
          title="Comparative Model Performance (Held-out Test Split)"
          subtitle="PR-AUC, F1-Score, Precision, and Recall across evaluated architectures"
          icon={<TrendingUp className="w-4 h-4 text-brand-400" />}
        />
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2330" vertical={false} />
              <XAxis dataKey="model" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: '#11161d',
                  border: '1px solid #222a3a',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
              <Bar dataKey="PR-AUC" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="F1 Score" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Precision" fill="#3385ff" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Recall" fill="#a855f7" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ROC-AUC" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Model Comparison Table */}
      <Card>
        <CardHeader
          title="Supervised Models Evaluation Matrix"
          subtitle="All models evaluated on identical held-out test data (56,962 transactions, 98 frauds)"
          icon={<Brain className="w-4 h-4 text-purple-400" />}
        />
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-white/[0.06] text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3 font-semibold">Model Architecture</th>
                <th className="px-4 py-3 font-semibold text-right text-emerald-400">PR-AUC</th>
                <th className="px-4 py-3 font-semibold text-right text-amber-400">Fraud F1</th>
                <th className="px-4 py-3 font-semibold text-right">Precision</th>
                <th className="px-4 py-3 font-semibold text-right">Recall</th>
                <th className="px-4 py-3 font-semibold text-right">ROC-AUC</th>
                <th className="px-4 py-3 font-semibold text-right font-mono">Threshold</th>
                <th className="px-4 py-3 font-semibold text-center">TP / FP / FN</th>
                <th className="px-4 py-3 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {metrics.map((m) => (
                <tr
                  key={m.model}
                  className={cn('hover:bg-white/[0.02]', m.status === 'Deployed' && 'bg-brand-500/[0.04]')}
                >
                  <td className="px-4 py-3 font-semibold text-slate-200">{m.model}</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-400">{m.prAuc}%</td>
                  <td className="px-4 py-3 text-right font-bold text-amber-400">{m.f1Score}%</td>
                  <td className="px-4 py-3 text-right text-slate-300">{m.precision}%</td>
                  <td className="px-4 py-3 text-right text-slate-300">{m.recall}%</td>
                  <td className="px-4 py-3 text-right text-slate-300">{m.rocAuc}%</td>
                  <td className="px-4 py-3 text-right font-mono text-cyan-400">{m.threshold}</td>
                  <td className="px-4 py-3 text-center font-mono text-slate-400">
                    {m.tp !== undefined ? `${m.tp} / ${m.fp} / ${m.fn}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {m.status === 'Deployed' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-brand-500/20 text-brand-400 border border-brand-500/30">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] text-slate-500 bg-ink-800">
                        Evaluated
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Explanatory Callout on Imbalance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader
            title="Why PR-AUC is the Primary Decision Metric"
            subtitle="The mathematical truth about extreme class imbalance (0.17% fraud)"
            icon={<ShieldAlert className="w-4 h-4 text-amber-400" />}
          />
          <div className="text-xs text-slate-400 space-y-2.5 p-1 leading-relaxed">
            <p>
              In a dataset of 284,807 transactions with only 492 frauds, a naive model that predicts
              <strong> &ldquo;100% legitimate&rdquo; achieves 99.83% accuracy</strong> while catching 0 frauds.
            </p>
            <p>
              Similarly, <strong>ROC-AUC</strong> evaluates True Positive Rate vs False Positive Rate.
              Because the number of true legitimate cases (TN) is so overwhelming (56,800+ in the test split),
              even if a model generates 400 false alarms, the False Positive Rate denominator ($FP + TN$)
              remains under 1%, making ROC-AUC look deceptively high (97%+).
            </p>
            <p>
              <strong>PR-AUC (Precision-Recall Area Under Curve)</strong> directly tracks the trade-off
              between catching fraud (Recall) and avoiding false positives (Precision). It provides an honest,
              uninflated measure of model quality.
            </p>
          </div>
        </Card>

        {/* Isolation Forest Card */}
        <Card>
          <CardHeader
            title="Unsupervised Anomaly Detection (Isolation Forest)"
            subtitle="Outlier detection operating without ground-truth labels"
            icon={<Brain className="w-4 h-4 text-cyan-400" />}
          />
          <div className="text-xs text-slate-400 space-y-3 p-1 leading-relaxed">
            <p>
              Trained on legitimate transaction density with a contamination factor of 0.002.
              Isolation Forest isolates outliers by randomly selecting features and splitting values.
            </p>
            {modelInfo?.anomaly_detection_metrics && (
              <div className="p-3 rounded-lg bg-ink-800/40 border border-white/[0.04] space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Anomalies Flagged:</span>
                  <span className="text-slate-200">
                    {modelInfo.anomaly_detection_metrics.flagged_anomalies_test} tx
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">True Frauds Intercepted:</span>
                  <span className="text-emerald-400">
                    {modelInfo.anomaly_detection_metrics.true_frauds_detected} / 98 (
                    {modelInfo.anomaly_detection_metrics.fraud_recall}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Training Time:</span>
                  <span className="text-slate-200">
                    {modelInfo.anomaly_detection_metrics.training_time_seconds}s
                  </span>
                </div>
              </div>
            )}
            <p className="text-[11px] text-slate-500">
              Anomaly detection is treated as an advisory signal for investigation rather than definitive fraud.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

function MiniMetric({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'p-2.5 rounded-lg border text-center',
        highlight
          ? 'bg-brand-500/10 border-brand-500/30'
          : 'bg-ink-800/50 border-white/[0.04]'
      )}
    >
      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{label}</p>
      <p
        className={cn(
          'text-base font-bold mt-0.5',
          highlight ? 'text-brand-400' : 'text-slate-200'
        )}
      >
        {value}
      </p>
    </div>
  );
}
