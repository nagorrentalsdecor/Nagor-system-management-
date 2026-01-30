import React from 'react';
import { X, DollarSign, FileText, Calendar, Tag } from 'lucide-react';
import { format } from 'date-fns';

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  formData: {
    amount: string;
    type: 'income' | 'expense';
    category: string;
    description: string;
    date: string;
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  isEditing?: boolean;
}

const incomeCategories = [
  'Rent', 'Service Fee', 'Late Fee', 'Deposit', 'Other Income'
];

const expenseCategories = [
  'Maintenance', 'Utilities', 'Insurance', 'Property Tax', 'Repairs',
  'Office Supplies', 'Marketing', 'Professional Fees', 'Other Expense'
];

export const TransactionForm: React.FC<TransactionFormProps> = ({
  isOpen,
  onClose,
  formData,
  onChange,
  onSubmit,
  isEditing = false
}) => {
  if (!isOpen) return null;

  const categories = formData.type === 'income' ? incomeCategories : expenseCategories;
  const today = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">
            {isEditing ? 'Edit Transaction' : 'Add New Transaction'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-4">
          <div className="space-y-4">
            {/* Transaction Type Toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transaction Type
              </label>
              <div className="flex rounded-md shadow-sm">
                <button
                  type="button"
                  onClick={() => {
                    const event = {
                      target: { name: 'type', value: 'income' }
                    } as React.ChangeEvent<HTMLInputElement>;
                    onChange(event);
                  }}
                  className={`flex-1 py-2 px-4 text-sm font-medium rounded-l-md ${formData.type === 'income'
                    ? 'bg-purple-100 text-purple-700 border border-purple-300'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  Income
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const event = {
                      target: { name: 'type', value: 'expense' }
                    } as React.ChangeEvent<HTMLInputElement>;
                    onChange(event);
                  }}
                  className={`flex-1 py-2 px-4 text-sm font-medium rounded-r-md ${formData.type === 'expense'
                    ? 'bg-purple-900 text-white border border-purple-800'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  Expense
                </button>
              </div>
            </div>

            {/* Amount */}
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                Amount
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="number"
                  name="amount"
                  id="amount"
                  step="0.01"
                  min="0"
                  className="focus:ring-purple-500 focus:border-purple-500 block w-full pl-9 pr-12 sm:text-sm border-gray-300 rounded-md h-10"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={onChange}
                  required
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">GHS</span>
                </div>
              </div>
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Tag className="h-4 w-4 text-gray-400" />
                </div>
                <select
                  id="category"
                  name="category"
                  className="focus:ring-purple-500 focus:border-purple-500 block w-full pl-9 pr-10 sm:text-sm border-gray-300 rounded-md h-10"
                  value={formData.category}
                  onChange={onChange}
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute top-3 left-0 pl-3 flex items-start pointer-events-none">
                  <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
                </div>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  className="focus:ring-purple-500 focus:border-purple-500 block w-full pl-9 sm:text-sm border border-gray-300 rounded-md"
                  placeholder="Add a note about this transaction"
                  value={formData.description}
                  onChange={onChange}
                  required
                />
              </div>
            </div>

            {/* Date */}
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="date"
                  name="date"
                  id="date"
                  className="focus:ring-purple-500 focus:border-purple-500 block w-full pl-9 sm:text-sm border-gray-300 rounded-md h-10"
                  value={formData.date || today}
                  onChange={onChange}
                  max={today}
                  required
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              {isEditing ? 'Update Transaction' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
