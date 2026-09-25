import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { cn } from '@/lib/utils';

export function ToastContainer() {
  const { toasts, dismissToast } = useApp();
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => {
        const icons = { success: CheckCircle2, error: AlertCircle, info: Info, warning: AlertTriangle };
        const colors = { success: 'text-emerald-400', error: 'text-red-400', info: 'text-brand-400', warning: 'text-amber-400' };
        const Icon = icons[t.type];
        return (
          <div key={t.id} className="glass rounded-lg p-4 flex items-start gap-3 animate-slide-in-right min-w-[280px]">
            <Icon className={cn('w-5 h-5 mt-0.5 flex-shrink-0', colors[t.type])} />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-100">{t.title}</p>
              {t.message && <p className="text-xs text-slate-400 mt-0.5">{t.message}</p>}
            </div>
            <button onClick={() => dismissToast(t.id)} className="text-slate-500 hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
