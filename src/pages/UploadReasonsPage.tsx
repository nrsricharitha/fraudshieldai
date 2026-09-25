import { useState, useEffect } from 'react';
import { Lightbulb, AlertTriangle, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { RiskBadge, PredictionBadge } from '@/components/ui/Badge';
import { RiskGauge } from '@/components/ui/RiskGauge';
import { api } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import type { PageKey } from '@/types';

export function UploadReasonsPage({ onNavigate }: { onNavigate: (p: PageKey) => void }) {
  const { addToast } = useApp();
  const [batchData, setBatchData] = useState<any | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('fs_uploaded_batch');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setBatchData(parsed);
        if (parsed.results && parsed.results.length > 0) {
          evaluateRow(parsed.results[0]);
        }
      } catch {}
    }
  }, []);

  const evaluateRow = async (rowItem: any) => {
    setAnalyzing(true);
    try {
      const payload = {
        Time: Number(rowItem.time ?? 0),
        Amount: Number(rowItem.amount ?? 0),
        ...(rowItem.rawFeatures || {}),
      };
      const res = await api.predictTransaction(payload);
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
    if (batchData?.results?.[idx]) {
      evaluateRow(batchData.results[idx]);
    }
  };

  if (!batchData || !batchData.results || batchData.results.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in text-center py-16">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-100">No Uploaded Dataset Available</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
          Please upload a CSV file in the <strong>&ldquo;Upload New Dataset&rdquo;</strong> tab first to inspect risk reasons for each transaction.
        </p>
        <Button variant="primary" className="mt-4" onClick={() => onNavigate('upload-dataset')}>
          Go to Upload New Dataset
        </Button>
      </div>
    );
  }

  const currRow = batchData.results[selectedIdx] || {};

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">New Dataset Risk Analysis</h1>
        <p className="text-sm text-slate-500 mt-1">
          Examine specific risk reasons and SHAP factors for any transaction in your uploaded dataset.
        </p>
      </div>

      {/* Selector */}
      <Card>
        <div className="flex flex-wrap items-center gap-4 p-2">
          <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Select Uploaded Transaction:
          </label>
          <select
            className="flex-1 bg-ink-800 text-sm text-slate-200 border border-white/[0.1] rounded-lg px-4 py-2 focus:outline-none focus:border-brand-500"
            value={selectedIdx}
            onChange={handleSelect}
          >
            {batchData.results.map((r: any, idx: number) => (
              <option key={idx} value={idx}>
                #{idx + 1} [{r.transaction_id}] — ${Number(r.amount).toFixed(2)} | Verdict: {r.label} | Risk Score: {r.risk_score}/100
              </option>
            ))}
          </select>
          <Button
            variant="primary"
            size="sm"
            icon={<Sparkles className="w-4 h-4" />}
            onClick={() => evaluateRow(currRow)}
            disabled={analyzing}
          >
            {analyzing ? 'Computing SHAP...' : 'Re-Evaluate'}
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
                Threshold: <span className="font-mono text-amber-400 font-bold">{result.threshold_used}</span>
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
                      ⚠️ Statistical Outlier
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
              title="Why Was This Uploaded Transaction Flagged / Approved?"
              subtitle="SHAP feature attributions computed directly for this row"
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
                      <th className="px-4 py-3 font-semibold">Reasoning</th>
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
              <p className="text-xs text-slate-500 p-4">No SHAP explanations available for this row.</p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
