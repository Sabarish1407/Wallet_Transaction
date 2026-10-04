import React, { useState, useEffect } from 'react';
import { issueApi } from '../../api/client';
import { TransactionIssue } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { RefreshCw, MessageSquare, CheckCircle, Clock } from 'lucide-react';

export const CustomerIssues: React.FC = () => {
  const [issues, setIssues] = useState<TransactionIssue[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const res = await issueApi.getMyIssues();
      setIssues(res.data.data);
    } catch (err) {
      console.error('Failed to load issues:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Disputes & Support Issues</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Track reported transaction problems and view administrator resolution updates
          </p>
        </div>
        <button
          onClick={fetchIssues}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12 text-slate-500">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" />
          <span>Loading dispute tickets...</span>
        </div>
      ) : issues.length === 0 ? (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-12 text-center shadow-xl">
          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-80" />
          <h3 className="text-base font-semibold text-white">No Issues Reported</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            All your transactions are in good standing. If you ever face an issue with a transfer, you can dispute it directly from the transactions page.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {issues.map((issue) => (
            <div
              key={issue.id}
              className="rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-xl space-y-4 hover:border-slate-700 transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs text-emerald-400 font-semibold">{issue.issueReference}</span>
                    <StatusBadge status={issue.status} />
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">{issue.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Transaction Ref: <span className="font-mono text-slate-300">{issue.transactionReference}</span> • Amount: ₹{issue.transactionAmount?.toFixed(2)}
                  </p>
                </div>
                <div className="text-right text-xs text-slate-500 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(issue.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-300">
                <span className="text-slate-500 block mb-1 font-semibold uppercase text-[10px] tracking-wider">
                  Your Report:
                </span>
                {issue.description}
              </div>

              {issue.resolutionNotes && (
                <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-300">
                  <div className="flex items-center space-x-1.5 font-semibold text-emerald-400 mb-1">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Resolution Remark from Administrator:</span>
                  </div>
                  <p className="text-emerald-200/90">{issue.resolutionNotes}</p>
                  {issue.resolvedAt && (
                    <div className="text-[10px] text-emerald-400/60 mt-1">
                      Resolved on: {new Date(issue.resolvedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
