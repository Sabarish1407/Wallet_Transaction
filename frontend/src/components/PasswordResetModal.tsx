import React, { useState } from 'react';
import { Modal } from './Modal';
import { authApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { KeyRound, ShieldAlert } from 'lucide-react';

export const PasswordResetModal: React.FC = () => {
  const { user, login, updateResetRequired } = useAuth();
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user || !user.passwordResetRequired) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.resetPassword({
        temporaryPassword,
        newPassword,
      });

      if (res.data.success) {
        updateResetRequired(false);
        // Refresh token if provided
        if (res.data.data.token) {
          login(res.data.data.token, { ...user, passwordResetRequired: false });
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Password reset failed. Please check temporary password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={user.passwordResetRequired}
      onClose={() => {}}
      title="Action Required: Set New Password"
      hideClose={true}
    >
      <div className="space-y-4">
        <div className="flex items-start space-x-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
          <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">First-time login detected</p>
            <p className="text-xs text-amber-200/80 mt-0.5">
              For security reasons, you must change your temporary password before accessing wallet and transaction features.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Temporary / Current Password
            </label>
            <input
              type="password"
              required
              value={temporaryPassword}
              onChange={(e) => setTemporaryPassword(e.target.value)}
              placeholder="Enter temporary password"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              New Password
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-type new password"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all flex items-center justify-center space-x-2"
          >
            <KeyRound className="w-4 h-4" />
            <span>{loading ? 'Updating Credentials...' : 'Save Password & Continue'}</span>
          </button>
        </form>
      </div>
    </Modal>
  );
};
