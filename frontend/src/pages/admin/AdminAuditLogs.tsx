import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/client';
import { AuditLog } from '../../types';
import { Search, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

export const AdminAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [activityType, setActivityType] = useState<string>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async (query = search, type = activityType, pageNum = page) => {
    setLoading(true);
    try {
      const res = await adminApi.getAuditLogs(type || undefined, query, pageNum, 15);
      setLogs(res.data.data.content);
      setTotalPages(res.data.data.totalPages);
      setTotalElements(res.data.data.totalElements);
      setPage(res.data.data.number);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(search, activityType, 0);
  }, [activityType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(search, activityType, 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">System Audit Trail</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable chronicle of critical security, financial, and administrative operations ({totalElements} events)
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={activityType}
            onChange={(e) => setActivityType(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <option value="">All Event Types</option>
            <option value="USER_CREATED">USER_CREATED</option>
            <option value="USER_LOGIN">USER_LOGIN</option>
            <option value="LOGIN_FAILED">LOGIN_FAILED</option>
            <option value="PASSWORD_RESET">PASSWORD_RESET</option>
            <option value="WALLET_CREATED">WALLET_CREATED</option>
            <option value="MONEY_ADDED">MONEY_ADDED</option>
            <option value="TRANSFER_SUCCESS">TRANSFER_SUCCESS</option>
            <option value="ISSUE_CREATED">ISSUE_CREATED</option>
            <option value="ISSUE_UPDATED">ISSUE_UPDATED</option>
            <option value="ADMIN_ACTION">ADMIN_ACTION</option>
          </select>

          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user or action..."
              className="pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 w-52 sm:w-60"
            />
          </form>

          <button
            onClick={() => fetchLogs(search, activityType, page)}
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
                <th className="px-5 py-3">Event Type</th>
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Action Description</th>
                <th className="px-5 py-3">Target Entity</th>
                <th className="px-5 py-3">Change Summary</th>
                <th className="px-5 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 font-sans">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                    <span>Loading audit records...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 font-sans">
                    No audit records matching query.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="font-semibold text-emerald-400">
                        {log.activityType}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-300 font-sans text-xs">
                      {log.userEmail || 'SYSTEM'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-300 font-sans text-xs max-w-xs truncate">
                      {log.activityDescription}
                    </td>
                    <td className="px-5 py-3.5 text-slate-400">
                      {log.entityName} {log.entityId ? `#${log.entityId}` : ''}
                    </td>
                    <td className="px-5 py-3.5 text-[11px] text-slate-400 font-sans">
                      {log.oldValue || log.newValue ? (
                        <span>
                          {log.oldValue && <span className="text-rose-400/80">{log.oldValue} → </span>}
                          {log.newValue && <span className="text-emerald-400/80">{log.newValue}</span>}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-sans">
            <div>
              Page {page + 1} of {totalPages}
            </div>
            <div className="flex items-center space-x-2">
              <button
                disabled={page <= 0}
                onClick={() => fetchLogs(search, activityType, page - 1)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => fetchLogs(search, activityType, page + 1)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
