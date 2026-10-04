import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/client';
import { User, Role, UserStatus } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import {
  UserPlus,
  Search,
  KeyRound,
  RefreshCw,
  Power,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);

  // Create User Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Role>('ROLE_CUSTOMER');
  const [initialPassword, setInitialPassword] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Credential Created / Reset Display Modal
  const [credModalData, setCredModalData] = useState<{ email: string; userNumber?: string; tempPass: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchUsers = async (query = search, pageNum = page) => {
    setLoading(true);
    try {
      const res = await adminApi.getUsers(query, pageNum, 10);
      setUsers(res.data.data.content);
      setTotalPages(res.data.data.totalPages);
      setTotalElements(res.data.data.totalElements);
      setPage(res.data.data.number);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(search, 0);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(search, 0);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);

    try {
      const res = await adminApi.createUser({
        email: email.trim(),
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        role,
        initialPassword: initialPassword.trim() || undefined,
      });

      if (res.data.success) {
        setIsCreateOpen(false);
        setCredModalData({
          email: res.data.data.email,
          userNumber: res.data.data.userNumber,
          tempPass: res.data.data.temporaryPassword || 'Generated (hidden)',
        });
        setFullName('');
        setEmail('');
        setPhone('');
        setInitialPassword('');
        fetchUsers(search, page);
      }
    } catch (err: any) {
      setCreateError(err.response?.data?.message || 'Failed to create user');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    const newStatus: UserStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await adminApi.updateUserStatus(user.id, newStatus);
      fetchUsers(search, page);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleResetCredentials = async (user: User) => {
    if (!confirm(`Generate temporary credentials for ${user.email}? They will be forced to change password on next login.`)) {
      return;
    }

    try {
      const res = await adminApi.resetUserCredentials(user.id);
      if (res.data.success) {
        setCredModalData({
          email: res.data.data.email,
          userNumber: res.data.data.userNumber,
          tempPass: res.data.data.temporaryPassword || 'Reset',
        });
        fetchUsers(search, page);
      }
    } catch (err) {
      console.error('Failed to reset credentials:', err);
    }
  };

  const handleCopyPassword = () => {
    if (credModalData?.tempPass) {
      navigator.clipboard.writeText(credModalData.tempPass);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">User Management</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage system access, create customer wallets, and manage credentials ({totalElements} users)
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 w-56 sm:w-64"
            />
          </form>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center space-x-1.5 py-2 px-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 text-white text-xs font-semibold shadow-lg shadow-emerald-500/20 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/50 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-3">User ID</th>
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Wallet Number</th>
                <th className="px-5 py-3 text-right">Balance</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Password State</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                    <span>Loading users...</span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs text-cyan-400 font-semibold">
                      {u.userNumber || '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-200 text-xs">{u.fullName}</div>
                      <div className="text-[11px] text-slate-400">{u.email}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-300">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-300">
                      {u.walletNumber || 'None'}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-xs text-white">
                      ₹{u.walletBalance?.toFixed(2) ?? '0.00'}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={u.status} />
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      {u.passwordResetRequired ? (
                        <span className="text-amber-400 font-medium">Reset Mandated</span>
                      ) : (
                        <span className="text-slate-400">Active Password</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleStatus(u)}
                        title={u.status === 'ACTIVE' ? 'Deactivate User & Wallet' : 'Activate User & Wallet'}
                        className={`p-1.5 rounded-lg border text-xs transition-colors ${
                          u.status === 'ACTIVE'
                            ? 'bg-slate-800 border-slate-700 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400'
                            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleResetCredentials(u)}
                        title="Generate Temporary Credentials"
                        className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-amber-500/10 text-slate-400 hover:text-amber-400 text-xs transition-colors"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Page {page + 1} of {totalPages}
            </div>
            <div className="flex items-center space-x-2">
              <button
                disabled={page <= 0}
                onClick={() => fetchUsers(search, page - 1)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => fetchUsers(search, page + 1)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create User Account">
        <form onSubmit={handleCreateUser} className="space-y-4">
          {createError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
              {createError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g., Sarah Jenkins"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sarah@wallet.local"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Phone (Optional)
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value="ROLE_CUSTOMER">CUSTOMER</option>
                <option value="ROLE_ADMIN">ADMIN</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Initial Password (Leave blank for auto-generation)
            </label>
            <input
              type="text"
              value={initialPassword}
              onChange={(e) => setInitialPassword(e.target.value)}
              placeholder="Auto-generated if empty"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
            A wallet will automatically be provisioned with an initial balance of ₹0.00. The user will be required to change their password on first login.
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createLoading}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-colors"
            >
              {createLoading ? 'Provisioning...' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Credential Generated Notification Modal */}
      <Modal
        isOpen={!!credModalData}
        onClose={() => setCredModalData(null)}
        title="Temporary Credentials Generated"
      >
        {credModalData && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              Provide these temporary login credentials to the user. They will be forced to change this password upon their first login.
            </p>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500 text-xs block">7-Digit User ID:</span>
                  <span className="font-mono font-bold text-cyan-400 text-sm">{credModalData.userNumber || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-xs block">Email Address:</span>
                  <span className="font-semibold text-white text-sm">{credModalData.email}</span>
                </div>
              </div>
              <div>
                <span className="text-slate-500 text-xs block">Temporary Password:</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-mono text-emerald-400 font-bold text-base">{credModalData.tempPass}</span>
                  <button
                    onClick={handleCopyPassword}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center space-x-1"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => setCredModalData(null)}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};
