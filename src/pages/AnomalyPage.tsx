import { useState, useEffect, useMemo } from 'react';
import { ScatterChart as ScatterIcon, Info, AlertTriangle, ShieldCheck } from 'lucide-react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { api } from '@/lib/api';
import { Card, CardHeader } from '@/components/ui/Card';
import type { Transaction } from '@/types';

export function AnomalyPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [modelInfo, setModelInfo] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getTransactions(), api.getModelInfo()]).then(([txs, info]) => {
      setTransactions(txs);
      setModelInfo(info);
      setLoading(false);
    });
  }, []);

  const { normalData, anomalousData } = useMemo(() => {
    const norm: { x: number; y: number; id: string; amount: number }[] = [];
    const anom: { x: number; y: number; id: string; amount: number }[] = [];

    transactions.forEach((t) => {
      const hour = Math.round(((t.Time / 3600) % 24) * 10) / 10;
      const point = {
        x: hour,
        y: Math.min(2500, Math.round(t.Amount * 100) / 100),
        id: t.transactionId,
        amount: t.Amount,
      };
      if (t.anomaly) {
        anom.push(point);
      } else {
        norm.push(point);
      }
    });

    return { normalData: norm, anomalousData: anom };
  }, [transactions]);

  const isoMeta = modelInfo?.anomaly_detection_metrics;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Unsupervised Anomaly Detection</h1>
        <p className="text-sm text-slate-500 mt-1">
          Isolation Forest model isolating atypical feature densities without relying on fraud labels.
        </p>
      </div>

      {/* Advisory Callout */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-200 leading-relaxed">
          <strong className="font-semibold text-amber-300">Important Operational Distinction:</strong>{' '}
          Supervised fraud classification learns decision boundaries from labeled fraud examples. Anomaly
          detection identifies statistical outliers that deviate from normal baseline behavior without
          prior fraud labeling. An anomaly is <strong>not guaranteed fraud</strong>; it represents an{' '}
          <em>&ldquo;Anomalous transaction detected — further investigation recommended.&rdquo;</em>
        </div>
      </div>

      {/* Isolation Forest Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-emerald-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                Normal Profile
              </p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">
                {transactions.length > 0
                  ? (((transactions.length - anomalousData.length) / transactions.length) * 100).toFixed(1)
                  : '99.8'}
                %
              </p>
              <p className="text-xs text-slate-500 mt-1">{normalData.length} analyzed transactions</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="border-amber-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                Flagged Outliers
              </p>
              <p className="text-2xl font-bold text-amber-400 mt-1">{anomalousData.length}</p>
              <p className="text-xs text-slate-500 mt-1">Isolation Forest candidates</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="border-cyan-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                Contamination Factor
              </p>
              <p className="text-2xl font-bold text-cyan-400 mt-1">0.002</p>
              <p className="text-xs text-slate-500 mt-1">Outlier prior (~0.2% expected rate)</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
              <Info className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Real Scatter Plot */}
      <Card>
        <CardHeader
          title="Transaction Distribution: Hour of Day vs Amount ($)"
          subtitle="Genuine transactions scored by Isolation Forest — Outliers highlighted in amber"
          icon={<ScatterIcon className="w-4 h-4 text-brand-400" />}
        />
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2330" />
              <XAxis
                type="number"
                dataKey="x"
                name="Hour"
                domain={[0, 24]}
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickFormatter={(v) => `${v}:00`}
                axisLine={false}
                tickLine={false}
                label={{ value: 'Hour of Day (24h)', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 11 }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Amount"
                domain={[0, 'auto']}
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${v}`}
                label={{ value: 'Amount ($)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }}
              />
              <Tooltip
                content={({ payload }) => {
                  if (!payload || payload.length === 0) return null;
                  const pt = payload[0].payload;
                  return (
                    <div className="p-2.5 rounded-lg bg-ink-900 border border-white/[0.08] text-xs">
                      <p className="font-mono text-brand-400 font-semibold">{pt.id}</p>
                      <p className="text-slate-300 mt-1">Hour: {pt.x}:00</p>
                      <p className="text-slate-300">Amount: ${pt.amount?.toFixed(2)}</p>
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Scatter name="Normal Transactions" data={normalData} fill="#22c55e" opacity={0.6} />
              <Scatter name="Anomalous Transactions" data={anomalousData} fill="#f59e0b" shape="triangle" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
