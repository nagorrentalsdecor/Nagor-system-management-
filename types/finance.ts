export enum TransactionType {
  INCOME_RENT = 'Rent',
  INCOME_LATE_FEE = 'Late Fee',
  INCOME_OTHER = 'Other Income',
  EXPENSE_MAINTENANCE = 'Maintenance',
  EXPENSE_UTILITIES = 'Utilities',
  EXPENSE_INSURANCE = 'Insurance',
  EXPENSE_PROPERTY_TAX = 'Property Tax',
  EXPENSE_REPAIRS = 'Repairs',
  EXPENSE_OPERATIONAL = 'Operational',
  EXPENSE_PAYROLL = 'Payroll',
  EXPENSE_OTHER = 'Other Expense'
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  description: string;
  date: string;
  propertyId?: string;
  referenceNumber?: string;
  status: TransactionStatus;
  submittedBy: string; // User ID who submitted the transaction
  approvedBy?: string; // User ID who approved/rejected
  approvalNotes?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollRun {
  id: string;
  month: number;
  year: number;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'paid';
  totalAmount: number;
  employeeCount: number;
  notes?: string;
  transactions: string[];
  approvedBy?: string;
  approvedAt?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  id: string;
  name: string;
  position: string;
  salary: number;
  status: 'active' | 'inactive' | 'on_leave';
  hireDate: string;
  terminationDate?: string;
}

export interface FinancialMetrics {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  totalPayroll: number;
  incomeChange?: number;
  expensesChange?: number;
  profitChange?: number;
  payrollChange?: number;
  period: {
    start: string;
    end: string;
  };
}
