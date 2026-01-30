import React, { useState } from 'react';
import { Transaction, TransactionStatus } from '../../types';
import { format } from 'date-fns';
import { CheckCircle, XCircle, AlertOctagon, User, Calendar, DollarSign } from 'lucide-react';
import { updateTransactionStatus } from '../../services/db';

interface ApprovalQueueProps {
  transactions: Transaction[];
  onApprove: (id: string, notes: string) => void;
  onReject: (id: string, notes: string) => void;
  currentUserId: string;
  currentUserRole: string;
}

export const ApprovalQueue: React.FC<ApprovalQueueProps> = ({
  transactions,
  onApprove,
  onReject,
  currentUserId,
  currentUserRole,
}) => {
  const [approvalNotes, setApprovalNotes] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  const pendingTransactions = transactions.filter(t => t.status === TransactionStatus.PENDING);

  if (currentUserRole !== 'finance_officer') {
    return (
      <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center gap-3">
          <AlertOctagon className="text-blue-600" size={24} />
          <div>
            <h3 className="text-blue-900 font-semibold">Finance Approval Required</h3>
            <p className="text-blue-700 text-sm mt-1">
              {pendingTransactions.length} transaction(s) awaiting finance officer approval
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (pendingTransactions.length === 0) {
    return (
      <div className="p-6 bg-green-50 rounded-lg border border-green-200">
        <div className="flex items-center gap-3">
          <CheckCircle className="text-green-600" size={24} />
          <div>
            <h3 className="text-green-900 font-semibold">All Clear</h3>
            <p className="text-green-700 text-sm mt-1">No pending transactions requiring approval</p>
          </div>
        </div>
      </div>
    );
  }

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    await onApprove(id, approvalNotes[id] || 'Approved by finance officer');
    setApprovalNotes(prev => ({ ...prev, [id]: '' }));
    setProcessingId(null);
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    await onReject(id, approvalNotes[id] || 'Rejected by finance officer');
    setApprovalNotes(prev => ({ ...prev, [id]: '' }));
    setProcessingId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Finance Authorization Queue</h3>
        <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-medium">
          {pendingTransactions.length} Pending
        </span>
      </div>
      
      <div className="space-y-3">
        {pendingTransactions.map((transaction) => (
          <div
            key={transaction.id}
            className="bg-white border border-amber-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Transaction Details */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    transaction.type.startsWith('INCOME') 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {transaction.type.replace('INCOME_', '').replace('EXPENSE_', '').replace(/_/g, ' ')}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                    Pending Approval
                  </span>
                </div>
                
                <h4 className="font-medium text-gray-900 mb-1">{transaction.description}</h4>
                
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar size={14} />
                    {format(new Date(transaction.date), 'MMM dd, yyyy')}
                  </div>
                  <div className="flex items-center gap-1">
                    <User size={14} />
                    {transaction.submittedBy}
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign size={14} />
                    <span className={`font-medium ${
                      transaction.type.startsWith('INCOME') ? 'text-green-600' : 'text-gray-900'
                    }`}>
                      {transaction.type.startsWith('INCOME') ? '+' : '-'}₵{transaction.amount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Approval Actions */}
              <div className="flex flex-col sm:flex-row gap-3 lg:min-w-0">
                <div className="flex-1">
                  <textarea
                    placeholder="Approval notes (optional)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 resize-none"
                    rows={2}
                    value={approvalNotes[transaction.id] || ''}
                    onChange={(e) =>
                      setApprovalNotes(prev => ({
                        ...prev,
                        [transaction.id]: e.target.value
                      }))
                    }
                  />
                </div>
                
                <div className="flex gap-2 lg:flex-col">
                  <button
                    onClick={() => handleApprove(transaction.id)}
                    disabled={processingId === transaction.id}
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px]"
                  >
                    {processingId === transaction.id ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <CheckCircle size={16} className="mr-1" />
                        Approve
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => handleReject(transaction.id)}
                    disabled={processingId === transaction.id}
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px]"
                  >
                    {processingId === transaction.id ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <XCircle size={16} className="mr-1" />
                        Reject
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ApprovalQueue;
