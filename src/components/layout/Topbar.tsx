import { useState, useEffect } from 'react';
import { Sun, Moon, CheckCircle2, Table, Lightbulb, UploadCloud, Search, Brain } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { PageKey } from '@/types';

interface TopbarProps {
  currentPage: PageKey;
  onNavigate: (page: PageKey) => void;
}

const NAV_ITEMS: { key: PageKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'kaggle-table', label: '1. Kaggle 50 Table', icon: Table },
  { key: 'kaggle-reasons', label: '2. Kaggle Risk Reasons', icon: Lightbulb },
  { key: 'upload-dataset', label: '3. Upload New Dataset', icon: UploadCloud },
  { key: 'upload-reasons', label: '4. New Dataset Risk Analysis', icon: Search },
  { key: 'model-performance', label: '5. Model Performance', icon: Brain },
];

export function Topbar({ currentPage, onNavigate }: TopbarProps) {
  const { theme, toggleTheme } = useApp();
  const [modelInfo, setModelInfo] = useState<{ model: string; threshold: number; status: string }>({
    model: 'XGBoost',
    threshold: 0.85,
    status: 'Connected',
  });

  useEffect(() => {
    api
      .getHealth()
      .then((h) => {
        setModelInfo({
          model: h.model_name || 'XGBoost',
          threshold: h.decision_threshold || 0.85,
          status: 'Connected',
        });
      })
      .catch(() => {
        setModelInfo({
          model: 'XGBoost',
          threshold: 0.85,
          status: 'Standby',
        });
      });
  }, []);

  return (
    <header className="sticky top-0 z-30 glass border-b border-white/[0.06] backdrop-blur-md">
      {/* Top Line: Brand & Connection Status */}
      <div className="px-4 lg:px-8 py-2.5 flex items-center justify-between border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-slate-100 tracking-tight">FraudShield AI</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-brand-500/15 text-brand-400 border border-brand-500/25">
              Production ML
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-3 px-3 py-1 rounded-lg bg-ink-800/70 border border-white/[0.04] text-xs">
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>FastAPI {modelInfo.status}</span>
            </div>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300">
              Model: <strong className="text-brand-400">{modelInfo.model}</strong>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300">
              Threshold: <strong className="text-amber-400 font-mono">{modelInfo.threshold}</strong>
            </span>
          </div>

          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-slate-100 transition-colors"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Top Navigation Bar (Horizontal Tabs) */}
      <div className="px-4 lg:px-8 py-2 overflow-x-auto scrollbar-none flex items-center gap-2 bg-ink-900/40">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = currentPage === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={cn(
                'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border',
                active
                  ? 'bg-brand-500/15 text-brand-400 border-brand-500/30 shadow-sm shadow-brand-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border-transparent'
              )}
            >
              <Icon className={cn('w-3.5 h-3.5', active ? 'text-brand-400' : 'text-slate-500')} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
}
