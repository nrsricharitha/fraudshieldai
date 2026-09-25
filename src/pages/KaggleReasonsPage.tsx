import { useState, useEffect } from 'react';
import { Brain, Sparkles, AlertTriangle, ShieldCheck, TrendingUp, Lightbulb } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { RiskBadge, PredictionBadge } from '@/components/ui/Badge';
import { RiskGauge } from '@/components/ui/RiskGauge';
import { api } from '@/lib/api';
import { useApp } from '@/context/AppContext';

export function KaggleReasonsPage() {
  const { addToast } = useApp();
  const [samples, setSamples] = useState<any[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  useEffect(() => {
    api.getSampleTransactions(50).then((res) => {
      if (res.samples && res.samples.length > 0) {
        setSamples(res.samples);
        evaluateSample(res.samples[0]);
      }
    });
  }, []);

  const evaluateSample = async (sampleData: any) => {
    setAnalyzing(true);
    try {
      const res = await api.predictTransaction(sampleData);
      setResult(res);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Analysis error', message: err.message });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const idx = parseInt(e.target.value, 10);
    setSelectedIdx(idx);
    if (samples[idx]) {
      evaluateSample(samples[idx]);
    }
  };

  const currSample = samples[selectedIdx] || {};

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Kaggle Transaction Risk Reasons</h1>
        <p className="text-sm text-slate-500 mt-1">
          Detailed SHAP feature attributions and risk explanations for transactions from the Kaggle evaluation dataset.
        </p>
      </div>

      {/* Selector */}
      <Card>
        <div className="flex flex-wrap items-center gap-4 p-2">
          <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Select Kaggle Transaction:
          </label>
          <select
            className="flex-1 bg-ink-800 text-sm text-slate-200 border border-white/[0.1] rounded-lg px-4 py-2 focus:outline-none focus:border-brand-500"
            value={selectedIdx}
            onChange={handleSelect}
          >
            {samples.map((s, idx) => (
              <option key={idx} value={idx}>
                Sample #{idx + 1} — Amount: ${Number(s.Amount).toFixed(2)} | Time: {Number(s.Time).toFixed(0)}s | Ground Truth:{' '}
                {s.Class === 1 ? 'FRAUD' : 'Legitimate'}
              </option>
            ))}
          </select>
          <Button
            variant="primary"
            size="sm"
            icon={<Sparkles className="w-4 h-4" />}
            onClick={() => evaluateSample(currSample)}
            disabled={analyzing}
          >
            {analyzing ? 'Calculating SHAP...' : 'Re-Evaluate'}
          </Button>
        </div>
      </Card>

      {/* Result Cards */}
      {result && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl bg-ink-900/60 border border-white/[0.06] flex flex-col justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Model Verdict</p>
                <div className="mt-2 flex items-center gap-3">
                  <PredictionBadge
                    prediction={result.prediction === 1 ? 'Fraudulent' : 'Legitimate'}
                  />
                  <span className="text-sm font-mono text-slate-200">
                    {(result.probability * 100).toFixed(2)}% probability
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-4">
                Decision Threshold Applied: <span className="font-mono text-amber-400 font-bold">{result.threshold_used}</span>
              </p>
            </div>

            <div className="p-5 rounded-xl bg-ink-900/60 border border-white/[0.06] flex items-center gap-4">
              <RiskGauge score={result.risk_score} size="md" />
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Risk Rating</p>
                <p className="text-lg font-bold text-slate-100 mt-0.5">{result.risk_category}</p>
                <p className="text-[11px] text-slate-400 mt-1">{result.risk_score} / 100</p>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-ink-900/60 border border-white/[0.06] flex flex-col justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                  Isolation Forest (Anomaly)
                </p>
                <div className="mt-2">
                  {result.anomaly_detection?.is_anomaly ? (
                    <span className="px-2.5 py-1 rounded text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      ⚠️ Outlier Detected
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      ✓ Normal Density
                    </span>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
                {result.anomaly_detection?.message}
              </p>
            </div>
          </div>

          {/* Detailed SHAP Explanations Table */}
          <Card>
            <CardHeader
              title="Specific Risk Reasons (SHAP Feature Attributions)"
              subtitle="Calculated by SHAP TreeExplainer from the production XGBoost model"
              icon={<Lightbulb className="w-4 h-4 text-amber-400" />}
            />
            {result.top_contributing_factors?.length > 0 ? (
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-slate-500 uppercase tracking-wider">
                      <th className="px-4 py-3 font-semibold">Feature</th>
                      <th className="px-4 py-3 font-semibold text-right">SHAP Impact</th>
                      <th className="px-4 py-3 font-semibold">Risk Direction</th>
                      <th className="px-4 py-3 font-semibold">Explanation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {result.top_contributing_factors.map((f: any, idx: number) => (
                      <tr key={idx} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3 font-mono font-bold text-brand-400">{f.feature}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold">
                          <span className={f.direction === 'increases_risk' ? 'text-red-400' : 'text-emerald-400'}>
                            {f.shap_value > 0 ? `+${f.shap_value.toFixed(4)}` : f.shap_value.toFixed(4)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              f.direction === 'increases_risk'
                                ? 'bg-red-500/10 text-red-400'
                                : 'bg-emerald-500/10 text-emerald-400'
                            }`}
                          >
                            {f.direction === 'increases_risk' ? 'Increases Risk (+)' : 'Reduces Risk (-)'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300">{f.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-500 p-4">No SHAP explanations returned.</p>
            )}
          </Card>

          {/* Raw Features Inspector */}
          <Card>
            <CardHeader
              title="Full Input Feature Vector"
              subtitle="Amount, Time, and PCA components (V1 to V28) for this transaction"
              icon={<TrendingUp className="w-4 h-4" />}
            />
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 p-1">
              <div className="p-2 rounded bg-ink-800/40 border border-white/[0.04] text-center">
                <p className="text-[10px] font-mono text-slate-500">Amount</p>
                <p className="text-xs font-mono font-bold text-slate-100">${Number(currSample.Amount).toFixed(2)}</p>
              </div>
              <div className="p-2 rounded bg-ink-800/40 border border-white/[0.04] text-center">
                <p className="text-[10px] font-mono text-slate-500">Time (s)</p>
                <p className="text-xs font-mono font-bold text-slate-100">{Number(currSample.Time).toFixed(0)}s</p>
              </div>
              {Array.from({ length: 28 }, (_, i) => i + 1).map((n) => {
                const col = `V${n}`;
                const val = currSample[col];
                return (
                  <div key={col} className="p-2 rounded bg-ink-800/40 border border-white/[0.02] text-center">
                    <p className="text-[10px] font-mono text-slate-500">{col}</p>
                    <p className="text-xs font-mono text-slate-300">{val !== undefined ? Number(val).toFixed(3) : '-'}</p>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
