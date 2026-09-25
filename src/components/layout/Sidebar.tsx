import { X } from 'lucide-react';
import * as Icons from 'lucide-react';
import { cn } from '@/lib/utils';
import { LogoWordmark } from '@/components/Logo';
import type { PageKey } from '@/types';

interface NavItem {
  key: PageKey;
  label: string;
  icon: string;
  group: string;
}

export function Sidebar({
  items,
  currentPage,
  onNavigate,
  open,
  onClose,
}: {
  items: NavItem[];
  currentPage: PageKey;
  onNavigate: (p: PageKey) => void;
  open: boolean;
  onClose: () => void;
}) {
  const groups = [...new Set(items.map((i) => i.group))];

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onClose} />}
      <aside
        className={cn(
          'fixed left-0 top-0 bottom-0 w-64 z-40 glass border-r border-white/[0.06] flex flex-col transition-transform duration-300',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/[0.04]">
          <LogoWordmark size="sm" />
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-5">
          {groups.map((group) => (
            <div key={group}>
              <p className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold px-3 mb-2">{group}</p>
              <div className="space-y-1">
                {items
                  .filter((i) => i.group === group)
                  .map((item) => {
                    const Icon = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[
                      item.icon
                    ] || Icons.Circle;
                    const active = currentPage === item.key;
                    return (
                      <button
                        key={item.key}
                        onClick={() => onNavigate(item.key)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                          active
                            ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                            : 'text-slate-400 hover:text-slate-100 hover:bg-white/5 border border-transparent'
                        )}
                      >
                        <Icon className={cn('w-4 h-4', active && 'text-brand-400')} />
                        {item.label}
                        {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-400" />}
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-white/[0.04]">
          <div className="glass-soft rounded-lg p-3 border border-emerald-500/20 bg-emerald-500/5">
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Real ML Pipeline Active</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">XGBoost & Isolation Forest</p>
            <p className="text-[9px] text-slate-500 mt-0.5 font-mono">Trained on Kaggle 284k dataset</p>
          </div>
        </div>
      </aside>
    </>
  );
}
