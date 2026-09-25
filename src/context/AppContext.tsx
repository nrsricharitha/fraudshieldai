import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}

interface AppState {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  highRiskThreshold: number;
  setHighRiskThreshold: (v: number) => void;
  toasts: Toast[];
  addToast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
  apiConnected: boolean;
  setApiConnected: (v: boolean) => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [highRiskThreshold, setHighRiskThresholdState] = useState<number>(85); // 0.85 optimal threshold from XGBoost
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [apiConnected, setApiConnected] = useState<boolean>(true);

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const toggleTheme = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);

  const setHighRiskThreshold = useCallback((v: number) => {
    setHighRiskThresholdState(v);
  }, []);

  const addToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4000);
  }, []);

  const dismissToast = useCallback((id: string) => setToasts((prev) => prev.filter((x) => x.id !== id)), []);

  return (
    <AppContext.Provider
      value={{
        theme,
        toggleTheme,
        highRiskThreshold,
        setHighRiskThreshold,
        toasts,
        addToast,
        dismissToast,
        apiConnected,
        setApiConnected,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
