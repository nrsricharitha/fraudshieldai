import { useState } from 'react';
import { UploadCloud, Download, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { RiskBadge, PredictionBadge } from '@/components/ui/Badge';
import { useApp } from '@/context/AppContext';
import { api } from '@/lib/api';
import type { PageKey } from '@/types';

export function UploadDatasetPage({
  onNavigate,
  onBatchProcessed,
}: {
  onNavigate: (p: PageKey) => void;
  onBatchProcessed?: (data: any) => void;
}) {
  const { addToast } = useApp();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [batchResult, setBatchResult] = useState<any | null>(() => {
    const saved = localStorage.getItem('fs_uploaded_batch');
    return saved ? JSON.parse(saved) : null;
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleProcess = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const data = await api.batchPredictCsv(file);
      setBatchResult(data);
      localStorage.setItem('fs_uploaded_batch', JSON.stringify(data));
      onBatchProcessed?.(data);
      addToast({
        type: 'success',
        title: 'Batch Analysis Complete',
        message: `Processed ${data.total_processed} transactions. Detected ${data.fraud_detected} frauds.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Processing Failed',
        message: err.message || 'Error processing CSV file.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSample = async () => {
    try {
      const { samples } = await api.getSampleTransactions(50);
      if (!samples || samples.length === 0) return;
      const headers = Object.keys(samples[0]).join(',');
      const rows = samples.map((s) => Object.values(s).join(',')).join('\n');
      const csvContent = `data:text/csv;charset=utf-8,${headers}\n${rows}`;
      const encoded = encodeURI(csvContent);
      const a = document.createElement('a');
      a.href = encoded;
      a.download = 'test_samples_12.csv';
      a.click();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Download failed', message: err.message });
    }
  };

  const handleExport = () => {
    if (!batchResult?.results) return;
    const items = batchResult.results;
    const headers = Object.keys(items[0]).join(',');
    const rows = items.map((it: any) => Object.values(it).map((v) => `"${v}"`).join(',')).join('\n');
    const csvContent = `data:text/csv;charset=utf-8,${headers}\n${rows}`;
    const encoded = encodeURI(csvContent);
    const a = document.createElement('a');
    a.href = encoded;
    a.download = `scored_dataset_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Upload New Dataset</h1>
          <p className="text-sm text-slate-500 mt-1">
            Score new transactions through the production XGBoost and Isolation Forest pipelines.
          </p>
        </div>
        <Button variant="outline" size="sm" icon={<Download className="w-4 h-4" />} onClick={handleDownloadSample}>
          Download Test Sample CSV
        </Button>
      </div>

      {/* Upload Dropzone */}
      <Card>
        <CardHeader
          title="CSV Dataset Upload"
          subtitle="File must include Time, Amount, and PCA numerical columns V1 to V28"
          icon={<UploadCloud className="w-4 h-4" />}
        />
        <div className="p-8 border-2 border-dashed border-white/[0.08] hover:border-brand-500/40 rounded-xl transition-colors text-center bg-ink-900/40">
          <input
            type="file"
            accept=".csv"
            id="new-dataset-file"
            onChange={handleFileChange}
            className="hidden"
          />
          <label htmlFor="new-dataset-file" className="cursor-pointer block">
            <UploadCloud className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-200">
              {file ? file.name : 'Click to select CSV file or drag and drop here'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Supports standard transaction formats (with or without Class ground truth).
            </p>
          </label>

          {file && (
            <div className="mt-5 flex items-center justify-center gap-3">
              <span className="text-xs text-brand-400 font-mono">
                {(file.size / 1024).toFixed(1)} KB selected
              </span>
              <Button
                variant="primary"
                size="sm"
                icon={<ArrowRight className="w-4 h-4" />}
                onClick={handleProcess}
                disabled={loading}
              >
                {loading ? 'Scoring Dataset...' : 'Run Real ML Batch Scoring'}
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Scored Results */}
      {batchResult && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-ink-800/40 border border-white/[0.06]">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Processed</p>
              <p className="text-2xl font-bold text-slate-100 mt-1">{batchResult.total_processed}</p>
            </div>
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-xs text-red-400 uppercase tracking-wider">Frauds Flagged</p>
              <p className="text-2xl font-bold text-red-400 mt-1">{batchResult.fraud_detected}</p>
            </div>
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-xs text-amber-400 uppercase tracking-wider">High Risk Alerts</p>
              <p className="text-2xl font-bold text-amber-400 mt-1">
                {batchResult.risk_breakdown?.high_risk ?? 0}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <p className="text-xs text-cyan-400 uppercase tracking-wider">Anomalies</p>
              <p className="text-2xl font-bold text-cyan-400 mt-1">{batchResult.anomalies_flagged}</p>
            </div>
          </div>

          <Card>
            <div className="flex flex-wrap items-center justify-between p-4 border-b border-white/[0.06] gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Scored Transactions</h3>
                <p className="text-xs text-slate-500">
                  Threshold: <span className="font-mono text-amber-400">{batchResult.threshold_used}</span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" icon={<Download className="w-4 h-4" />} onClick={handleExport}>
                  Export Scored CSV
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onNavigate('upload-reasons')}
                >
                  <span>Inspect Risk Reasons</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto scrollbar-thin max-h-96">
              <table className="w-full text-xs text-left">
                <thead className="bg-ink-900/60 sticky top-0 text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Tx ID</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Verdict</th>
                    <th className="px-4 py-3">Fraud Probability</th>
                    <th className="px-4 py-3">Risk Score</th>
                    <th className="px-4 py-3">Isolation Forest</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {batchResult.results?.map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-mono text-slate-300">{row.transaction_id}</td>
                      <td className="px-4 py-3 font-semibold text-slate-100">${Number(row.amount).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <PredictionBadge prediction={row.prediction === 1 ? 'Fraudulent' : 'Legitimate'} />
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-300">
                        {(row.probability * 100).toFixed(2)}%
                      </td>
                      <td className="px-4 py-3">
                        <RiskBadge level={row.risk_category?.replace(' Risk', '') || 'Low'} />
                        <span className="ml-2 text-slate-400">({row.risk_score}/100)</span>
                      </td>
                      <td className="px-4 py-3">
                        {row.is_anomaly ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Outlier
                          </span>
                        ) : (
                          <span className="text-slate-500">Normal</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
