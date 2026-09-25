import { useState } from 'react';
import { ToastContainer } from '@/components/ui/Toast';
import { Topbar } from '@/components/layout/Topbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { DashboardPage } from '@/pages/DashboardPage';
import { TransactionsPage } from '@/pages/TransactionsPage';
import { TransactionDetailPage } from '@/pages/TransactionDetailPage';
import { BatchPage } from '@/pages/BatchPage';
import { AlertsPage } from '@/pages/AlertsPage';
import { ModelInsightsPage } from '@/pages/ModelInsightsPage';
import { AnomalyPage } from '@/pages/AnomalyPage';
import type { PageKey } from '@/types';

const NAV_ITEMS: { key: PageKey; label: string; icon: string; group: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', group: 'Surveillance' },
  { key: 'transactions', label: 'Transaction Analysis', icon: 'Receipt', group: 'Detection' },
  { key: 'batch', label: 'Batch Analysis', icon: 'UploadCloud', group: 'Detection' },
  { key: 'alerts', label: 'Fraud Alerts', icon: 'Bell', group: 'Detection' },
  { key: 'model', label: 'Model Performance', icon: 'Brain', group: 'Intelligence' },
  { key: 'anomaly', label: 'Anomaly Detection', icon: 'ScatterChart', group: 'Intelligence' },
];

export function AppShell() {
  const [page, setPage] = useState<PageKey>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);

  const navigate = (p: PageKey) => {
    setPage(p);
    setSelectedTxId(null);
    setSidebarOpen(false);
  };

  const viewTransaction = (id: string) => {
    setSelectedTxId(id);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-ink-950 grid-bg">
      <Sidebar
        items={NAV_ITEMS}
        currentPage={page}
        onNavigate={navigate}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="lg:ml-64 flex flex-col min-h-screen">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 lg:p-6 scrollbar-thin">
          <PageRouter
            page={page}
            onNavigate={navigate}
            viewTransaction={viewTransaction}
            selectedTxId={selectedTxId}
            clearSelection={() => setSelectedTxId(null)}
          />
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}

interface PageRouterProps {
  page: PageKey;
  onNavigate: (p: PageKey) => void;
  viewTransaction: (id: string) => void;
  selectedTxId: string | null;
  clearSelection: () => void;
}

function PageRouter({ page, onNavigate, viewTransaction, selectedTxId, clearSelection }: PageRouterProps) {
  if (selectedTxId) {
    return (
      <TransactionDetailPage
        txId={selectedTxId}
        onBack={clearSelection}
        viewTransaction={viewTransaction}
      />
    );
  }

  switch (page) {
    case 'dashboard':
      return <DashboardPage onNavigate={onNavigate} viewTransaction={viewTransaction} />;
    case 'transactions':
      return <TransactionsPage viewTransaction={viewTransaction} />;
    case 'batch':
      return <BatchPage />;
    case 'alerts':
      return <AlertsPage onNavigate={onNavigate} viewTransaction={viewTransaction} />;
    case 'model':
      return <ModelInsightsPage />;
    case 'anomaly':
      return <AnomalyPage />;
    default:
      return <DashboardPage onNavigate={onNavigate} viewTransaction={viewTransaction} />;
  }
}
