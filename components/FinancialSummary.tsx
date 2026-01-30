import React from 'react';
import { ArrowDown, ArrowUp, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

interface FinancialMetrics {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  totalPayroll: number;
  incomeChange?: number;
  expensesChange?: number;
  profitChange?: number;
  payrollChange?: number;
}

interface FinancialSummaryProps {
  metrics: FinancialMetrics;
  payrollRuns: any[]; // Using any for now, should be properly typed
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const StatCard = ({
  title,
  amount,
  icon: Icon,
  change,
  isPositive = true
}: {
  title: string;
  amount: number;
  icon: React.ElementType;
  change?: number;
  isPositive?: boolean;
}) => (
  <div className="bg-white p-4 rounded-lg shadow">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-semibold mt-1">{formatCurrency(amount)}</p>
      </div>
      <div className={`p-2 rounded-full ${isPositive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
    {change !== undefined && (
      <div className={`mt-2 flex items-center text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'
        }`}>
        {change >= 0 ? (
          <ArrowUp className="w-4 h-4 mr-1" />
        ) : (
          <ArrowDown className="w-4 h-4 mr-1" />
        )}
        <span>{Math.abs(change)}% from last period</span>
      </div>
    )}
  </div>
);

export const FinancialSummary: React.FC<FinancialSummaryProps> = ({ metrics, payrollRuns }) => {
  // Calculate total payroll for the current period
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // getMonth() is 0-indexed
  const currentYear = currentDate.getFullYear();

  const currentPeriodPayroll = payrollRuns
    .filter(run => run.month === currentMonth && run.year === currentYear)
    .reduce((sum, run) => sum + run.totalAmount, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard
        title="Total Income"
        amount={metrics.totalIncome}
        icon={TrendingUp}
        change={metrics.incomeChange}
        isPositive={true}
      />
      <StatCard
        title="Total Expenses"
        amount={metrics.totalExpenses}
        icon={TrendingDown}
        change={metrics.expensesChange}
        isPositive={false}
      />
      <StatCard
        title="Net Profit"
        amount={metrics.netProfit}
        icon={DollarSign}
        change={metrics.profitChange}
        isPositive={metrics.netProfit >= 0}
      />
      <StatCard
        title="Payroll (Current Month)"
        amount={currentPeriodPayroll}
        icon={DollarSign}
        change={metrics.payrollChange}
        isPositive={false}
      />
    </div>
  );
};
