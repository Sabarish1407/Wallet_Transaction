import React, { useState, useEffect } from 'react';
import { walletApi, transactionApi, transferApi } from '../../api/client';
import { Wallet, Transaction } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';
import {
  Wallet as WalletIcon,
  ArrowUpRight,
  ArrowDownLeft,
  PlusCircle,
  Send,
  RefreshCw,
  CheckCircle2,
  Clock,
  ExternalLink
} from 'lucide-react';

interface CustomerDashboardProps {
  onNavigate: (tab: string) => void;
}

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Top-Up Modal State
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState<string>('1000');
  const [topUpNote, setTopUpNote] = useState<string>('Add money to wallet');
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [topUpError, setTopUpError] = useState<string | null>(null);

  // Transfer Modal State
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferStep, setTransferStep] = useState<'form' | 'confirm'>('form');
  const [receiverEmail, setReceiverEmail] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferSuccessTxn, setTransferSuccessTxn] = useState<string | null>(null);

  // Transaction Detail Modal
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);

  const fetchData = async () => {
    try {
      const [walletRes, txnsRes] = await Promise.all([
        walletApi.getMyWallet(),
        transactionApi.getMyTransactions(0, 5),
      ]);
      setWallet(walletRes.data.data);
      setTransactions(txnsRes.data.data.content);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleTopUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTopUpError(null);
    const amountNum = parseFloat(topUpAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setTopUpError('Please enter a valid amount');
      return;
    }

    setTopUpLoading(true);
    const idempotencyKey = 'TOPUP-' + Date.now() + '-' + Math.random().toString(36).substring(7);

    try {
      const res = await walletApi.topUp({ amount: amountNum, note: topUpNote }, idempotencyKey);
      if (res.data.success) {
        setWallet(res.data.data);
        setIsTopUpOpen(false);
        fetchData();
      }
    } catch (err: any) {
      setTopUpError(err.response?.data?.message || 'Top-up failed');
    } finally {
      setTopUpLoading(false);
    }
  };

  const handleTransferNext = (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError(null);
    const amountNum = parseFloat(transferAmount);

    if (isNaN(amountNum) || amountNum <= 0) {
      setTransferError('Please enter a valid positive amount');
      return;
    }
    if (wallet && amountNum > wallet.balance) {
      setTransferError(`Insufficient balance. Maximum available: ₹${wallet.balance}`);
      return;
    }
    if (!receiverEmail.trim()) {
      setTransferError('Recipient Email or 7-digit User ID is required');
      return;
    }

    setTransferStep('confirm');
  };

  const handleTransferConfirm = async () => {
    setTransferLoading(true);
    setTransferError(null);
    const idempotencyKey = 'TRF-' + Date.now() + '-' + Math.random().toString(36).substring(7);

    try {
      const res = await transferApi.transfer(
        {
          receiverEmail: receiverEmail.trim(),
          amount: parseFloat(transferAmount),
          note: transferNote,
        },
        idempotencyKey
      );

      if (res.data.success) {
        setTransferSuccessTxn(res.data.data.transactionReference);
        fetchData();
      }
    } catch (err: any) {
      setTransferError(err.response?.data?.message || 'Transfer failed');
    } finally {
      setTransferLoading(false);
    }
  };

  const resetTransferState = () => {
    setIsTransferOpen(false);
    setTransferStep('form');
    setReceiverEmail('');
    setTransferAmount('');
    setTransferNote('');
    setTransferError(null);
    setTransferSuccessTxn(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex items-center space-x-3 text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading wallet state...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header / Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Overview</h1>
          <p className="text-xs text-slate-400 mt-0.5">Real-time balances and double-entry transaction ledger</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Main Balance Card & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-slate-800 p-6 shadow-xl">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <WalletIcon className="w-48 h-48 text-emerald-500" />
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400">Available Balance</span>
              <StatusBadge status={wallet?.status || 'ACTIVE'} />
            </div>
            <div className="flex items-center space-x-2">
              {(wallet?.userNumber || user?.userNumber) && (
                <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2.5 py-1 rounded-lg border border-cyan-800/60">
                  User ID: {wallet?.userNumber || user?.userNumber}
                </span>
              )}
              <span className="text-xs font-mono text-slate-400 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800">
                {wallet?.walletNumber}
              </span>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-baseline space-x-2">
              <span className="text-4xl font-extrabold text-white tracking-tight">
                ₹{wallet?.balance?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-sm font-semibold text-emerald-400">INR</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Guaranteed double-entry accounting ledger balance</p>
          </div>

          <div className="flex items-center space-x-3 pt-4 border-t border-slate-800">
            <button
              onClick={() => {
                setTopUpAmount('1000');
                setIsTopUpOpen(true);
              }}
              className="flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/20 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Money</span>
            </button>

            <button
              onClick={() => {
                setTransferStep('form');
                setIsTransferOpen(true);
              }}
              className="flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl font-semibold text-sm bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 shadow-md transition-all"
            >
              <Send className="w-4 h-4 text-cyan-400" />
              <span>Send Money</span>
            </button>
          </div>
        </div>

        {/* Quick Info & Security Guarantee Card */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 flex flex-col justify-between shadow-xl">
          <div>
            <h3 className="text-sm font-semibold text-white mb-2 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Enterprise Financial Invariants</span>
            </h3>
            <ul className="text-xs text-slate-400 space-y-2.5 mt-3">
              <li className="flex items-start space-x-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span><strong>Double-Entry Ledger:</strong> Every debit is balanced by an exact credit record.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span><strong>Deterministic Locking:</strong> Deadlock-free pessimistic concurrency on wallets.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span><strong>Idempotent:</strong> Duplicate submissions never execute repeated debits.</span>
              </li>
            </ul>
          </div>

          <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between text-xs text-slate-400">
            <span>Owner: <strong className="text-slate-200">{wallet?.userFullName}</strong></span>
            <button
              onClick={() => onNavigate('issues')}
              className="text-emerald-400 hover:underline flex items-center space-x-1"
            >
              <span>Dispute Desk</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <h3 className="font-semibold text-white text-sm">Recent Transactions</h3>
          </div>
          <button
            onClick={() => onNavigate('transactions')}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
          >
            View all transactions →
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No transactions yet. Add money or send funds to begin!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/50 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3">Reference</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Counterparty / Description</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {transactions.map((txn) => {
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
                          <span className="text-slate-400">Wallet Top-up (System Clearing)</span>
                        ) : isDebit ? (
                          <span>To: <strong className="text-slate-200">{txn.receiverEmail}</strong></span>
                        ) : (
                          <span>From: <strong className="text-slate-200">{txn.senderEmail}</strong></span>
                        )}
                        {txn.note && <div className="text-[11px] text-slate-500 italic mt-0.5">"{txn.note}"</div>}
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-sm">
                        <span className={isDebit ? 'text-rose-400' : 'text-emerald-400'}>
                          {isDebit ? '-' : '+'}₹{txn.amount.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={txn.status} />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => setSelectedTxn(txn)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium transition-colors"
                        >
                          Ledger
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top-Up Modal */}
      <Modal isOpen={isTopUpOpen} onClose={() => setIsTopUpOpen(false)} title="Add Money to Wallet">
        <form onSubmit={handleTopUpSubmit} className="space-y-4">
          {topUpError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
              {topUpError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Select Preset Amount
            </label>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {['500', '1000', '2000', '5000'].map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setTopUpAmount(preset)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                    topUpAmount === preset
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  ₹{preset}
                </button>
              ))}
            </div>

            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Or Custom Amount (₹)
            </label>
            <input
              type="number"
              min="1"
              step="0.01"
              required
              value={topUpAmount}
              onChange={(e) => setTopUpAmount(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Note (Optional)
            </label>
            <input
              type="text"
              value={topUpNote}
              onChange={(e) => setTopUpNote(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-400">
            Double-entry clearance: debits System Treasury Gateway and credits your wallet.
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setIsTopUpOpen(false)}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={topUpLoading}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-colors"
            >
              {topUpLoading ? 'Processing...' : `Add ₹${topUpAmount || '0'}`}
            </button>
          </div>
        </form>
      </Modal>

      {/* Transfer Money Modal (2-Step Form & Confirmation) */}
      <Modal
        isOpen={isTransferOpen}
        onClose={resetTransferState}
        title={transferSuccessTxn ? 'Transfer Successful' : transferStep === 'form' ? 'Transfer Funds' : 'Confirm Transfer'}
      >
        {transferSuccessTxn ? (
          <div className="space-y-4 text-center py-2">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-white">Payment Completed</h4>
            <p className="text-xs text-slate-400">
              Transaction Reference: <span className="font-mono text-emerald-400">{transferSuccessTxn}</span>
            </p>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1 text-left">
              <div>Amount: <strong className="text-white">₹{parseFloat(transferAmount).toFixed(2)}</strong></div>
              <div>Recipient: <strong className="text-white">{receiverEmail}</strong></div>
              {transferNote && <div>Note: <em>"{transferNote}"</em></div>}
            </div>
            <button
              onClick={resetTransferState}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors"
            >
              Done
            </button>
          </div>
        ) : transferStep === 'form' ? (
          <form onSubmit={handleTransferNext} className="space-y-4">
            {transferError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                {transferError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Recipient Email or 7-Digit User ID
              </label>
              <input
                type="text"
                required
                value={receiverEmail}
                onChange={(e) => setReceiverEmail(e.target.value)}
                placeholder="e.g., bob@wallet.local or 1000003"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              <p className="text-[11px] text-slate-500 mt-1">Recipient can be identified by their registered email or 7-digit User ID</p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Transfer Amount (₹)
                </label>
                <span className="text-xs text-slate-400">
                  Available: <strong className="text-emerald-400">₹{wallet?.balance?.toFixed(2)}</strong>
                </span>
              </div>
              <input
                type="number"
                min="1"
                step="0.01"
                required
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Transfer Note
              </label>
              <input
                type="text"
                value={transferNote}
                onChange={(e) => setTransferNote(e.target.value)}
                placeholder="e.g., Dinner payment, Rent share"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={resetTransferState}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-500/20 transition-colors"
              >
                Review Transfer
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {transferError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                {transferError}
              </div>
            )}

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-sm">
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400 text-xs">Recipient Email / User ID:</span>
                <span className="font-semibold text-white">{receiverEmail}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400 text-xs">Transfer Amount:</span>
                <span className="font-bold text-emerald-400 text-base">₹{parseFloat(transferAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400 text-xs">New Balance After:</span>
                <span className="font-semibold text-slate-300">
                  ₹{((wallet?.balance || 0) - parseFloat(transferAmount)).toFixed(2)}
                </span>
              </div>
              {transferNote && (
                <div className="flex justify-between py-1">
                  <span className="text-slate-400 text-xs">Note:</span>
                  <span className="italic text-slate-300">"{transferNote}"</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setTransferStep('form')}
                disabled={transferLoading}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleTransferConfirm}
                disabled={transferLoading}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-sm font-semibold shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-colors"
              >
                {transferLoading ? 'Authorizing & Locking...' : 'Confirm & Send'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Transaction Details & Ledger Modal */}
      <Modal
        isOpen={!!selectedTxn}
        onClose={() => setSelectedTxn(null)}
        title="Transaction & Double-Entry Ledger Details"
        maxWidth="max-w-xl"
      >
        {selectedTxn && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <div>
                <span className="text-slate-500 block">Reference</span>
                <span className="font-mono text-slate-200">{selectedTxn.referenceNumber}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Status</span>
                <StatusBadge status={selectedTxn.status} />
              </div>
              <div>
                <span className="text-slate-500 block">Sender Wallet</span>
                <span className="font-mono text-slate-200">{selectedTxn.senderWalletNumber}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Receiver Wallet</span>
                <span className="font-mono text-slate-200">{selectedTxn.receiverWalletNumber}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Amount</span>
                <span className="font-bold text-white text-sm">₹{selectedTxn.amount.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Date</span>
                <span className="text-slate-300">{new Date(selectedTxn.createdAt).toLocaleString()}</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-2">
                Double-Entry Ledger Entries (Immutable)
              </h4>
              {selectedTxn.ledgerEntries && selectedTxn.ledgerEntries.length > 0 ? (
                <div className="border border-slate-800 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Entry Type</th>
                        <th className="p-2.5">Account / Wallet</th>
                        <th className="p-2.5 text-right">Amount</th>
                        <th className="p-2.5 text-right">Balance After</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {selectedTxn.ledgerEntries.map((le) => (
                        <tr key={le.id} className="hover:bg-slate-800/30">
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
                <p className="text-xs text-slate-500">No ledger records attached</p>
              )}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedTxn(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
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
