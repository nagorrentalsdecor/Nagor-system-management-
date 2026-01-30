import React from 'react';
import { Search, Plus, DollarSign, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { format } from 'date-fns';

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
}

interface TransactionsListProps {
  transactions: Transaction[];
  searchTerm: string;
  activeTab: 'all' | 'income' | 'expense';
  onAddTransaction: () => void;
  onSearchChange: (term: string) => void;
  onTabChange: (tab: 'all' | 'income' | 'expense') => void;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS'
  }).format(amount);
};

export const TransactionsList: React.FC<TransactionsListProps> = ({
  transactions,
  searchTerm,
  activeTab,
  onAddTransaction,
  onSearchChange,
  onTabChange
}) => {
  const filteredTransactions = transactions
    .filter(transaction => {
      const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.amount.toString().includes(searchTerm) ||
        transaction.category.toLowerCase().includes(searchTerm.toLowerCase());

      if (activeTab === 'all') return matchesSearch;
      return matchesSearch && transaction.type === activeTab;
    });

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Transactions</h2>
          <button
            onClick={onAddTransaction}
            className="flex items-center px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Transaction
          </button>
        </div>

        <div className="flex items-center bg-gray-100 rounded-md px-3 py-2 mb-4">
          <Search className="w-4 h-4 text-gray-500 mr-2" />
          <input
            type="text"
            placeholder="Search transactions..."
            className="w-full bg-transparent border-none focus:outline-none text-sm"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="flex space-x-2 mb-4">
          {['all', 'income', 'expense'].map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab as 'all' | 'income' | 'expense')}
              className={`px-3 py-1 text-sm rounded-md ${activeTab === tab
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y">
        {filteredTransactions.length > 0 ? (
          filteredTransactions.map((transaction) => (
            <div key={transaction.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-full ${transaction.type === 'income' ? 'bg-purple-100 text-purple-700' : 'bg-purple-900 text-white'
                    }`}>
                    {transaction.type === 'income' ? (
                      <ArrowDownLeft className="w-4 h-4" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{transaction.description}</p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(transaction.date), 'MMM d, yyyy')} • {transaction.category}
                    </p>
                  </div>
                </div>
                <div className={`font-medium ${transaction.type === 'income' ? 'text-purple-600' : 'text-purple-900'
                  }`}>
                  {transaction.type === 'income' ? '+' : '-'}{' '}
                  {formatCurrency(transaction.amount)}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-gray-500">
            <p>No transactions found</p>
          </div>
        )}
      </div>
    </div>
  );
};
