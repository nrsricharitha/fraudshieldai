import { useState, useMemo } from 'react';
import { Bell, Search, Eye, ScanSearch, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAlerts } from '@/lib/hooks';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { RiskBadge, AlertStatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import type { FraudAlert, AlertStatus, PageKey } from '@/types';

export function AlertsPage({
  viewTransaction,
}: {
  onNavigate: (p: PageKey) => void;
  viewTransaction: (id: string) => void;
}) {
  const { alerts, setAlerts, loading } = useAlerts();
  const { addToast } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selected, setSelected] = useState<FraudAlert | null>(null);

  const filtered = useMemo(() => {
    let result = [...alerts];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((a) => a.transactionId.toLowerCase().includes(q));
    }
    if (statusFilter !== 'all') {
      result = result.filter((a) => a.status === statusFilter);
    }
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [alerts, search, statusFilter]);

  const updateStatus = (id: string, status: AlertStatus) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    setSelected((prev) => (prev?.id === id ? { ...prev, status } : prev));
    addToast({
      type: status === 'Resolved' ? 'success' : 'info',
      title: `Alert ${status === 'Resolved' ? 'resolved' : 'updated'}`,
      message: `Alert ${id} marked as ${status}.`,
    });
  };

  const counts = useMemo(
    () => ({
      new: alerts.filter((a) => a.status === 'New').length,
      investigating: alerts.filter((a) => a.status === 'Investigating').length,
      resolved: alerts.filter((a) => a.status === 'Resolved').length,
    }),
    [alerts]
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Fraud Alerts Queue</h1>
          <p className="text-sm text-slate-500 mt-1">
            High-risk transactions identified by the real trained ML pipeline requiring analyst attention.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
            <AlertTriangle className="w-3 h-3" /> {counts.new} New
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ScanSearch className="w-3 h-3" /> {counts.investigating} Investigating
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle className="w-3 h-3" /> {counts.resolved} Resolved
          </span>
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by transaction ID..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-ink-800/50 border border-white/[0.06] rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand-500/40"
            />
          </div>
          <div className="flex items-center gap-1 bg-ink-800/50 rounded-lg p-1">
            {['all', 'New', 'Investigating', 'Resolved'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                  statusFilter === s ? 'bg-brand-500/15 text-brand-400' : 'text-slate-400 hover:text-slate-200'
                )}
              >
                {s === 'all' ? 'All' : s}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 rounded-lg bg-ink-800/50 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400">No active alerts matching filter criteria.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  'rounded-xl p-4 border transition-all',
                  alert.status === 'New'
                    ? 'bg-red-500/[0.04] border-red-500/15 hover:border-red-500/30'
                    : alert.status === 'Investigating'
                    ? 'bg-amber-500/[0.04] border-amber-500/15 hover:border-amber-500/30'
                    : 'bg-ink-800/30 border-white/[0.04]'
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'p-2 rounded-lg',
                        alert.status === 'New'
                          ? 'bg-red-500/15 text-red-400'
                          : alert.status === 'Investigating'
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-emerald-500/15 text-emerald-400'
                      )}
                    >
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-semibold text-slate-100">{alert.id}</span>
                        <AlertStatusBadge status={alert.status} />
                        <RiskBadge level={alert.riskLevel} />
                      </div>
                      <p className="text-xs text-slate-400">
                        Transaction <span className="font-mono text-slate-300 font-semibold">{alert.transactionId}</span> · Amount: ${alert.amount.toFixed(2)}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {alert.reasons.map((r, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded text-[10px] bg-ink-700/50 text-slate-400 border border-white/[0.04]"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-600 mt-2">
                        Risk Score: {alert.riskScore}/100 · Model Probability: {(alert.probability * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Eye className="w-3.5 h-3.5" />}
                      onClick={() => setSelected(alert)}
                    >
                      View
                    </Button>
                    {alert.status === 'New' && (
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<ScanSearch className="w-3.5 h-3.5" />}
                        onClick={() => updateStatus(alert.id, 'Investigating')}
                      >
                        Investigate
                      </Button>
                    )}
                    {alert.status !== 'Resolved' && (
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<CheckCircle className="w-3.5 h-3.5" />}
                        onClick={() => updateStatus(alert.id, 'Resolved')}
                      >
                        Resolve
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Alert Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Alert Details" size="md">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-red-500/15 text-red-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-100">{selected.id}</p>
                <p className="text-xs text-slate-500">Flagged by Production XGBoost Model</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-3xl font-bold text-red-400">{selected.riskScore}</p>
                <p className="text-[10px] text-slate-500">Risk Score (0-100)</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <InfoRow label="Transaction ID" value={selected.transactionId} />
              <InfoRow label="Amount" value={`$${selected.amount.toFixed(2)}`} />
              <InfoRow label="Fraud Probability" value={`${(selected.probability * 100).toFixed(2)}%`} />
              <InfoRow label="Status" value={selected.status} />
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Detection Signals
              </p>
              <ul className="space-y-2">
                {selected.reasons.map((r, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => {
                  viewTransaction(selected.transactionId);
                  setSelected(null);
                }}
              >
                Inspect Full Feature Vector
              </Button>
              {selected.status !== 'Resolved' && (
                <Button variant="outline" onClick={() => updateStatus(selected.id, 'Resolved')}>
                  Resolve
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg bg-ink-800/40">
      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">{label}</p>
      <p className="text-sm text-slate-200 font-medium mt-0.5">{value}</p>
    </div>
  );
}
