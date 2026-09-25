import { useState } from 'react';
import { ToastContainer } from '@/components/ui/Toast';
import { Topbar } from '@/components/layout/Topbar';
import { KaggleTablePage } from '@/pages/KaggleTablePage';
import { KaggleReasonsPage } from '@/pages/KaggleReasonsPage';
import { UploadDatasetPage } from '@/pages/UploadDatasetPage';
import { UploadReasonsPage } from '@/pages/UploadReasonsPage';
import { ModelInsightsPage } from '@/pages/ModelInsightsPage';
import { TransactionDetailPage } from '@/pages/TransactionDetailPage';
import type { PageKey } from '@/types';

export function AppShell() {
  const [page, setPage] = useState<PageKey>('kaggle-table');
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
      {/* Top Navigation Bar */}
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
    case 'kaggle-table':
      return <KaggleTablePage onNavigate={onNavigate} viewTransaction={viewTransaction} />;
    case 'kaggle-reasons':
      return <KaggleReasonsPage />;
    case 'upload-dataset':
      return <UploadDatasetPage onNavigate={onNavigate} />;
    case 'upload-reasons':
      return <UploadReasonsPage onNavigate={onNavigate} />;
    case 'model-performance':
      return <ModelInsightsPage />;
    default:
      return <KaggleTablePage onNavigate={onNavigate} viewTransaction={viewTransaction} />;
  }
}
