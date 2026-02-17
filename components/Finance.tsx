import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Search,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  PlusCircle,
  Trash2,
  Calendar,
  FileText,
  AlertOctagon,
  Eye,
  Users,
  Briefcase,
  Zap,
  Layers,
  ChevronRight,
  Filter,
  BarChart3,
  CreditCard,
  History,
  ShieldCheck,
  XCircle,
  CheckCircle,
  Download,
  MessageCircle,
  PieChart as PieChartIcon
} from 'lucide-react';
import {
  Transaction,
  TransactionType,
  PayrollRun,
  PayrollStatus,
  BookingStatus,
  UserRole,
  TransactionStatus,
  Customer,
  Booking
} from '../types';
import {
  getTransactions,
  saveTransactions,
  getPayrollRuns,
  savePayrollRuns,
  getEmployees,
  saveEmployees,
  getBookings,
  saveBookings,
  createTransaction,
  updateTransactionStatus,
  getApprovedTransactions,
  getCustomers
} from '../services/db';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Cell, PieChart, Pie, Legend } from 'recharts';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { toastService } from '../services/toast';

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white/80 backdrop-blur-md border border-white/40 shadow-xl shadow-stone-200/40 rounded-[2.5rem] ${className}`}>
    {children}
  </div>
);

export const Finance = () => {
  // Data State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'transactions' | 'payroll' | 'reports' | 'approvals'>('transactions');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingPayroll, setViewingPayroll] = useState<PayrollRun | null>(null);
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollRun | null>(null);

  // Use real auth context
  // @ts-ignore
  const { user } = React.useContext(AuthContext);

  const currentUser = useMemo(() => {
    // Default fallback if context is not yet ready or mock mode
    const role = user?.role || UserRole.FINANCE;
    return {
      id: 'current-user',
      name: user?.name || 'Staff Member',
      role: role,
      permissions: {
        canApproveTransactions: [UserRole.ADMIN, UserRole.MANAGER, UserRole.FINANCE].includes(role),
        canViewPendingTransactions: [UserRole.ADMIN, UserRole.MANAGER, UserRole.FINANCE].includes(role),
        canCreateTransactions: true,
        // STRICT RULE: Only ADMIN can delete transactions
        canDeleteTransactions: role === UserRole.ADMIN
      }
    };
  }, [user]);

  // Form State
  const [transactionForm, setTransactionForm] = useState<{
    amount: string;
    type: TransactionType;
    description: string;
    date: string;
    propertyId: string;
    referenceNumber: string;
    status: TransactionStatus;
    submittedBy: string;
  }>({
    amount: '',
    type: TransactionType.INCOME_RENTAL,
    description: '',
    date: new Date().toISOString().split('T')[0],
    propertyId: '',
    referenceNumber: '',
    status: TransactionStatus.PENDING,
    submittedBy: 'user-1', // This would come from auth context in a real app
  });

  const handleCloseModal = () => {
    setIsModalOpen(false);
    if (location.pathname === '/finance/new') {
      navigate('/finance');
    }
  };

  const refreshData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const [transactionsData, payrollRunsData, customersData, bookingsData] = await Promise.all([
        getTransactions(),
        getPayrollRuns(),
        getCustomers(),
        getBookings()
      ]);

      // Role-based transaction visibility
      const visibleTransactions = transactionsData.filter(t => {
        // Privileged users see all transactions
        const isPrivileged = [UserRole.ADMIN, UserRole.MANAGER, UserRole.FINANCE].includes(currentUser.role);
        if (isPrivileged) return true;

        // Other users (Sales, etc.) only see their own transactions
        return t.submittedBy === currentUser.name;
      });

      setTransactions(visibleTransactions);
      setPayrollRuns(payrollRunsData);
      setCustomers(customersData);
      setBookings(bookingsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (location.pathname === '/finance/new') {
      setIsModalOpen(true);
    }
    refreshData();

    // Set up real-time data refresh every 30 seconds, but skip if modal is open
    const interval = setInterval(() => {
      if (!isModalOpen && !viewingPayroll) {
        refreshData();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [location.pathname, isModalOpen, viewingPayroll, refreshData]);

  const metrics = useMemo(() => {
    // Use only approved transactions for financial metrics
    const approvedTransactions = getApprovedTransactions();
    const income = approvedTransactions.filter(t => t.type.startsWith('INCOME')).reduce((sum, t) => sum + t.amount, 0);
    const expenses = approvedTransactions.filter(t => t.type.startsWith('EXPENSE') || t.type.startsWith('REFUND')).reduce((sum, t) => sum + t.amount, 0);

    // Calculate outstanding amounts from multiple sources
    const bookings = getBookings();
    const pendingTransactions = getTransactions().filter(t => t.status === TransactionStatus.PENDING);

    // 1. Unpaid amounts from bookings (PENDING, ACTIVE, OVERDUE)
    const bookingOutstanding = bookings
      .filter(b => b.status === 'PENDING' || b.status === 'ACTIVE' || b.status === 'OVERDUE')
      .reduce((sum, b) => sum + (b.totalAmount - b.paidAmount), 0);

    // 2. Pending payment transactions awaiting approval
    const pendingPayments = pendingTransactions
      .filter(t => t.type.startsWith('INCOME'))
      .reduce((sum, t) => sum + t.amount, 0);

    const outstanding = bookingOutstanding + pendingPayments;

    return { income, expenses, profit: income - expenses, outstanding, total: transactions.length };
  }, [transactions]);

  const chartData = useMemo(() => {
    const days = eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() });
    const approvedTransactions = getApprovedTransactions();

    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayTxs = approvedTransactions.filter(t => t.date.startsWith(dateStr));
      return {
        date: format(day, 'EEE'),
        income: dayTxs.filter(t => t.type.startsWith('INCOME')).reduce((sum, t) => sum + t.amount, 0),
        expenses: dayTxs.filter(t => t.type.startsWith('EXPENSE') || t.type.startsWith('REFUND')).reduce((sum, t) => sum + t.amount, 0)
      };
    });
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(transaction => {
        const matchesSearch = (transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          transaction.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesDate = transaction.date >= dateRange.start && transaction.date <= dateRange.end + 'T23:59:59'; // Include end of day
        // Role filtering is already handled in refreshData
        return matchesSearch && matchesDate;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchTerm, dateRange, currentUser.role]);

  // --- Analytics ---
  const expenseStats = useMemo(() => {
    const expenses = filteredTransactions.filter(t => t.type.startsWith('EXPENSE') && t.status === TransactionStatus.APPROVED);
    const byType: Record<string, number> = {};
    expenses.forEach(t => {
      const label = t.type.replace('EXPENSE_', '').replace('_', ' ');
      byType[label] = (byType[label] || 0) + t.amount;
    });
    return Object.entries(byType).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  const COLORS = ['#6366F1', '#EC4899', '#F59E0B', '#10B981', '#8B5CF6', '#EF4444', '#64748B'];

  const agedDebtors = useMemo(() => {
    // Find customers with active debts
    // 1. Unpaid bookings
    const debtorMap: Record<string, { customer: Customer, amount: number, oldestDate: string, count: number }> = {};

    bookings.forEach(b => {
      const balance = b.totalAmount - b.paidAmount;
      if (balance > 0 && b.status !== BookingStatus.CANCELLED) {
        if (!debtorMap[b.customerId]) {
          const customer = customers.find(c => c.id === b.customerId);
          if (customer) {
            debtorMap[b.customerId] = { customer, amount: 0, oldestDate: b.startDate, count: 0 };
          }
        }
        if (debtorMap[b.customerId]) {
          debtorMap[b.customerId].amount += balance;
          debtorMap[b.customerId].count += 1;
          if (new Date(b.startDate) < new Date(debtorMap[b.customerId].oldestDate)) {
            debtorMap[b.customerId].oldestDate = b.startDate;
          }
        }
      }
    });

    return Object.values(debtorMap).sort((a, b) => b.amount - a.amount);
  }, [bookings, customers]);

  const handleExportCSV = () => {
    const headers = ['Date', 'Type', 'Description', 'Amount', 'Status', 'Submitted By', 'Reference'];
    const rows = filteredTransactions.map(t => [
      new Date(t.date).toLocaleDateString(),
      t.type,
      `"${t.description.replace(/"/g, '""')}"`, // Escape quotes
      t.type.startsWith('INCOME') ? t.amount : -t.amount,
      t.status,
      t.submittedBy,
      t.referenceNumber || ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8,"
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `finance_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const handleTransactionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionForm.amount || !transactionForm.description) {
      toastService.error("Please provide Amount and Description.");
      return;
    }

    // All transactions are created as PENDING regardless of user role
    createTransaction({
      amount: parseFloat(transactionForm.amount),
      type: transactionForm.type,
      description: transactionForm.description,
      date: new Date(transactionForm.date).toISOString(),
      propertyId: transactionForm.propertyId || undefined,
      referenceNumber: transactionForm.referenceNumber || undefined,
      submittedBy: currentUser.name,
    });
    refreshData();
    handleCloseModal();
    setTransactionForm({ amount: '', type: TransactionType.INCOME_RENTAL, description: '', date: new Date().toISOString().split('T')[0], propertyId: '', referenceNumber: '', status: TransactionStatus.PENDING, submittedBy: 'user-1' });
    toastService.success("Transaction submitted for approval successfully.");
  };

  const deleteTransaction = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser.permissions.canDeleteTransactions) {
      alert('You do not have permission to delete transactions.');
      return;
    }
    if (window.confirm('Void this entry?')) {
      saveTransactions(transactions.filter(t => t.id !== id));
      refreshData();
    }
  };

  const handleApproveTransaction = async (id: string, notes: string) => {
    try {
      await updateTransactionStatus(id, TransactionStatus.APPROVED, currentUser.id, notes);
      await refreshData(); // Refresh data to show updated transaction status
    } catch (error) {
      console.error('Error approving transaction:', error);
    }
  };

  const handleRejectTransaction = async (id: string, notes: string) => {
    try {
      await updateTransactionStatus(id, TransactionStatus.REJECTED, currentUser.id, notes);
      await refreshData(); // Refresh data to show updated transaction status
    } catch (error) {
      console.error('Error rejecting transaction:', error);
    }
  };

  const handleApprovePayroll = async (id: string) => {
    try {
      const run = payrollRuns.find(r => r.id === id);
      if (!run) return;

      const updatedPayrollRuns = payrollRuns.map(r =>
        r.id === id
          ? { ...r, status: PayrollStatus.APPROVED, approvedBy: currentUser.id, approvedAt: new Date().toISOString() }
          : r
      );

      // Create Financial Transaction for the Payroll
      createTransaction({
        amount: run.totalAmount,
        type: TransactionType.EXPENSE_PAYROLL,
        description: `Monthly Payroll Run: ${new Date(run.year, run.month).toLocaleString('default', { month: 'long', year: 'numeric' })}`,
        date: new Date().toISOString(),
        status: TransactionStatus.APPROVED,
        submittedBy: 'system',
        approvedBy: currentUser.id,
        approvedAt: new Date().toISOString(),
        referenceNumber: `PAY-${run.month}-${run.year}`
      });

      await savePayrollRuns(updatedPayrollRuns);
      await refreshData();
      setViewingPayroll(null);
    } catch (error) {
      console.error('Error approving payroll:', error);
    }
  };

  const handleRejectPayroll = async (id: string) => {
    try {
      const updatedPayrollRuns = payrollRuns.map(run =>
        run.id === id
          ? { ...run, status: PayrollStatus.REJECTED, approvedBy: currentUser.id, approvedAt: new Date().toISOString() }
          : run
      );
      await savePayrollRuns(updatedPayrollRuns);
      await refreshData();
    } catch (error) {
      console.error('Error rejecting payroll:', error);
    }
  };

  if (isLoading) return <div className="flex h-96 items-center justify-center"><div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-8 pb-12 transition-all duration-700 animate-in fade-in slide-in-from-bottom-2">

      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Finance</h1>
          <p className="text-stone-500 text-xs mt-1 font-medium opacity-80">Wealth Tracking & Capital Flow</p>
        </div>
        {/* Control Deck */}
        <GlassCard className="p-6 flex flex-col lg:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4 w-full lg:w-auto">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
              <Calendar size={20} />
            </div>
            <div className="flex gap-4 items-center flex-1">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block pl-1">Period Start</label>
                <input type="date" className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 font-bold text-sm text-stone-800 outline-none focus:ring-2 focus:ring-purple-100"
                  value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} />
              </div>
              <div className="h-px w-4 bg-stone-300"></div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block pl-1">Period End</label>
                <input type="date" className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 font-bold text-sm text-stone-800 outline-none focus:ring-2 focus:ring-purple-100"
                  value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} />
              </div>
            </div>
          </div>
          <div className="flex gap-4 w-full lg:w-auto">
            <button onClick={handleExportCSV} className="flex-1 lg:flex-none px-6 py-3 bg-stone-100 text-stone-600 font-bold rounded-2xl hover:bg-stone-200 transition flex items-center justify-center gap-2 text-xs uppercase tracking-widest">
              <Download size={16} /> Export Report
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex-1 lg:flex-none bg-purple-600 text-white px-8 py-3 rounded-2xl font-bold shadow-xl hover:bg-purple-700 transition active:scale-95 flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
            >
              <Plus size={16} /> Record Entry
            </button>
          </div>
        </GlassCard>
      </div>

      {/* KPI Overlays */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Total Yield", val: `₵${metrics.income.toLocaleString()}`, icon: ArrowUpRight, col: "from-purple-600 to-purple-800 shadow-purple-600/20" },
          { label: "Capital Outflow", val: `₵${metrics.expenses.toLocaleString()}`, icon: ArrowDownRight, col: "from-purple-400 to-purple-600 shadow-purple-400/20" },
          { label: "Net Reserves", val: `₵${metrics.profit.toLocaleString()}`, icon: Wallet, col: "from-purple-800 to-purple-900 shadow-purple-900/20" },
          {
            label: "Arrears / Pending",
            val: `₵${metrics.outstanding.toLocaleString()}`,
            icon: AlertOctagon,
            col: "from-purple-300 to-purple-500 shadow-purple-300/20",
            description: "Unpaid bookings + pending payments"
          }
        ].map((kpi, i) => (
          <div key={i} className={`relative overflow-hidden group bg-gradient-to-br ${kpi.col} p-5 rounded-[2rem] shadow-xl text-white transform hover:-translate-y-1 transition-all duration-500`}>
            <kpi.icon className="absolute right-4 bottom-4 opacity-20" size={40} />
            <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest mb-1">{kpi.label}</p>
            <h3 className="text-xl font-bold tracking-tight">{kpi.val}</h3>
            {kpi.description && (
              <p className="text-white/60 text-[8px] font-medium tracking-wide bg-black/10 px-2 py-0.5 rounded-full w-fit backdrop-blur-sm mt-2">
                {kpi.description}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Analytics Engine */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
        <GlassCard className="p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-lg font-bold text-stone-800 tracking-tight">Performance Stream</h3>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1">Rolling 7-Day Matrix</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} /><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} /></linearGradient>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#d8b4fe" stopOpacity={0.3} /><stop offset="95%" stopColor="#d8b4fe" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#A8A29E', fontSize: 10, fontWeight: 700 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#A8A29E', fontSize: 10, fontWeight: 700 }} />
                <Tooltip contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', padding: '1rem' }} />
                <Area type="monotone" dataKey="income" stroke="#8b5cf6" strokeWidth={4} fill="url(#colorInc)" />
                <Area type="monotone" dataKey="expenses" stroke="#d8b4fe" strokeWidth={4} fill="url(#colorExp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <div className="space-y-8 w-full">
          {/* Pending Transactions - Authorization Queue */}
          {currentUser.permissions.canApproveTransactions && transactions.filter(t => t.status === TransactionStatus.PENDING).length > 0 && (
            <GlassCard className="p-8 border-2 border-purple-200 bg-purple-50/30">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-bold text-stone-800 tracking-tight">Finance Authorization Queue</h3>
                  <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest mt-1">Transactions Requiring Approval</p>
                </div>
                <div className="bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border border-purple-300">
                  {transactions.filter(t => t.status === TransactionStatus.PENDING).length} Pending
                </div>
              </div>
              <div className="space-y-3">
                {transactions.filter(t => t.status === TransactionStatus.PENDING).map(tx => (
                  <div key={tx.id} className="relative group overflow-hidden bg-white rounded-[1.5rem] p-6 border border-purple-200 hover:border-purple-300 transition-all shadow-sm hover:shadow-md">
                    <div className="absolute top-4 right-4">
                      <span className="bg-purple-100 text-purple-700 text-[8px] font-bold px-2 py-1 rounded-full uppercase tracking-widest border border-purple-300">
                        Awaiting Approval
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-[9px] font-bold px-3 py-1 rounded-full border ${tx.type.startsWith('INCOME') ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-stone-100 text-stone-500 border-stone-200'}`}>
                            {tx.type.replace('INCOME_', '').replace('EXPENSE_', '').replace(/_/g, ' ')}
                          </span>
                          {tx.bookingId && <span className="text-[9px] font-bold text-purple-400 uppercase tracking-widest">Booking #{tx.bookingId}</span>}
                        </div>
                        <p className="font-bold text-stone-800 tracking-tight">{tx.description}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <p className="text-xs font-bold text-stone-400 font-mono uppercase">{new Date(tx.date).toLocaleDateString()}</p>
                          <p className="text-xs font-bold text-stone-500">Submitted by: {tx.submittedBy}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className={`text-xl font-bold tracking-tighter ${tx.type.startsWith('INCOME') ? 'text-purple-600' : 'text-stone-800'}`}>
                          {tx.type.startsWith('INCOME') ? '+' : '-'}₵{tx.amount.toLocaleString()}
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRejectTransaction(tx.id, 'Transaction rejected by finance officer')}
                            className="p-2.5 text-purple-400 hover:bg-purple-50 rounded-xl transition border border-purple-200"
                            title="Reject Transaction"
                          >
                            <XCircle size={20} />
                          </button>
                          <button
                            onClick={() => handleApproveTransaction(tx.id, 'Transaction approved by finance officer')}
                            className="p-2.5 text-purple-600 hover:bg-purple-50 rounded-xl transition border border-purple-200"
                            title="Approve Transaction"
                          >
                            <CheckCircle size={20} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Pending Payrolls - Elevated */}
          {payrollRuns.filter(p => p.status === PayrollStatus.PENDING).map(run => (
            <div key={run.id} className="relative group overflow-hidden bg-white rounded-[2.5rem] border-2 border-purple-100 p-8 shadow-2xl shadow-purple-50">
              <div className="relative z-10 flex justify-between items-start">
                <div>
                  <div className="inline-flex items-center gap-2 bg-purple-50 text-purple-600 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest mb-4">
                    <AlertOctagon size={12} /> Pending Disbursement
                  </div>
                  <h3 className="text-lg font-bold text-stone-800 tracking-tight">{new Date(run.year, run.month).toLocaleString('default', { month: 'long', year: 'numeric' })} Payroll</h3>
                  <p className="text-stone-400 font-bold text-sm mt-1">{run.items.length} Personnel Line-Items</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-stone-900 tracking-tighter">₵{run.totalAmount.toLocaleString()}</p>
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1">Total Obligation</p>
                </div>
              </div>
              <div className="flex gap-4 mt-8">
                <button onClick={() => handleRejectPayroll(run.id)} className="py-4 px-6 bg-purple-50 text-purple-600 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-purple-100 border border-purple-200 transition">Reject</button>
                <button onClick={() => setViewingPayroll(run)} className="flex-1 py-4 bg-stone-100 text-stone-600 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-stone-200 transition">Inspect Ledger</button>
                <button onClick={() => handleApprovePayroll(run.id)} className="flex-1 py-4 bg-purple-600 text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-purple-700 shadow-xl shadow-purple-100 transition">Authorize Release</button>
              </div>
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><Briefcase size={80} strokeWidth={3} /></div>
            </div>
          ))}

          {/* Empty space filler/Alt Chart if no payroll */}
          {payrollRuns.filter(p => p.status === PayrollStatus.PENDING).length === 0 && (
            <GlassCard className="p-8 h-full flex flex-col justify-center items-center text-center">
              {currentUser.permissions.canApproveTransactions ? (
                <>
                  <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center text-stone-200 mb-6">
                    <ShieldCheck size={40} />
                  </div>
                  <h4 className="text-lg font-bold text-stone-800 tracking-tight">Financial Health: Optimal</h4>
                  <p className="text-xs font-bold text-stone-400 max-w-xs mt-2 uppercase tracking-widest leading-relaxed">All payroll obligations are current and account reconciliations are up to date.</p>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-blue-200 mb-6">
                    <History size={40} />
                  </div>
                  <h4 className="text-lg font-bold text-stone-800 tracking-tight">Transaction Approval Required</h4>
                  <p className="text-xs font-bold text-stone-400 max-w-xs mt-2 uppercase tracking-widest leading-relaxed">All financial transactions require approval from the finance officer before being processed.</p>
                </>
              )}
            </GlassCard>
          )}
        </div>
      </div>

      {/* Advanced Analytics Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Receivables Watchlist */}
        <GlassCard className="p-8 xl:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-stone-800 tracking-tight">Receivables Watchlist</h3>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1">Outstanding Client Obligations</p>
            </div>
            <div className="bg-purple-50 text-purple-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
              {agedDebtors.length} Active Profiles
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[9px] font-bold text-stone-400 uppercase tracking-widest border-b border-stone-100">
                  <th className="pb-4 pl-4">Client Entity</th>
                  <th className="pb-4">Oldest Due Date</th>
                  <th className="pb-4 text-center">Pending Items</th>
                  <th className="pb-4 text-right">Liability</th>
                  <th className="pb-4 text-right pr-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {agedDebtors.slice(0, 5).map((debtor, i) => (
                  <tr key={i} className="hover:bg-stone-50 transition-colors">
                    <td className="py-4 pl-4">
                      <p className="font-bold text-stone-800 text-sm">{debtor.customer.name}</p>
                      <p className="text-[10px] font-bold text-stone-400">{debtor.customer.phone}</p>
                    </td>
                    <td className="py-4 text-xs font-bold text-stone-500 font-mono">
                      {debtor.oldestDate}
                      <span className="ml-2 bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded text-[9px] tracking-wide">{Math.ceil((new Date().getTime() - new Date(debtor.oldestDate).getTime()) / (1000 * 3600 * 24))} Days</span>
                    </td>
                    <td className="py-4 text-center font-bold text-stone-800 text-sm">{debtor.count}</td>
                    <td className="py-4 text-right font-bold text-purple-600 text-sm">₵{debtor.amount.toLocaleString()}</td>
                    <td className="py-4 text-right pr-4">
                      <button onClick={() => window.open(`https://wa.me/${debtor.customer.phone.replace(/\D/g, '')}?text=Hello ${debtor.customer.name}, We are contacting you regarding your outstanding balance of GHS ${debtor.amount}. Please arrange payment promptly.`, '_blank')} className="p-2 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-100 transition inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                        <MessageCircle size={14} /> Notify
                      </button>
                    </td>
                  </tr>
                ))}
                {agedDebtors.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-stone-400 text-xs font-bold uppercase tracking-widest">No outstanding debts detected</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>

        {/* Expense Distribution Chart */}
        <GlassCard className="p-8">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-stone-800 tracking-tight">Expense Vector</h3>
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1">Capital Outflow by Category</p>
          </div>
          <div className="h-64 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expenseStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {expenseStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Total</p>
                <p className="text-xl font-bold text-stone-800">₵{expenseStats.reduce((a, b) => a + b.value, 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Visual Ledger */}
      <GlassCard className="overflow-hidden">
        <div className="p-8 border-b border-stone-100 flex flex-col lg:flex-row justify-between gap-6 items-center">
          <div className="flex gap-2 bg-stone-100 p-1.5 rounded-[1.5rem] overflow-x-auto no-scrollbar w-full lg:w-auto">
            {['ALL', 'INCOME', 'EXPENSE'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2 rounded-2xl text-[10px] uppercase font-bold tracking-widest transition-all
                    ${activeTab === tab ? 'bg-white text-purple-600 shadow-lg' : 'text-stone-400 hover:text-stone-800 hover:bg-stone-200/50'}
                  `}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="relative w-full lg:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
            <input
              type="text" placeholder="Audit description or code..."
              className="w-full pl-12 pr-6 py-4 bg-stone-50 border border-stone-200 rounded-[1.5rem] font-bold text-sm text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-4 focus:ring-purple-100 transition-all"
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-stone-50/50 border-b border-stone-100 text-[10px] font-bold uppercase text-stone-500 tracking-widest">
              <tr>
                <th className="px-8 py-6">Timeline</th>
                <th className="px-8 py-6">Audit Designation</th>
                <th className="px-8 py-6 text-center">Class / Portfolio</th>
                <th className="px-8 py-6 text-right">Yield Amount</th>
                <th className="px-8 py-6 text-right">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredTransactions.map(t => (
                <tr key={t.id} className="group hover:bg-stone-50/50 transition-colors">
                  <td className="px-8 py-6 text-xs font-bold text-stone-400 font-mono uppercase truncate">{new Date(t.date).toLocaleDateString()}</td>
                  <td className="px-8 py-6">
                    <p className="font-bold text-stone-800 tracking-tight">{t.description}</p>
                    {t.bookingId && <span className="text-[9px] font-bold text-purple-400 uppercase tracking-widest mt-1 block">Trace ID: {t.bookingId}</span>}
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className={`text-[9px] font-bold px-3 py-1 rounded-full border shadow-sm
                             ${t.type.startsWith('INCOME') ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-stone-100 text-stone-500 border-stone-200'}
                          `}>
                      {t.type.replace('INCOME_', '').replace('EXPENSE_', '').replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className={`px-8 py-6 text-right font-bold text-lg tracking-tighter ${t.type.startsWith('INCOME') ? 'text-purple-600' : 'text-stone-800'}`}>
                    {t.type.startsWith('INCOME') ? '+' : '-'}₵{t.amount.toLocaleString()}
                  </td>
                  <td className="px-8 py-6 text-right">
                    {/* Only Admin can delete Approved transactions. Finance can delete Pending only. */}
                    {((currentUser.role === UserRole.ADMIN) ||
                      (currentUser.role === UserRole.FINANCE && t.status !== TransactionStatus.APPROVED && currentUser.permissions.canDeleteTransactions)) && (
                        <button onClick={(e) => deleteTransaction(t.id, e)} className="p-2.5 text-stone-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition"><Trash2 size={16} /></button>
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Record Entry Modal - Redesign */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xl flex items-center justify-center z-50 p-6 animate-in fade-in duration-300">
          <GlassCard className="w-full max-w-lg bg-white shadow-[0_30px_100px_rgba(0,0,0,0.3)] overflow-hidden">
            <div className="px-8 py-6 border-b border-stone-100 bg-stone-50/30 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-bold text-stone-900 tracking-tight">Manual Entry Protocol</h3>
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1">Capital Management Interface</p>
              </div>
              <button type="button" onClick={handleCloseModal} className="w-10 h-10 rounded-full border border-stone-200 flex items-center justify-center text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition z-10 flex-shrink-0"><Plus className="rotate-45" size={24} /></button>
            </div>
            <form onSubmit={handleTransactionSubmit} className="p-8 space-y-6">
              <div>
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2 ml-1">Asset Pipeline</label>
                <select
                  className="w-full px-5 py-3.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold focus:ring-4 focus:ring-purple-100 outline-none"
                  value={transactionForm.type} onChange={e => setTransactionForm({ ...transactionForm, type: e.target.value as TransactionType })}
                >
                  {Object.values(TransactionType).map(v => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2 ml-1">Audit Description</label>
                <input
                  required type="text" placeholder="Service fee, equipment purchase, etc."
                  className="w-full px-5 py-3.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold focus:ring-4 focus:ring-purple-100 outline-none"
                  value={transactionForm.description} onChange={e => setTransactionForm({ ...transactionForm, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2 ml-1">Entry Amount (GH₵)</label>
                  <input
                    required type="number" step="0.01" min="0"
                    className="w-full px-5 py-3.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold focus:ring-4 focus:ring-purple-100 text-purple-600"
                    value={transactionForm.amount} onChange={e => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1.5 ml-1">Timeline</label>
                  <input
                    required type="date"
                    className="w-full px-5 py-3.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold focus:ring-4 focus:ring-purple-100"
                    value={transactionForm.date} onChange={e => setTransactionForm({ ...transactionForm, date: e.target.value })}
                  />
                </div>
              </div>

              {transactionForm.type.startsWith('EXPENSE') && (
                <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
                  <div className="flex gap-2 flex-wrap">
                    <p className="w-full text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1">Quick Select Category</p>
                    {[TransactionType.EXPENSE_FUEL, TransactionType.EXPENSE_UTILITIES, TransactionType.EXPENSE_MAINTENANCE, TransactionType.EXPENSE_OFFICE, TransactionType.EXPENSE_TRANSPORT].map(t => (
                      <button type="button" key={t} onClick={() => setTransactionForm({ ...transactionForm, type: t })}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition border ${transactionForm.type === t ? 'bg-purple-500 text-white border-purple-600' : 'bg-white text-purple-500 border-purple-200 hover:bg-purple-100'}`}>
                        {t.split('_')[1]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="pt-6 flex gap-4">
                <button type="button" onClick={handleCloseModal} className="flex-1 py-4 font-bold text-[10px] uppercase tracking-widest text-stone-400 hover:text-stone-900 transition">Abort Entry</button>
                <button type="submit" className="flex-1 py-4 bg-purple-600 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-xl shadow-purple-100 hover:bg-purple-700 transition">Commit Capital</button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {/* Viewing Payroll Ledger Modal */}
      {viewingPayroll && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xl flex items-center justify-center z-50 p-6 animate-in fade-in duration-300">
          <GlassCard className="w-full max-w-3xl bg-white shadow-[0_30px_100px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-10 py-8 border-b border-stone-100 bg-stone-50/50 shrink-0">
              <h3 className="text-3xl font-bold text-stone-900 tracking-tighter">Payroll Audit Ledger</h3>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1">{new Date(viewingPayroll.year, viewingPayroll.month).toLocaleString('default', { month: 'long', year: 'numeric' })} Global Run</p>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <table className="w-full text-left">
                <thead className="text-[9px] font-bold uppercase text-stone-400 tracking-[0.2em] border-b border-stone-100 sticky top-0 bg-white">
                  <tr>
                    <th className="px-8 py-4">Security ID / Personnel</th>
                    <th className="px-8 py-4 text-right">Yield</th>
                    <th className="px-8 py-4 text-right">Deduction</th>
                    <th className="px-8 py-4 text-right">Net Yield</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {viewingPayroll.items.map((item, id) => (
                    <tr key={id} className="hover:bg-stone-50 transition-colors">
                      <td className="px-8 py-4">
                        <p className="font-bold text-stone-800 tracking-tight">{item.employeeName}</p>
                        <span className="text-[9px] font-bold text-stone-300 uppercase font-mono">ID: {item.employeeId.toUpperCase()}</span>
                      </td>
                      <td className="px-8 py-4 text-right font-bold text-stone-500">₵{item.baseSalary.toLocaleString()}</td>
                      <td className="px-8 py-4 text-right font-bold text-purple-400">-₵{item.deductions.toLocaleString()}</td>
                      <td className="px-8 py-4 text-right font-bold text-stone-900">₵{item.netPay.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-10 border-t border-stone-100 bg-stone-50/50 shrink-0 flex flex-col sm:flex-row justify-between items-center gap-6">
              <div>
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1 block">Total Portfolio Obligation</span>
                <span className="text-4xl font-bold text-stone-900 tracking-tighter">₵{viewingPayroll.totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex gap-4 w-full sm:w-auto">
                <button onClick={() => setViewingPayroll(null)} className="flex-1 sm:px-10 py-4 font-bold text-[10px] uppercase tracking-widest text-stone-400 hover:text-stone-900 transition">Discard Ledger</button>
                {viewingPayroll.status === PayrollStatus.PENDING && (
                  <button onClick={() => handleApprovePayroll(viewingPayroll.id)} className="flex-1 sm:px-12 py-4 bg-purple-600 text-white rounded-[1.5rem] font-bold text-[10px] uppercase tracking-widest shadow-2xl hover:bg-purple-700 transition">Authorize Release</button>
                )}
              </div>
            </div>
          </GlassCard>
        </div>
      )}

    </div>
  );
};
