import React, { useState, useEffect } from 'react';
import { transactionApi, issueApi } from '../../api/client';
import { Transaction } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import {
  ArrowUpRight,
  ArrowDownLeft,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export const CustomerTransactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);

  // Selected Transaction for Ledger Details Modal
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);

  // Report Issue Modal
  const [issueTxn, setIssueTxn] = useState<Transaction | null>(null);
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [issueLoading, setIssueLoading] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [issueSuccess, setIssueSuccess] = useState(false);

  const fetchTransactions = async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await transactionApi.getMyTransactions(pageNum, 10);
      setTransactions(res.data.data.content);
      setTotalPages(res.data.data.totalPages);
      setTotalElements(res.data.data.totalElements);
      setPage(res.data.data.number);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions(0);
  }, []);

  const handleReportIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueTxn) return;
    setIssueLoading(true);
    setIssueError(null);

    try {
      const res = await issueApi.createIssue({
        transactionReference: issueTxn.referenceNumber,
        title: issueTitle,
        description: issueDescription,
      });

      if (res.data.success) {
        setIssueSuccess(true);
        setTimeout(() => {
          setIssueTxn(null);
          setIssueTitle('');
          setIssueDescription('');
          setIssueSuccess(false);
        }, 1500);
      }
    } catch (err: any) {
      setIssueError(err.response?.data?.message || 'Failed to submit issue');
    } finally {
      setIssueLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Transaction History</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Complete records of debits, credits, and financial events ({totalElements} total)
          </p>
        </div>
        <button
          onClick={() => fetchTransactions(page)}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/50 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-3">Reference</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Sender / Receiver</th>
                <th className="px-5 py-3">Note</th>
                <th className="px-5 py-3 text-right">Amount</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                    <span>Loading transactions...</span>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                transactions.map((txn) => {
                  const isDebit = txn.userRoleInTxn === 'DEBIT';
                  return (
                    <tr key={txn.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-300">
                        {txn.referenceNumber}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center space-x-1.5 text-xs font-medium">
                          {isDebit ? (
                            <ArrowUpRight className="w-4 h-4 text-rose-400" />
                          ) : (
                            <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                          )}
                          <span className={isDebit ? 'text-rose-400' : 'text-emerald-400'}>
                            {txn.type}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-300">
                        {txn.type === 'TOP_UP' ? (
                          <span className="text-slate-400">System Gateway</span>
                        ) : isDebit ? (
                          <span>To: <strong>{txn.receiverEmail}</strong></span>
                        ) : (
                          <span>From: <strong>{txn.senderEmail}</strong></span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-400 max-w-[150px] truncate">
                        {txn.note || '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-sm">
                        <span className={isDebit ? 'text-rose-400' : 'text-emerald-400'}>
                          {isDebit ? '-' : '+'}₹{txn.amount.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={txn.status} />
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                        {new Date(txn.createdAt).toLocaleDateString()} {new Date(txn.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedTxn(txn)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium transition-colors"
                        >
                          Ledger
                        </button>
                        <button
                          onClick={() => {
                            setIssueTxn(txn);
                            setIssueTitle('Dispute on ' + txn.referenceNumber);
                            setIssueDescription('');
                          }}
                          className="px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 text-xs transition-colors"
                          title="Report issue on this transaction"
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Page {page + 1} of {totalPages}
            </div>
            <div className="flex items-center space-x-2">
              <button
                disabled={page <= 0}
                onClick={() => fetchTransactions(page - 1)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => fetchTransactions(page + 1)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Ledger Modal */}
      <Modal
        isOpen={!!selectedTxn}
        onClose={() => setSelectedTxn(null)}
        title="Double-Entry Ledger Audit"
        maxWidth="max-w-xl"
      >
        {selectedTxn && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
              <div>Reference: <span className="font-mono text-emerald-400">{selectedTxn.referenceNumber}</span></div>
              <div>Amount: <strong className="text-white">₹{selectedTxn.amount.toFixed(2)}</strong></div>
              <div>Status: <StatusBadge status={selectedTxn.status} /></div>
            </div>

            <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400">
              Immutable Ledger Entries
            </h4>

            {selectedTxn.ledgerEntries && selectedTxn.ledgerEntries.length > 0 ? (
              <div className="border border-slate-800 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-2.5">Entry Type</th>
                      <th className="p-2.5">Wallet</th>
                      <th className="p-2.5 text-right">Amount</th>
                      <th className="p-2.5 text-right">Balance After</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {selectedTxn.ledgerEntries.map((le) => (
                      <tr key={le.id}>
                        <td className="p-2.5">
                          <StatusBadge status={le.entryType} />
                        </td>
                        <td className="p-2.5 font-mono text-[11px] text-slate-300">
                          {le.walletNumber}
                        </td>
                        <td className="p-2.5 text-right font-semibold text-slate-200">
                          ₹{le.amount.toFixed(2)}
                        </td>
                        <td className="p-2.5 text-right text-slate-400">
                          ₹{le.balanceAfter.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-500">No ledger entries recorded.</p>
            )}

            <div className="text-right pt-2">
              <button
                onClick={() => setSelectedTxn(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Report Issue Modal */}
      <Modal
        isOpen={!!issueTxn}
        onClose={() => setIssueTxn(null)}
        title="Report Transaction Issue"
      >
        {issueSuccess ? (
          <div className="p-6 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center">
              ✓
            </div>
            <h4 className="text-sm font-bold text-white">Issue Submitted</h4>
            <p className="text-xs text-slate-400">Our administrators will review the ledger and update you.</p>
          </div>
        ) : (
          <form onSubmit={handleReportIssue} className="space-y-4">
            {issueError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                {issueError}
              </div>
            )}

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <span className="text-slate-500 block">Filing against transaction:</span>
              <span className="font-mono text-emerald-400 font-bold">{issueTxn?.referenceNumber}</span>
              <span className="text-slate-400 block mt-0.5">Amount: ₹{issueTxn?.amount.toFixed(2)}</span>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Issue Title
              </label>
              <input
                type="text"
                required
                value={issueTitle}
                onChange={(e) => setIssueTitle(e.target.value)}
                placeholder="e.g., Deducted but beneficiary did not receive"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Description & Remarks
              </label>
              <textarea
                required
                rows={3}
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
                placeholder="Explain the problem in detail..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIssueTxn(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={issueLoading}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold shadow-lg shadow-rose-500/20 disabled:opacity-50 transition-colors"
              >
                {issueLoading ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
