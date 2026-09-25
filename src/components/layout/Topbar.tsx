import { useState, useEffect } from 'react';
import { Menu, Sun, Moon, Shield, CheckCircle2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { api } from '@/lib/api';

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
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
          status: 'Offline / Standby',
        });
      });
  }, []);

  return (
    <header className="sticky top-0 z-20 glass border-b border-white/[0.04] px-4 lg:px-6 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={onMenuClick} className="lg:hidden p-2 rounded-lg hover:bg-white/5 text-slate-400">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-200">FraudShield AI</span>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[11px] font-mono bg-brand-500/10 text-brand-400 border border-brand-500/20">
              v2.0 Real ML
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-ink-800/60 border border-white/[0.05] text-xs">
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>FastAPI {modelInfo.status}</span>
            </div>
            <span className="text-slate-600">|</span>
            <div className="text-slate-300">
              <span className="text-slate-500">Model: </span>
              <span className="font-semibold text-brand-400">{modelInfo.model}</span>
            </div>
            <span className="text-slate-600">|</span>
            <div className="text-slate-300">
              <span className="text-slate-500">Threshold: </span>
              <span className="font-mono text-amber-400">{modelInfo.threshold}</span>
            </div>
          </div>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-slate-100 transition-colors"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}
