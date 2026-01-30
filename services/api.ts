import { Transaction, PayrollRun, Employee, TransactionType, TransactionStatus } from '../types/finance';

// Mock data storage
let transactions: Transaction[] = [];
let payrollRuns: PayrollRun[] = [];
let employees: Employee[] = [];

// Helper function to generate ID
const generateId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Transactions API
export const getTransactions = async (): Promise<Transaction[]> => {
  // In a real app, this would be an API call
  return [...transactions];
};

export const saveTransactions = async (updatedTransactions: Transaction[]): Promise<void> => {
  // In a real app, this would be an API call
  transactions = updatedTransactions;
  // Simulate network delay
  return new Promise(resolve => setTimeout(resolve, 300));
};

export const addTransaction = async (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> => {
  const newTransaction: Transaction = {
    ...transaction,
    id: generateId('txn'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  transactions = [...transactions, newTransaction];
  return newTransaction;
};

export const updateTransaction = async (id: string, updates: Partial<Transaction>): Promise<Transaction> => {
  const index = transactions.findIndex(t => t.id === id);
  if (index === -1) {
    throw new Error('Transaction not found');
  }
  const updated = {
    ...transactions[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  transactions[index] = updated;
  return updated;
};

export const createTransaction = async (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> => {
  // All transactions must start as PENDING for finance approval
  const pendingTransaction = {
    ...transaction,
    status: 'PENDING' as TransactionStatus.PENDING,
  };
  return addTransaction(pendingTransaction);
};

// Payroll Runs API
export const getPayrollRuns = async (): Promise<PayrollRun[]> => {
  return [...payrollRuns];
};

export const savePayrollRuns = async (updatedPayrollRuns: PayrollRun[]): Promise<void> => {
  payrollRuns = updatedPayrollRuns;
  return new Promise(resolve => setTimeout(resolve, 300));
};

export const createPayrollRun = async (payrollData: Omit<PayrollRun, 'id' | 'createdAt' | 'updatedAt'>): Promise<PayrollRun> => {
  const newPayrollRun: PayrollRun = {
    ...payrollData,
    id: generateId('pay'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  payrollRuns = [...payrollRuns, newPayrollRun];
  return newPayrollRun;
};

// Employees API
export const getEmployees = async (): Promise<Employee[]> => {
  // Mock data for employees
  if (employees.length === 0) {
    employees = [
      {
        id: 'emp_1',
        name: 'John Doe',
        position: 'Property Manager',
        salary: 5000,
        status: 'active',
        hireDate: '2023-01-15',
      },
      {
        id: 'emp_2',
        name: 'Jane Smith',
        position: 'Maintenance Supervisor',
        salary: 4500,
        status: 'active',
        hireDate: '2023-02-20',
      },
      {
        id: 'emp_3',
        name: 'Robert Johnson',
        position: 'Accountant',
        salary: 4800,
        status: 'active',
        hireDate: '2023-03-10',
      },
    ];
  }
  return [...employees];
};

export const saveEmployees = async (updatedEmployees: Employee[]): Promise<void> => {
  employees = updatedEmployees;
  return new Promise(resolve => setTimeout(resolve, 300));
};

// Bookings API (placeholder - you may need to import Booking type)
export const getBookings = async (): Promise<any[]> => {
  // Mock bookings data
  return [];
};

export const saveBookings = async (updatedBookings: any[]): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, 300));
};

// Helper function to calculate financial metrics
export const calculateFinancialMetrics = (
  transactions: Transaction[],
  payrollRuns: PayrollRun[],
  startDate?: Date,
  endDate?: Date
) => {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const filterByDate = (date: string) => {
    const transactionDate = new Date(date);
    if (startDate && transactionDate < startDate) return false;
    if (endDate && transactionDate > endDate) return false;
    return true;
  };

  // Current period calculations
  const currentPeriodTransactions = transactions.filter(t => filterByDate(t.date));

  const totalIncome = currentPeriodTransactions
    .filter(t => t.type.startsWith('INCOME_'))
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = currentPeriodTransactions
    .filter(t => t.type.startsWith('EXPENSE_') && t.type !== TransactionType.EXPENSE_PAYROLL)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalPayroll = payrollRuns
    .filter(p => p.status === 'approved' && filterByDate(p.createdAt))
    .reduce((sum, p) => sum + p.totalAmount, 0);

  // Previous period calculations for changes
  const previousPeriodTransactions = transactions.filter(t => {
    const date = new Date(t.date);
    return date >= lastMonthStart && date <= lastMonthEnd;
  });

  const prevTotalIncome = previousPeriodTransactions
    .filter(t => t.type.startsWith('INCOME_'))
    .reduce((sum, t) => sum + t.amount, 0);

  const prevTotalExpenses = previousPeriodTransactions
    .filter(t => t.type.startsWith('EXPENSE_') && t.type !== TransactionType.EXPENSE_PAYROLL)
    .reduce((sum, t) => sum + t.amount, 0);

  const prevTotalPayroll = payrollRuns
    .filter(p => p.status === 'approved' &&
      new Date(p.createdAt) >= lastMonthStart &&
      new Date(p.createdAt) <= lastMonthEnd
    )
    .reduce((sum, p) => sum + p.totalAmount, 0);

  // Calculate percentage changes
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  return {
    totalIncome,
    totalExpenses,
    totalPayroll,
    netProfit: totalIncome - totalExpenses - totalPayroll,
    incomeChange: calculateChange(totalIncome, prevTotalIncome),
    expensesChange: calculateChange(totalExpenses, prevTotalExpenses),
    payrollChange: calculateChange(totalPayroll, prevTotalPayroll),
    profitChange: calculateChange(
      totalIncome - totalExpenses - totalPayroll,
      prevTotalIncome - prevTotalExpenses - prevTotalPayroll
    ),
    period: {
      start: startDate?.toISOString().split('T')[0] || currentMonthStart.toISOString().split('T')[0],
      end: endDate?.toISOString().split('T')[0] || now.toISOString().split('T')[0]
    }
  };
};
