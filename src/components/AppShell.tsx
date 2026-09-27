import { useState } from 'react';
import { ToastContainer } from '@/components/ui/Toast';
import { Topbar } from '@/components/layout/Topbar';
import { DashboardPage } from '@/pages/DashboardPage';
import { TransactionsPage } from '@/pages/TransactionsPage';
import { BatchPage } from '@/pages/BatchPage';
import { AlertsPage } from '@/pages/AlertsPage';
import { ModelInsightsPage } from '@/pages/ModelInsightsPage';
import { TransactionDetailPage } from '@/pages/TransactionDetailPage';
import type { PageKey } from '@/types';

export function AppShell() {
  const [page, setPage] = useState<PageKey>('dashboard');
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);

  const navigate = (p: PageKey) => {
    setPage(p);
    setSelectedTxId(null);
  };

  const viewTransaction = (id: string) => {
    setSelectedTxId(id);
  };

  return (
    <div className="min-h-screen bg-ink-950 grid-bg flex flex-col">
      {/* Top Navigation Bar: Dashboard | Transaction Analysis | Batch Analysis | Fraud Alerts | Model Performance */}
      <Topbar currentPage={page} onNavigate={navigate} />

      {/* Main Full-Width Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8">
        {selectedTxId ? (
          <TransactionDetailPage
            txId={selectedTxId}
            onBack={() => setSelectedTxId(null)}
            viewTransaction={viewTransaction}
          />
        ) : (
          <PageRouter page={page} onNavigate={navigate} viewTransaction={viewTransaction} />
        )}
      </main>

      <ToastContainer />
    </div>
  );
}

function PageRouter({
  page,
  onNavigate,
  viewTransaction,
}: {
  page: PageKey;
  onNavigate: (p: PageKey) => void;
  viewTransaction: (id: string) => void;
}) {
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
    default:
      return <DashboardPage onNavigate={onNavigate} viewTransaction={viewTransaction} />;
  }
}
