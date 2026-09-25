import { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  Search,
  Filter,
} from 'lucide-react';
import type { Transaction } from '@/types';
import { RiskBadge, PredictionBadge } from '@/components/ui/Badge';
import { RiskBar } from '@/components/ui/RiskGauge';
import { cn } from '@/lib/utils';

type SortField = 'transactionId' | 'Amount' | 'riskScore' | 'fraudProbability' | 'Time';
type SortDir = 'asc' | 'desc';

interface TransactionTableProps {
  transactions: Transaction[];
  onSelect?: (tx: Transaction) => void;
  pageSize?: number;
  showSearch?: boolean;
  showFilters?: boolean;
}

export function TransactionTable({
  transactions,
  onSelect,
  pageSize = 10,
  showSearch = true,
  showFilters = true,
}: TransactionTableProps) {
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('Amount');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let result = [...transactions];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.transactionId.toLowerCase().includes(q) ||
          t.Amount.toString().includes(q) ||
          t.prediction.toLowerCase().includes(q)
      );
    }
    if (riskFilter !== 'all') {
      result = result.filter((t) => t.riskLevel === riskFilter);
    }
    result.sort((a, b) => {
      const aV = a[sortField] ?? 0;
      const bV = b[sortField] ?? 0;
      return sortDir === 'asc' ? (aV as number) - (bV as number) : (bV as number) - (aV as number);
    });
    return result;
  }, [transactions, search, riskFilter, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const pageData = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="w-3 h-3 text-slate-600" />;
    return sortDir === 'asc' ? (
      <ChevronUp className="w-3 h-3 text-brand-400" />
    ) : (
      <ChevronDown className="w-3 h-3 text-brand-400" />
    );
  };

  return (
    <div className="space-y-4">
      {(showSearch || showFilters) && (
        <div className="flex flex-wrap items-center gap-3">
          {showSearch && (
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                placeholder="Search by transaction ID, amount, verdict..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-ink-800/50 border border-white/[0.06] rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand-500/40"
              />
            </div>
          )}
          {showFilters && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              {['all', 'Low', 'Medium', 'High'].map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setRiskFilter(r);
                    setPage(0);
                  }}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                    riskFilter === r
                      ? 'bg-brand-500/15 text-brand-400 border-brand-500/30'
                      : 'text-slate-400 border-white/[0.06] hover:bg-white/5'
                  )}
                >
                  {r === 'all' ? 'All Risk' : `${r} Risk`}
                </button>
              ))}
            </div>
          )}
          <div className="text-xs text-slate-500 ml-auto">{filtered.length} transactions</div>
        </div>
      )}

      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-white/[0.06] text-xs text-slate-500 uppercase tracking-wider">
              <th
                className="px-3 py-3 font-medium cursor-pointer select-none"
                onClick={() => toggleSort('transactionId')}
              >
                <div className="flex items-center gap-1.5">
                  TX ID <SortIcon field="transactionId" />
                </div>
              </th>
              <th
                className="px-3 py-3 font-medium cursor-pointer select-none"
                onClick={() => toggleSort('Amount')}
              >
                <div className="flex items-center gap-1.5">
                  Amount <SortIcon field="Amount" />
                </div>
              </th>
              <th
                className="px-3 py-3 font-medium cursor-pointer select-none hidden sm:table-cell"
                onClick={() => toggleSort('Time')}
              >
                <div className="flex items-center gap-1.5">
                  Hour <SortIcon field="Time" />
                </div>
              </th>
              <th
                className="px-3 py-3 font-medium cursor-pointer select-none"
                onClick={() => toggleSort('fraudProbability')}
              >
                <div className="flex items-center gap-1.5">
                  Probability <SortIcon field="fraudProbability" />
                </div>
              </th>
              <th
                className="px-3 py-3 font-medium cursor-pointer select-none"
                onClick={() => toggleSort('riskScore')}
              >
                <div className="flex items-center gap-1.5">
                  Risk Score <SortIcon field="riskScore" />
                </div>
              </th>
              <th className="px-3 py-3 font-medium">Risk Level</th>
              <th className="px-3 py-3 font-medium hidden md:table-cell">Isolation Forest</th>
              <th className="px-3 py-3 font-medium">Prediction</th>
              <th className="px-3 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {pageData.map((tx) => {
              const hour = ((tx.Time / 3600) % 24).toFixed(1);
              return (
                <tr
                  key={tx.transactionId}
                  className="hover:bg-white/[0.02] transition-colors cursor-pointer group"
                  onClick={() => onSelect?.(tx)}
                >
                  <td className="px-3 py-3 font-mono text-xs text-slate-300">{tx.transactionId}</td>
                  <td className="px-3 py-3 text-slate-100 font-semibold">${tx.Amount.toFixed(2)}</td>
                  <td className="px-3 py-3 text-slate-400 text-xs hidden sm:table-cell font-mono">
                    {hour}h
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        'text-xs font-mono font-medium',
                        tx.fraudProbability >= 0.7
                          ? 'text-red-400'
                          : tx.fraudProbability >= 0.3
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      )}
                    >
                      {(tx.fraudProbability * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2 min-w-[80px]">
                      <span className="text-xs font-semibold text-slate-200 w-6">{tx.riskScore}</span>
                      <RiskBar score={tx.riskScore} className="flex-1" />
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <RiskBadge level={tx.riskLevel} />
                  </td>
                  <td className="px-3 py-3 hidden md:table-cell">
                    {tx.anomaly ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Outlier
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">Normal</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <PredictionBadge prediction={tx.prediction} />
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className="text-xs text-brand-400 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                      Inspect →
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-500">
            Page {page + 1} of {totalPages} · {filtered.length} transactions
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-white/5 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={cn(
                  'w-8 h-8 rounded-lg text-xs font-medium transition-colors',
                  page === i ? 'bg-brand-500/15 text-brand-400' : 'text-slate-400 hover:bg-white/5'
                )}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-white/5 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
