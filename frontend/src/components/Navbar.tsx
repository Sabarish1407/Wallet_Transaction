import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Wallet, LogOut, Shield, User, ArrowLeftRight, AlertCircle, FileText, Activity } from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab }) => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const isAdmin = user.role === 'ROLE_ADMIN';

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg text-white tracking-tight">PayCore</span>
              <span className="ml-2 text-xs uppercase px-2 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {isAdmin ? 'Admin Console' : 'Enterprise Wallet'}
              </span>
            </div>
          </div>

          {/* Navigation items */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => setCurrentTab('dashboard')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentTab === 'dashboard'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              Dashboard
            </button>

            {!isAdmin && (
              <>
                <button
                  onClick={() => setCurrentTab('transfer')}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentTab === 'transfer'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  <span>Transfer</span>
                </button>
                <button
                  onClick={() => setCurrentTab('transactions')}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentTab === 'transactions'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Transactions</span>
                </button>
                <button
                  onClick={() => setCurrentTab('issues')}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentTab === 'issues'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <AlertCircle className="w-4 h-4" />
                  <span>Disputes</span>
                </button>
              </>
            )}

            {isAdmin && (
              <>
                <button
                  onClick={() => setCurrentTab('admin-users')}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentTab === 'admin-users'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Users</span>
                </button>
                <button
                  onClick={() => setCurrentTab('admin-transactions')}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentTab === 'admin-transactions'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Transactions & Ledger</span>
                </button>
                <button
                  onClick={() => setCurrentTab('admin-issues')}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentTab === 'admin-issues'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <AlertCircle className="w-4 h-4" />
                  <span>Issues Desk</span>
                </button>
                <button
                  onClick={() => setCurrentTab('admin-audit')}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentTab === 'admin-audit'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  <span>Audit Logs</span>
                </button>
              </>
            )}
          </nav>

          {/* User profile & Logout */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-right">
              <div>
                <div className="text-sm font-medium text-slate-200 flex items-center justify-end space-x-1.5">
                  <span>{user.fullName}</span>
                  {user.userNumber && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">
                      ID: {user.userNumber}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400">{user.email}</div>
              </div>
              <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                {isAdmin ? <Shield className="w-4 h-4 text-amber-400" /> : <User className="w-4 h-4 text-emerald-400" />}
              </div>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
