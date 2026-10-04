import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/client';
import { Transaction } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import { Search, RefreshCw, ChevronLeft, ChevronRight, Scale } from 'lucide-react';

export const AdminTransactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);

  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);

  const fetchTransactions = async (query = search, pageNum = page) => {
    setLoading(true);
    try {
      const res = await adminApi.getTransactions(query, pageNum, 10);
      setTransactions(res.data.data.content);
      setTotalPages(res.data.data.totalPages);
      setTotalElements(res.data.data.totalElements);
      setPage(res.data.data.number);
    } catch (err) {
      console.error('Failed to load admin transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions(search, 0);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTransactions(search, 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Transactions & Ledger Oversight</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit system-wide money movements and verified double-entry ledger rows ({totalElements} total)
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reference..."
              className="pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 w-56 sm:w-64"
            />
          </form>

          <button
            onClick={() => fetchTransactions(search, page)}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/50 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-3">Reference</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Sender Wallet</th>
                <th className="px-5 py-3">Receiver Wallet</th>
                <th className="px-5 py-3 text-right">Amount</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Timestamp</th>
                <th className="px-5 py-3 text-right">Action</th>
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
                transactions.map((txn) => (
                  <tr key={txn.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-300 font-semibold">
                      {txn.referenceNumber}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-300">
                      {txn.type}
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      <div className="font-mono text-slate-300">{txn.senderWalletNumber}</div>
                      <div className="text-[11px] text-slate-500">{txn.senderEmail}</div>
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      <div className="font-mono text-slate-300">{txn.receiverWalletNumber}</div>
                      <div className="text-[11px] text-slate-500">{txn.receiverEmail}</div>
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-white text-xs">
                      ₹{txn.amount.toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={txn.status} />
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                      {new Date(txn.createdAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedTxn(txn)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium transition-colors"
                      >
                        Inspect Ledger
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
                onClick={() => fetchTransactions(search, page - 1)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => fetchTransactions(search, page + 1)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Ledger Inspection Modal */}
      <Modal
        isOpen={!!selectedTxn}
        onClose={() => setSelectedTxn(null)}
        title="Administrative Double-Entry Ledger Inspection"
        maxWidth="max-w-2xl"
      >
        {selectedTxn && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <div>
                <span className="text-slate-500 block">Reference</span>
                <span className="font-mono text-emerald-400 font-semibold">{selectedTxn.referenceNumber}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Status</span>
                <StatusBadge status={selectedTxn.status} />
              </div>
              <div>
                <span className="text-slate-500 block">Sender Party</span>
                <span className="text-slate-200">{selectedTxn.senderEmail} ({selectedTxn.senderWalletNumber})</span>
              </div>
              <div>
                <span className="text-slate-500 block">Receiver Party</span>
                <span className="text-slate-200">{selectedTxn.receiverEmail} ({selectedTxn.receiverWalletNumber})</span>
              </div>
              <div>
                <span className="text-slate-500 block">Gross Amount</span>
                <span className="font-bold text-white text-sm">₹{selectedTxn.amount.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Created At</span>
                <span className="text-slate-300">{new Date(selectedTxn.createdAt).toLocaleString()}</span>
              </div>
              {selectedTxn.note && (
                <div className="col-span-2">
                  <span className="text-slate-500 block">Note / Purpose</span>
                  <span className="italic text-slate-300">"{selectedTxn.note}"</span>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Scale className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs uppercase font-bold tracking-wider text-slate-300">
                  Immutable Balanced Ledger Entries
                </h4>
              </div>

              {selectedTxn.ledgerEntries && selectedTxn.ledgerEntries.length > 0 ? (
                <div className="border border-slate-800 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Entry Type</th>
                        <th className="p-2.5">Account / User</th>
                        <th className="p-2.5">Wallet Ref</th>
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
                          <td className="p-2.5 text-slate-300">{le.userEmail}</td>
                          <td className="p-2.5 font-mono text-[11px] text-slate-400">{le.walletNumber}</td>
                          <td className="p-2.5 text-right font-bold text-slate-200">₹{le.amount.toFixed(2)}</td>
                          <td className="p-2.5 text-right text-slate-400">₹{le.balanceAfter.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-500">No ledger entries found.</p>
              )}
            </div>

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
    </div>
  );
};
