import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/client';
import { TransactionIssue, IssueStatus } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import { Search, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

export const AdminIssues: React.FC = () => {
  const [issues, setIssues] = useState<TransactionIssue[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);

  // Edit / Resolution Modal
  const [selectedIssue, setSelectedIssue] = useState<TransactionIssue | null>(null);
  const [newStatus, setNewStatus] = useState<IssueStatus>('IN_PROGRESS');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const fetchIssues = async (query = search, status = statusFilter, pageNum = page) => {
    setLoading(true);
    try {
      const res = await adminApi.getIssues(status || undefined, query, pageNum, 10);
      setIssues(res.data.data.content);
      setTotalPages(res.data.data.totalPages);
      setTotalElements(res.data.data.totalElements);
      setPage(res.data.data.number);
    } catch (err) {
      console.error('Failed to load issues:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues(search, statusFilter, 0);
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchIssues(search, statusFilter, 0);
  };

  const handleOpenResolutionModal = (issue: TransactionIssue) => {
    setSelectedIssue(issue);
    setNewStatus(issue.status);
    setResolutionNotes(issue.resolutionNotes || '');
    setUpdateError(null);
  };

  const handleSaveResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue) return;
    setUpdating(true);
    setUpdateError(null);

    try {
      const res = await adminApi.updateIssueStatus(selectedIssue.id, {
        status: newStatus,
        resolutionNotes: resolutionNotes.trim() || undefined,
      });

      if (res.data.success) {
        setSelectedIssue(null);
        fetchIssues(search, statusFilter, page);
      }
    } catch (err: any) {
      setUpdateError(err.response?.data?.message || 'Failed to update issue');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Dispute & Issues Desk</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Investigate customer transaction complaints and provide resolution notes ({totalElements} total)
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="RESOLVED">RESOLVED</option>
          </select>

          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reference or user..."
              className="pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 w-52 sm:w-60"
            />
          </form>

          <button
            onClick={() => fetchIssues(search, statusFilter, page)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/50 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-3">Issue Ref</th>
                <th className="px-5 py-3">Transaction</th>
                <th className="px-5 py-3">Reported By</th>
                <th className="px-5 py-3">Title & Issue Details</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Reported At</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                    <span>Loading issues...</span>
                  </td>
                </tr>
              ) : issues.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No dispute issues found.
                  </td>
                </tr>
              ) : (
                issues.map((issue) => (
                  <tr key={issue.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs text-emerald-400 font-semibold">
                      {issue.issueReference}
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      <div className="font-mono text-slate-300">{issue.transactionReference}</div>
                      <div className="text-[11px] text-slate-500">₹{issue.transactionAmount?.toFixed(2)}</div>
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      <div className="font-semibold text-slate-200">{issue.reportedByName}</div>
                      <div className="text-[11px] text-slate-500">{issue.reportedByEmail}</div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-300 max-w-xs">
                      <div className="font-bold text-white truncate">{issue.title}</div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">{issue.description}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={issue.status} />
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                      {new Date(issue.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleOpenResolutionModal(issue)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-medium transition-colors"
                      >
                        Resolve
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Page {page + 1} of {totalPages}
            </div>
            <div className="flex items-center space-x-2">
              <button
                disabled={page <= 0}
                onClick={() => fetchIssues(search, statusFilter, page - 1)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => fetchIssues(search, statusFilter, page + 1)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Resolution Modal */}
      <Modal
        isOpen={!!selectedIssue}
        onClose={() => setSelectedIssue(null)}
        title="Dispute Resolution Desk"
        maxWidth="max-w-lg"
      >
        {selectedIssue && (
          <form onSubmit={handleSaveResolution} className="space-y-4">
            {updateError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                {updateError}
              </div>
            )}

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
              <div>Issue Ref: <span className="font-mono text-emerald-400">{selectedIssue.issueReference}</span></div>
              <div>Reported By: <span className="text-white font-semibold">{selectedIssue.reportedByName}</span> ({selectedIssue.reportedByEmail})</div>
              <div>Transaction: <span className="font-mono text-slate-300">{selectedIssue.transactionReference}</span> (₹{selectedIssue.transactionAmount?.toFixed(2)})</div>
              <div>Customer Note: <span className="italic text-slate-400">"{selectedIssue.description}"</span></div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Update Status
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as IssueStatus)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value="OPEN">OPEN</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="RESOLVED">RESOLVED</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Official Resolution Remarks
              </label>
              <textarea
                rows={4}
                required={newStatus === 'RESOLVED'}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Document actions taken, ledger verification, or refund confirmation..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedIssue(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updating}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-colors"
              >
                {updating ? 'Saving...' : 'Update Resolution'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
