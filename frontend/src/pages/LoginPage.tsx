import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/client';
import { Wallet, ShieldCheck, ArrowRight, UserCheck, AlertTriangle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await authApi.login({ email, password });
      if (res.data.success) {
        const { token, ...userData } = res.data.data;
        login(token, userData);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 items-center justify-center shadow-xl shadow-emerald-500/20 mb-4">
          <Wallet className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">PayCore Wallet</h2>
        <p className="mt-2 text-sm text-slate-400">
          Enterprise Transaction Platform with Immutable Double-Entry Ledger
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900/80 backdrop-blur border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Email Address or 7-Digit User ID
              </label>
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alice@wallet.local or 1000002"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all flex items-center justify-center space-x-2"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Logins Section */}
          <div className="mt-6 pt-6 border-t border-slate-800">
            <p className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-3 text-center">
              Quick Test Credentials (Click to Fill ID or Email)
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('1000001', 'Admin@123')}
                className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left transition-colors flex items-center space-x-2 text-slate-200"
              >
                <ShieldCheck className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <div>
                  <div className="font-semibold">Admin (1000001)</div>
                  <div className="text-[10px] text-slate-500">admin@wallet.local</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('1000002', 'User@123')}
                className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left transition-colors flex items-center space-x-2 text-slate-200"
              >
                <UserCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <div>
                  <div className="font-semibold">Alice (1000002)</div>
                  <div className="text-[10px] text-slate-500">₹5,000 • alice@wallet.local</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('1000003', 'User@123')}
                className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left transition-colors flex items-center space-x-2 text-slate-200"
              >
                <UserCheck className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <div>
                  <div className="font-semibold">Bob (1000003)</div>
                  <div className="text-[10px] text-slate-500">₹3,000 • bob@wallet.local</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('1000004', 'Temp@123')}
                className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-amber-500/20 text-left transition-colors flex items-center space-x-2 text-slate-200"
              >
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-amber-300">Carol (1000004)</div>
                  <div className="text-[10px] text-slate-500">First-Login Reset Demo</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
