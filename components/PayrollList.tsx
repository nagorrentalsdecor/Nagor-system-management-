import React from 'react';
import { format } from 'date-fns';
import { Check, X, FileText, DollarSign, Clock, AlertCircle } from 'lucide-react';

interface PayrollRun {
  id: string;
  month: number;
  year: number;
  status: 'pending' | 'approved' | 'rejected';
  totalAmount: number;
  employeeCount: number;
  notes?: string;
  createdAt: string;
}

interface PayrollListProps {
  payrollRuns: PayrollRun[];
  onGeneratePayroll: () => void;
  onApprovePayroll: (id: string) => void;
  onDeletePayroll: (id: string) => void;
  onViewPayroll: (id: string) => void;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS'
  }).format(amount);
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'approved':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
          <Check className="w-3 h-3 mr-1" /> Approved
        </span>
      );
    case 'rejected':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-900 text-white">
          <X className="w-3 h-3 mr-1" /> Rejected
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-600">
          <Clock className="w-3 h-3 mr-1" /> Pending
        </span>
      );
  }
};

export const PayrollList: React.FC<PayrollListProps> = ({
  payrollRuns,
  onGeneratePayroll,
  onApprovePayroll,
  onDeletePayroll,
  onViewPayroll
}) => {
  const getMonthName = (month: number) => {
    return new Date(2000, month - 1, 1).toLocaleString('default', { month: 'long' });
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Payroll Runs</h2>
          <button
            onClick={onGeneratePayroll}
            className="flex items-center px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            <FileText className="w-4 h-4 mr-1" />
            Generate Payroll
          </button>
        </div>
      </div>

      <div className="divide-y">
        {payrollRuns.length > 0 ? (
          payrollRuns.map((payroll) => (
            <div key={payroll.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex items-start space-x-4">
                  <div className="p-2 rounded-full bg-purple-100 text-purple-600">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium">
                        {getMonthName(payroll.month)} {payroll.year} Payroll
                      </h3>
                      {getStatusBadge(payroll.status)}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {payroll.employeeCount} employees • {format(new Date(payroll.createdAt), 'MMM d, yyyy')}
                    </p>
                    {payroll.notes && (
                      <p className="text-sm text-gray-600 mt-1 flex items-start">
                        <AlertCircle className="w-3.5 h-3.5 text-yellow-500 mr-1 mt-0.5 flex-shrink-0" />
                        <span>{payroll.notes}</span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{formatCurrency(payroll.totalAmount)}</span>
                  <div className="flex space-x-1">
                    {payroll.status === 'pending' && (
                      <button
                        onClick={() => onApprovePayroll(payroll.id)}
                        className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-md"
                        title="Approve"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => onViewPayroll(payroll.id)}
                      className="p-1.5 text-purple-700 hover:bg-purple-100 rounded-md"
                      title="View Details"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeletePayroll(payroll.id)}
                      className="p-1.5 text-purple-900 hover:bg-purple-200 rounded-md"
                      title="Delete"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-gray-500">
            <p>No payroll runs found. Generate your first payroll run.</p>
          </div>
        )}
      </div>
    </div>
  );
};
