export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  FINANCE = 'FINANCE',
  CASHIER = 'CASHIER',
  SALES = 'SALES',
  VIEWER = 'VIEWER',
  LABORER = 'LABORER'
}

export enum ItemStatus {
  AVAILABLE = 'AVAILABLE',
  MAINTENANCE = 'MAINTENANCE',
  DAMAGED = 'DAMAGED',
  // Note: 'RENTED' is calculated dynamically based on bookings, not a static status
}

export interface Item {
  id: string;
  name: string;
  category: string;
  color?: string; // Item color (e.g., "Red", "Blue", "White")
  totalQuantity: number;
  quantityInMaintenance?: number; // New field for partial maintenance
  price: number; // Daily rental price
  status: ItemStatus;
  imageUrl?: string;
}

export enum BookingStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE', // Picked up
  RETURNED = 'RETURNED',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED'
}

export interface BookingItem {
  itemId: string;
  itemName: string;
  quantity: number;
  priceAtBooking: number;
}

export interface Penalty {
  type: 'LOSS' | 'DAMAGE' | 'LATE_FEE' | 'OTHER';
  amount: number;
  description: string;
  date: string;
}

export interface Booking {
  id: string;
  customerId: string;
  customerName: string;
  items: BookingItem[];
  startDate: string; // ISO Date string
  endDate: string; // ISO Date string
  status: BookingStatus;
  totalAmount: number;
  paidAmount: number;
  lateFee?: number;
  penalties?: Penalty[];
  notes?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  email?: string;
  notes?: string;
  totalRentals: number;

  // KYC & Risk Enhancements
  idCardUrl?: string;
  guarantorName?: string;
  guarantorPhone?: string;
  isBlacklisted: boolean;
  riskNotes?: string;
}

export enum EmployeeStatus {
  ACTIVE = 'ACTIVE',
  ON_LEAVE = 'ON_LEAVE',
  SUSPENDED = 'SUSPENDED',
  TERMINATED = 'TERMINATED'
}

export interface Employee {
  id: string;
  name: string;
  role: UserRole;
  phone: string;
  salary: number;
  joinDate: string;
  // HR Features
  status: EmployeeStatus;
  loanBalance: number;      // Amount owed to company
  pendingDeductions: number; // Sanctions/Deductions to be applied
  leaveBalance: number;     // Days of leave remaining
  performanceRating: number; // 0 to 5

  // New Profile Fields
  photoUrl?: string;
  address?: string;
  guarantorName?: string;    // Name of guarantor
  guarantorPhone?: string;
  bankAccount?: string;      // Bank account number
  mobileMoneyAccount?: string; // Mobile money account (e.g., MTN, Vodafone)
  ghanaCardFrontUrl?: string;
  ghanaCardBackUrl?: string;
  hasSystemAccess: boolean;

  // Credentials
  username?: string;         // System login username
  password?: string;         // Hashed password (in real app)
  tempPassword?: string;     // Temporary password for reset (show to user once)
  passwordLastChanged?: string; // ISO date of last password change
  isFirstLogin?: boolean;    // Flag for first-time login (requires password change)
  passwordChangeRequired?: boolean; // Force user to change password on next login
}

export enum TransactionType {
  INCOME_RENTAL = 'INCOME_RENTAL',
  INCOME_DEPOSIT = 'INCOME_DEPOSIT',
  INCOME_DAMAGE = 'INCOME_DAMAGE',
  EXPENSE_REPAIR = 'EXPENSE_REPAIR',
  EXPENSE_MAINTENANCE = 'EXPENSE_MAINTENANCE',
  EXPENSE_OPERATIONAL = 'EXPENSE_OPERATIONAL',
  REFUND_DEPOSIT = 'REFUND_DEPOSIT',
  EXPENSE_PAYROLL = 'EXPENSE_PAYROLL',
  INCOME_PENALTY = 'INCOME_PENALTY',
  // Granular Expenses
  EXPENSE_FUEL = 'EXPENSE_FUEL',
  EXPENSE_TRANSPORT = 'EXPENSE_TRANSPORT',
  EXPENSE_UTILITIES = 'EXPENSE_UTILITIES',
  EXPENSE_MARKETING = 'EXPENSE_MARKETING',
  EXPENSE_OFFICE = 'EXPENSE_OFFICE',
  // Extended Logic
  INCOME_SALES = 'INCOME_SALES',
  // Catch-all
  INCOME_OTHER = 'INCOME_OTHER',
  EXPENSE_OTHER = 'EXPENSE_OTHER'
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: TransactionType;
  description: string;
  bookingId?: string;
  propertyId?: string;
  referenceNumber?: string;
  status: TransactionStatus;
  submittedBy: string; // User ID who submitted the transaction
  approvedBy?: string; // User ID who approved/rejected
  approvalNotes?: string;
  approvedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuditLog {
  id: string;
  action: string; // e.g., 'CREATE_BOOKING', 'APPROVE_PAYMENT'
  details: string; // Human readable description
  userId: string;
  userName: string;
  timestamp: string; // ISO Date
  metadata?: any; // For potential future data
}

export interface DashboardMetrics {
  totalItems: number;
  rentedItems: number;
  availableItems: number;
  todaysRevenue: number;
  pendingBookings: number;
  overdueBookings: number;
  maintenanceItems: number; // New field
  totalCustomers: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  topItems: { name: string; revenue: number }[];
  inventoryHealth: { name: string; value: number; color: string }[];
}

// --- Payroll Types ---
export enum PayrollStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface PayrollItem {
  employeeId: string;
  employeeName: string;
  baseSalary: number;
  deductions: number;
  netPay: number;
}

export interface PayrollRun {
  id: string;
  month: number; // 0-11
  year: number;
  totalAmount: number;
  status: PayrollStatus;
  createdAt: string;
  items: PayrollItem[];
}