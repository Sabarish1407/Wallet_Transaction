import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { Navbar } from './components/Navbar';
import { PasswordResetModal } from './components/PasswordResetModal';
import { CustomerDashboard } from './pages/customer/CustomerDashboard';
import { CustomerTransactions } from './pages/customer/CustomerTransactions';
import { CustomerIssues } from './pages/customer/CustomerIssues';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminTransactions } from './pages/admin/AdminTransactions';
import { AdminIssues } from './pages/admin/AdminIssues';
import { AdminAuditLogs } from './pages/admin/AdminAuditLogs';
import { RefreshCw } from 'lucide-react';

export const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>Initializing PayCore Security...</span>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const isAdmin = user.role === 'ROLE_ADMIN';

  const renderContent = () => {
    if (!isAdmin) {
      switch (currentTab) {
        case 'dashboard':
        case 'transfer':
          return <CustomerDashboard onNavigate={setCurrentTab} />;
        case 'transactions':
          return <CustomerTransactions />;
        case 'issues':
          return <CustomerIssues />;
        default:
          return <CustomerDashboard onNavigate={setCurrentTab} />;
      }
    } else {
      switch (currentTab) {
        case 'dashboard':
          return <AdminDashboard onNavigate={setCurrentTab} />;
        case 'admin-users':
          return <AdminUsers />;
        case 'admin-transactions':
          return <AdminTransactions />;
        case 'admin-issues':
          return <AdminIssues />;
        case 'admin-audit':
          return <AdminAuditLogs />;
        default:
          return <AdminDashboard onNavigate={setCurrentTab} />;
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-300">
      <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>

      {/* Forced Modal for First-Login Credential Reset */}
      <PasswordResetModal />

      <footer className="border-t border-slate-900 bg-slate-950/60 py-4 text-center text-xs text-slate-500">
        Enterprise Wallet Transaction System • Double-Entry Immutable Ledger • SQLite / PostgreSQL Ready
      </footer>
    </div>
  );
};
