import { useState, useEffect } from 'react';
import { Brain, TrendingUp, ShieldAlert, Award, FileSpreadsheet, Info } from 'lucide-react';
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
  const [samples, setSamples] = useState<any[]>([]);
  const [uploadedBatch, setUploadedBatch] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getModelMetrics(),
      api.getModelInfo(),
      api.getSampleTransactions(50),
    ]).then(([m, info, s]) => {
      setMetrics(m);
      setModelInfo(info);
      setSamples(s.samples || []);
      setLoading(false);
    });

    const saved = localStorage.getItem('fs_uploaded_batch');
    if (saved) {
      try {
        setUploadedBatch(JSON.parse(saved));
      } catch {}
    }
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

  const testSplitSize = modelInfo?.test_samples || 56962;
  const totalRecords = modelInfo?.total_records || 284807;

  // Compute live metrics if uploaded batch has ground truth
  const uploadedStats = (() => {
    if (!uploadedBatch?.results || uploadedBatch.results.length === 0) return null;
    const res = uploadedBatch.results;
    const hasGt = res.some((r: any) => r.ground_truth !== undefined);
    if (!hasGt) {
      const fraudCount = res.filter((r: any) => r.prediction === 1).length;
      return {
        hasGt: false,
        total: res.length,
        fraudCount,
        rate: ((fraudCount / res.length) * 100).toFixed(2),
        avgScore: (res.reduce((acc: number, r: any) => acc + (r.risk_score || 0), 0) / res.length).toFixed(1),
      };
    }

    let tp = 0, fp = 0, fn = 0, tn = 0;
    res.forEach((r: any) => {
      const actual = r.ground_truth;
      const pred = r.prediction;
      if (actual === 1 && pred === 1) tp++;
      else if (actual === 0 && pred === 1) fp++;
      else if (actual === 1 && pred === 0) fn++;
      else if (actual === 0 && pred === 0) tn++;
    });

    const total = res.length;
    const acc = (((tp + tn) / total) * 100).toFixed(2);
    const prec = (tp + fp > 0 ? (tp / (tp + fp)) * 100 : 0).toFixed(2);
    const rec = (tp + fn > 0 ? (tp / (tp + fn)) * 100 : 0).toFixed(2);
    const f1 = (parseFloat(prec) + parseFloat(rec) > 0
      ? (2 * (parseFloat(prec) * parseFloat(rec))) / (parseFloat(prec) + parseFloat(rec))
      : 0).toFixed(2);

    return { hasGt: true, total, tp, fp, fn, tn, acc, prec, rec, f1 };
  })();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Model Performance</h1>
        <p className="text-sm text-slate-500 mt-1">
          Training provenance, empirical evaluation benchmarks on the held-out evaluation dataset, and live metrics.
        </p>
      </div>

      {/* Top Provenance Header */}
      <Card className="border-brand-500/20 bg-brand-500/[0.03]">
        <div className="p-2 space-y-1.5">
          <p className="text-xs text-slate-300">
            <strong className="text-slate-100">Training Dataset:</strong> Kaggle Credit Card Fraud Detection ({totalRecords.toLocaleString()} transactions) &nbsp;|&nbsp;{' '}
            <strong className="text-slate-100">Evaluation:</strong> Held-out test set ({testSplitSize.toLocaleString()} transactions)
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            The Kaggle Credit Card Fraud Detection dataset was used for offline model development, training, and evaluation.
            The deployed FraudShield AI application uses the resulting trained XGBoost and Isolation Forest pipelines for real-time transaction scoring.
          </p>
        </div>
      </Card>

      {/* Actual Evaluation Size vs Interactive Display Sample */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-ink-800/40 border border-white/[0.06]">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Records</p>
          <p className="text-2xl font-bold text-slate-100 mt-1">{totalRecords.toLocaleString()}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">100% Kaggle Data</p>
        </div>
        <div className="p-4 rounded-xl bg-brand-500/10 border border-brand-500/20">
          <p className="text-xs text-brand-400 uppercase tracking-wider font-semibold">Actual Evaluation Split</p>
          <p className="text-2xl font-bold text-brand-400 mt-1">{testSplitSize.toLocaleString()} tx</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Full Evaluation Size (98 frauds)</p>
        </div>
        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
          <p className="text-xs text-purple-400 uppercase tracking-wider font-semibold">Interactive Display Sample</p>
          <p className="text-2xl font-bold text-purple-400 mt-1">{samples.length} tx</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Sample for Inspection</p>
        </div>
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-xs text-emerald-400 uppercase tracking-wider font-semibold">Production PR-AUC</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{deployedModel?.prAuc || 85.29}%</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Primary Decision Metric</p>
        </div>
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
                    Production Model
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

      {/* Model Evaluation — Held-Out Test Set */}
      <Card>
        <CardHeader
          title="Model Evaluation — Held-Out Test Set"
          subtitle={`Evaluated on the full ${testSplitSize.toLocaleString()} transaction held-out evaluation split (98 frauds)`}
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
                        Active Production
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

      {/* Comparison Chart */}
      <Card>
        <CardHeader
          title="Comparative Model Performance Chart"
          subtitle="PR-AUC, F1-Score, Precision, and Recall by Candidate Model"
          icon={<TrendingUp className="w-4 h-4 text-brand-400" />}
        />
        <div className="h-72">
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
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Isolation Forest Section */}
      <Card>
        <CardHeader
          title="Unsupervised Anomaly Detection — Isolation Forest"
          subtitle="Outlier detection operating without fraud label supervision"
          icon={<Brain className="w-4 h-4 text-cyan-400" />}
        />
        <div className="p-4 space-y-3">
          <p className="text-xs text-slate-400 leading-relaxed">
            <strong className="text-slate-200">Fraud Classification vs Anomaly Detection:</strong> Supervised models (XGBoost)
            learn decision boundaries from labeled fraud examples. Isolation Forest detects statistical outliers purely based on
            feature density without ground-truth labels.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
            <div className="p-3 rounded-lg bg-ink-800/40 border border-white/[0.04]">
              <span className="text-slate-500">Contamination Setting: </span>
              <strong className="text-slate-200">0.002</strong>
            </div>
            <div className="p-3 rounded-lg bg-ink-800/40 border border-white/[0.04]">
              <span className="text-slate-500">Anomalies Flagged: </span>
              <strong className="text-slate-200">145 transactions</strong>
            </div>
            <div className="p-3 rounded-lg bg-ink-800/40 border border-white/[0.04]">
              <span className="text-slate-500">True Frauds Intercepted: </span>
              <strong className="text-emerald-400">30 / 98 (30.61% recall)</strong>
            </div>
          </div>
        </div>
      </Card>

      {/* Sample Held-Out Test Transactions */}
      <Card>
        <CardHeader
          title="Sample Held-Out Test Transactions"
          subtitle="50 sample transactions displayed for interactive inspection"
          icon={<Info className="w-4 h-4 text-brand-400" />}
        />
        <div className="p-4 space-y-3">
          <div className="p-3 rounded-lg bg-brand-500/10 border border-brand-500/20 text-xs text-slate-300 leading-relaxed">
            These {samples.length} transactions are a displayed sample from the held-out evaluation data.
            They are provided for interactive inspection and demonstration. Model evaluation is performed on the full held-out test split ({testSplitSize.toLocaleString()} transactions).
          </div>
          <div className="overflow-x-auto scrollbar-thin max-h-72">
            <table className="w-full text-xs text-left">
              <thead className="bg-ink-900/60 sticky top-0 text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2.5">Row</th>
                  <th className="px-3 py-2.5">Amount</th>
                  <th className="px-3 py-2.5">Time (s)</th>
                  <th className="px-3 py-2.5">Ground Truth</th>
                  <th className="px-3 py-2.5">PCA Sample (V1, V2, V14)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {samples.map((s, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02]">
                    <td className="px-3 py-2 font-mono text-slate-400">#{idx + 1}</td>
                    <td className="px-3 py-2 font-bold text-slate-200">${Number(s.Amount).toFixed(2)}</td>
                    <td className="px-3 py-2 font-mono text-slate-400">{Number(s.Time).toFixed(0)}</td>
                    <td className="px-3 py-2">
                      {s.Class === 1 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                          Class 1 (Fraud)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Class 0 (Legit)
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-400">
                      V1: {Number(s.V1 || 0).toFixed(2)}, V2: {Number(s.V2 || 0).toFixed(2)}, V14: {Number(s.V14 || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Live Performance on Uploaded Dataset */}
      <Card className="border-cyan-500/20">
        <CardHeader
          title="Performance on Uploaded Dataset (Non-Training Input)"
          subtitle="Measured results computed dynamically on transactions uploaded through Batch Analysis"
          icon={<FileSpreadsheet className="w-4 h-4 text-cyan-400" />}
        />
        {uploadedStats ? (
          uploadedStats.hasGt ? (
            <div className="space-y-4 p-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MiniMetric label="Accuracy" value={`${uploadedStats.acc}%`} />
                <MiniMetric label="Precision" value={`${uploadedStats.prec}%`} highlight />
                <MiniMetric label="Recall" value={`${uploadedStats.rec}%`} highlight />
                <MiniMetric label="F1-Score" value={`${uploadedStats.f1}%`} highlight />
              </div>
              <div className="p-4 rounded-xl bg-ink-800/40 border border-white/[0.04]">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">
                  Confusion Matrix on Uploaded Data ({uploadedStats.total} transactions)
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono text-xs">
                  <div className="p-2 rounded bg-ink-900/60 border border-white/[0.02]">
                    <span className="text-slate-500">True Positives (TP): </span>
                    <strong className="text-emerald-400">{uploadedStats.tp}</strong>
                  </div>
                  <div className="p-2 rounded bg-ink-900/60 border border-white/[0.02]">
                    <span className="text-slate-500">False Positives (FP): </span>
                    <strong className="text-amber-400">{uploadedStats.fp}</strong>
                  </div>
                  <div className="p-2 rounded bg-ink-900/60 border border-white/[0.02]">
                    <span className="text-slate-500">False Negatives (FN): </span>
                    <strong className="text-red-400">{uploadedStats.fn}</strong>
                  </div>
                  <div className="p-2 rounded bg-ink-900/60 border border-white/[0.02]">
                    <span className="text-slate-500">True Negatives (TN): </span>
                    <strong className="text-emerald-400">{uploadedStats.tn}</strong>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4">
              <MiniMetric label="Transactions Scored" value={`${uploadedStats.total}`} />
              <MiniMetric label="Fraud Rate" value={`${uploadedStats.rate}%`} highlight />
              <MiniMetric label="Average Risk Score" value={`${uploadedStats.avgScore} / 100`} />
            </div>
          )
        ) : (
          <p className="text-xs text-slate-500 p-4">
            No dataset has been uploaded yet. Upload a CSV file in the <strong>&ldquo;Batch Analysis&rdquo;</strong> section to view live performance metrics on your new data.
          </p>
        )}
      </Card>
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
        'p-3 rounded-lg border text-center',
        highlight ? 'bg-brand-500/10 border-brand-500/30' : 'bg-ink-800/50 border-white/[0.04]'
      )}
    >
      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{label}</p>
      <p className={cn('text-base font-bold mt-0.5', highlight ? 'text-brand-400' : 'text-slate-200')}>
        {value}
      </p>
    </div>
  );
}
