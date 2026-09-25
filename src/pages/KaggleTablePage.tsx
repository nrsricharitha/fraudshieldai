import { useState } from 'react';
import { Download, Receipt, ArrowRight } from 'lucide-react';
import { useTransactions } from '@/lib/hooks';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TransactionTable } from '@/components/TransactionTable';
import type { Transaction, PageKey } from '@/types';

export function KaggleTablePage({
  onNavigate,
  viewTransaction,
}: {
  onNavigate: (p: PageKey) => void;
  viewTransaction: (id: string) => void;
}) {
  const { transactions, loading } = useTransactions();

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
    a.download = `kaggle_50_test_transactions_${Date.now()}.csv`;
    a.click();
  };

  const fraudCount = transactions.filter((t) => t.prediction === 'Fraudulent').length;
  const highRiskCount = transactions.filter((t) => t.riskLevel === 'High').length;
  const anomCount = transactions.filter((t) => t.anomaly).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Kaggle 50 Transactions</h1>
          <p className="text-sm text-slate-500 mt-1">
            Held-out benchmark transactions scored through the trained XGBoost & Isolation Forest pipelines.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" icon={<Download className="w-4 h-4" />} onClick={handleExport}>
            Export CSV
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigate('kaggle-reasons')}
          >
            <span>View Risk Reasons</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-ink-800/40 border border-white/[0.06]">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Total Scored</p>
          <p className="text-2xl font-bold text-slate-100 mt-1">{transactions.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-xs text-red-400 uppercase tracking-wider">Frauds Flagged</p>
          <p className="text-2xl font-bold text-red-400 mt-1">{fraudCount}</p>
        </div>
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <p className="text-xs text-amber-400 uppercase tracking-wider">High Risk Alerts</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">{highRiskCount}</p>
        </div>
        <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
          <p className="text-xs text-cyan-400 uppercase tracking-wider">Anomalies</p>
          <p className="text-2xl font-bold text-cyan-400 mt-1">{anomCount}</p>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader
          title="Kaggle Test Split Transactions"
          subtitle="Click on any transaction to inspect its detailed feature vector or switch to Tab 2 for SHAP reasons."
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
            pageSize={10}
          />
        )}
      </Card>
    </div>
  );
}
