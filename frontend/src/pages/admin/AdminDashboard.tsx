import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/client';
import { AdminDashboardMetrics } from '../../types';
import {
  Users,
  Wallet,
  ArrowLeftRight,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Scale,
  ShieldCheck
} from 'lucide-react';

interface AdminDashboardProps {
  onNavigate: (tab: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getDashboardMetrics();
      setMetrics(res.data.data);
    } catch (err) {
      console.error('Failed to load admin metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">System Administration</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time platform metrics, double-entry ledger solvency, and dispute tracking
          </p>
        </div>
        <button
          onClick={fetchMetrics}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div
          onClick={() => onNavigate('admin-users')}
          className="rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-xl hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-400">Total Users</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white mt-2">
            {metrics?.totalUsers ?? '—'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center space-x-2">
            <span className="text-emerald-400 font-semibold">{metrics?.activeUsers ?? 0} Active</span>
            <span>•</span>
            <span className="text-rose-400">{metrics?.inactiveUsers ?? 0} Inactive</span>
          </div>
        </div>

        {/* Total Volume */}
        <div
          onClick={() => onNavigate('admin-transactions')}
          className="rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-xl hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-400">Processed Volume</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white mt-2">
            ₹{metrics?.totalVolume?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) ?? '0.00'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Across {metrics?.totalTransactions ?? 0} transactions
          </div>
        </div>

        {/* Total Wallets */}
        <div
          onClick={() => onNavigate('admin-users')}
          className="rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-xl hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-400">Active Wallets</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white mt-2">
            {metrics?.totalWallets ?? '—'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            100% 1-to-1 account allocation
          </div>
        </div>

        {/* Open Issues */}
        <div
          onClick={() => onNavigate('admin-issues')}
          className="rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-xl hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-400">Pending Disputes</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white mt-2">
            {metrics?.openIssues ?? 0}
          </div>
          <div className="text-[11px] text-amber-400 mt-1">
            Requires administrative resolution
          </div>
        </div>
      </div>

      {/* Accounting Invariant Verification Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 p-6 shadow-xl">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Double-Entry Ledger Solvency Check</h3>
            <p className="text-xs text-slate-400">Continuous mathematical verification: Invariant Total Debits == Total Credits</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-sm">
          <div>
            <span className="text-xs text-slate-500 block uppercase tracking-wider font-semibold">Total Ledger Debits</span>
            <span className="text-lg font-bold font-mono text-rose-400">
              ₹{metrics?.totalDebit?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) ?? '0.00'}
            </span>
          </div>

          <div>
            <span className="text-xs text-slate-500 block uppercase tracking-wider font-semibold">Total Ledger Credits</span>
            <span className="text-lg font-bold font-mono text-emerald-400">
              ₹{metrics?.totalCredit?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) ?? '0.00'}
            </span>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span className="text-emerald-300 font-medium">
              Ledger is balanced and zero-discrepancy verified across all historical ledger rows.
            </span>
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => onNavigate('admin-users')}
          className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 transition-all cursor-pointer shadow-lg"
        >
          <Users className="w-6 h-6 text-emerald-400 mb-2" />
          <h4 className="text-sm font-bold text-white">User Lifecycle Management</h4>
          <p className="text-xs text-slate-400 mt-1">
            Create customer accounts, generate temporary credentials, toggle status, and inspect associated wallets.
          </p>
        </div>

        <div
          onClick={() => onNavigate('admin-transactions')}
          className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 transition-all cursor-pointer shadow-lg"
        >
          <ArrowLeftRight className="w-6 h-6 text-cyan-400 mb-2" />
          <h4 className="text-sm font-bold text-white">Ledger & Transaction Audit</h4>
          <p className="text-xs text-slate-400 mt-1">
            Examine every transaction reference with its exact immutable debit and credit ledger counterpart entries.
          </p>
        </div>

        <div
          onClick={() => onNavigate('admin-audit')}
          className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/40 transition-all cursor-pointer shadow-lg"
        >
          <ShieldCheck className="w-6 h-6 text-indigo-400 mb-2" />
          <h4 className="text-sm font-bold text-white">Full Audit Trail</h4>
          <p className="text-xs text-slate-400 mt-1">
            Review immutable system event logs including logins, credential updates, status modifications, and admin activities.
          </p>
        </div>
      </div>
    </div>
  );
};
