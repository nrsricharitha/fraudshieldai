import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Transaction, FraudAlert, KPIData, RiskLevel } from '@/types';

export function riskScoreToLevel(score: number): RiskLevel {
  if (score <= 30) return 'Low';
  if (score <= 70) return 'Medium';
  return 'High';
}

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getTransactions().then((data) => {
      setTransactions(data);
      setLoading(false);
    });
  }, []);

  const adjusted = transactions.map((t) => ({
    ...t,
    riskLevel: riskScoreToLevel(t.riskScore),
  }));

  return { transactions: adjusted, loading, refresh: () => api.getTransactions().then(setTransactions) };
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAlerts().then((data) => {
      setAlerts(data);
      setLoading(false);
    });
  }, []);

  return { alerts, setAlerts, loading };
}

export function useKPIs() {
  const [kpis, setKPIs] = useState<KPIData | null>(null);
  useEffect(() => {
    api.getKPIs().then(setKPIs);
  }, []);
  return kpis;
}
