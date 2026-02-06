import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  Calendar, Download, TrendingUp, DollarSign, Package, Users,
  ArrowUpCircle, ArrowDownCircle, Printer, ListFilter, Search,
  Filter, ChevronDown, CheckCircle, AlertCircle, TrendingDown,
  LayoutGrid, Table as TableIcon
} from 'lucide-react';
import { getBookings, getItems, getTransactions, getCustomers } from '../services/db';
import { TransactionType } from '../types';
import { format, subDays, eachDayOfInterval, startOfMonth, startOfYesterday, endOfYesterday, subMonths, isWithinInterval, endOfMonth } from 'date-fns';

// --- Premium UI Components ---

const GlassCard = ({ children, className = "", onClick }: any) => (
  <div
    onClick={onClick}
    className={`bg-white/80 backdrop-blur-xl border border-white/40 shadow-xl shadow-stone-200/40 rounded-[2rem] transition-all duration-300 ${className}`}
  >
    {children}
  </div>
);

const StatCard = ({ title, value, subtext, icon: Icon, trend, colorClass }: any) => (
  <GlassCard className="p-6 relative overflow-hidden group hover:-translate-y-1">
    <div className="relative z-10 flex justify-between items-start">
      <div>
        <p className="text-[10px] uppercase tracking-widest font-bold text-stone-400 mb-2">{title}</p>
        <h3 className="text-2xl lg:text-3xl font-bold text-stone-900 tracking-tight">{value}</h3>
        {subtext && <p className={`text-xs font-bold mt-2 flex items-center gap-1 ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-rose-600' : 'text-stone-400'}`}>
          {trend === 'up' ? <TrendingUp size={12} /> : trend === 'down' ? <TrendingDown size={12} /> : null}
          {subtext}
        </p>}
      </div>
      <div className={`p-3 rounded-2xl ${colorClass} bg-opacity-10 text-opacity-100`}>
        <Icon size={20} className={colorClass.replace('bg-', 'text-')} />
      </div>
    </div>
    <div className={`absolute -bottom-6 -right-6 w-24 h-24 rounded-full opacity-5 blur-2xl transition-transform group-hover:scale-150 ${colorClass.replace('text-', 'bg-')}`}></div>
  </GlassCard>
);

export const Reports = () => {
  // --- State ---
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [viewMode, setViewMode] = useState<'VISUAL' | 'DATA'>('VISUAL');
  const [transactionsFilter, setTransactionsFilter] = useState('ALL');

  // Data State
  const [data, setData] = useState({
    bookings: [] as any[],
    items: [] as any[],
    transactions: [] as any[],
    customers: [] as any[]
  });
  const [isLoading, setIsLoading] = useState(true);

  // --- Data Syncing ---
  const refreshData = () => {
    setData({
      bookings: getBookings(),
      items: getItems(),
      transactions: getTransactions(),
      customers: getCustomers()
    });
    setIsLoading(false);
  };

  useEffect(() => {
    refreshData();
    const handleSync = () => refreshData();
    window.addEventListener('db-sync', handleSync);
    const interval = setInterval(refreshData, 5000); // Poll for updates
    return () => {
      window.removeEventListener('db-sync', handleSync);
      clearInterval(interval);
    };
  }, []);

  // --- Derived Metrics ---
  const filteredTransactions = data.transactions.filter(t =>
    isWithinInterval(new Date(t.date), {
      start: new Date(dateRange.start),
      end: new Date(dateRange.end)
    })
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const income = filteredTransactions
    .filter(t => (t.type === TransactionType.INCOME_RENTAL || t.type === TransactionType.INCOME_OTHER) && t.status === 'APPROVED')
    .reduce((sum, t) => sum + t.amount, 0);

  const expenses = filteredTransactions
    .filter(t => (t.type.includes('EXPENSE')) && t.status === 'APPROVED')
    .reduce((sum, t) => sum + t.amount, 0);

  const netProfit = income - expenses;
  const profitMargin = income > 0 ? ((netProfit / income) * 100).toFixed(1) : '0.0';

  // Chart Data Preparation
  const chartData = eachDayOfInterval({
    start: new Date(dateRange.start),
    end: new Date(dateRange.end),
  }).map(date => {
    const dayStr = format(date, 'yyyy-MM-dd');
    const dayTxs = filteredTransactions.filter(t => t.date.startsWith(dayStr) && t.status === 'APPROVED');
    return {
      date: format(date, 'MMM dd'),
      income: dayTxs.filter(t => t.type.includes('INCOME')).reduce((sum, t) => sum + t.amount, 0),
      expense: dayTxs.filter(t => t.type.includes('EXPENSE')).reduce((sum, t) => sum + t.amount, 0)
    };
  });

  // --- Actions ---
  const handlePrint = () => window.print();

  const handleExport = () => {
    const csvSettings = "data:text/csv;charset=utf-8,"
      + "Date,Type,Description,Amount,Status,SubmittedBy\n"
      + filteredTransactions.map(t =>
        `${t.date},${t.type},"${t.description}",${t.amount},${t.status},${t.submittedBy}`
      ).join("\n");

    const encodedUri = encodeURI(csvSettings);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `nagor_report_${dateRange.start}_${dateRange.end}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const setPreset = (type: string) => {
    const today = new Date();
    let start = today;
    let end = today;

    switch (type) {
      case 'TODAY': break;
      case 'YESTERDAY': start = end = subDays(today, 1); break;
      case 'WEEK': start = subDays(today, 7); break;
      case 'MONTH': start = startOfMonth(today); break;
      case 'QUARTER': start = subDays(today, 90); break;
    }
    setDateRange({ start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') });
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 bg-purple-200 rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-stone-100 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">

      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; -webkit-print-color-adjust: exact; }
          .glass-panel { border: 1px solid #ccc; box-shadow: none; }
        }
        .print-only { display: none; }
      `}</style>

      {/* --- Top Bar: Header & Controls --- */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Executive Reports</h1>
          <p className="text-stone-500 text-xs mt-1 font-bold uppercase tracking-widest opacity-80">
            Financial & Operational Intelligence
          </p>
        </div>

        <div className="w-full xl:w-auto flex flex-col sm:flex-row gap-4 no-print">
          {/* Date Presets */}
          <GlassCard className="p-1 px-2 grid grid-cols-4 gap-1 sm:flex sm:gap-1 w-full sm:w-auto">
            {['TODAY', 'WEEK', 'MONTH', 'QUARTER'].map(p => (
              <button
                key={p}
                onClick={() => setPreset(p)}
                className="px-2 sm:px-4 py-2 rounded-xl text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-stone-500 hover:bg-stone-50 hover:text-stone-900 transition whitespace-nowrap text-center"
              >
                {p}
              </button>
            ))}
          </GlassCard>

          {/* Date Picker */}
          <GlassCard className="p-2 px-4 flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
            <Calendar size={16} className="text-stone-400 shrink-0" />
            <div className="flex items-center gap-2 w-full">
              <input
                type="date"
                value={dateRange.start}
                onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                className="bg-transparent border-none text-xs font-bold text-stone-700 outline-none w-full sm:w-24 min-w-0"
              />
              <span className="text-stone-300 shrink-0">to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                className="bg-transparent border-none text-xs font-bold text-stone-700 outline-none w-full sm:w-24 min-w-0"
              />
            </div>
          </GlassCard>

          {/* Action Buttons */}
          <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={handleExport} className="flex-1 sm:flex-none p-3 bg-white border border-stone-200 rounded-2xl text-stone-600 hover:text-purple-600 hover:border-purple-200 transition shadow-sm flex justify-center items-center">
              <Download size={20} />
            </button>
            <button onClick={handlePrint} className="flex-1 sm:flex-none p-3 bg-stone-900 text-white rounded-2xl hover:bg-stone-800 transition shadow-lg shadow-stone-200 flex justify-center items-center">
              <Printer size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* --- KPI Cards Grid --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={`₵${income.toLocaleString()}`}
          icon={DollarSign}
          trend="up"
          subtext="Gross Income"
          colorClass="bg-purple-600 text-purple-600"
        />
        <StatCard
          title="Op. Expenses"
          value={`₵${expenses.toLocaleString()}`}
          icon={ArrowDownCircle}
          trend="down"
          subtext="Operational Costs"
          colorClass="bg-rose-500 text-rose-500"
        />
        <StatCard
          title="Net Profit"
          value={`₵${netProfit.toLocaleString()}`}
          icon={TrendingUp}
          subtext={`${profitMargin}% Margin`}
          colorClass="bg-emerald-500 text-emerald-500"
        />
        <StatCard
          title="Active Contracts"
          value={data.bookings.filter(b => isWithinInterval(new Date(b.createdAt), { start: new Date(dateRange.start), end: new Date(dateRange.end) })).length}
          icon={Package}
          subtext="Bookings Created"
          colorClass="bg-blue-500 text-blue-500"
        />
      </div>

      {/* --- Charts Section --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
        {/* Main Revenue Chart */}
        <GlassCard className="lg:col-span-2 p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-stone-800 tracking-tight">Financial Trajectory</h3>
            <div className="flex gap-2">
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-purple-600"><div className="w-2 h-2 rounded-full bg-purple-500"></div> Income</span>
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-rose-500"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Expense</span>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9333ea" stopOpacity={0.3} /><stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} /><stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#a8a29e', fontSize: 10, fontWeight: 700 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a8a29e', fontSize: 10, fontWeight: 700 }} tickFormatter={v => `₵${v / 1000}k`} />
                <RechartsTooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="income" stroke="#9333ea" strokeWidth={3} fillUrl="#colIncome" />
                <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={3} fillUrl="#colExpense" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Breakdown Donut */}
        <GlassCard className="p-6 flex flex-col">
          <h3 className="text-lg font-bold text-stone-800 tracking-tight mb-4">Cashflow Ratio</h3>
          <div className="flex-1 min-h-[200px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Profit', value: Math.max(0, netProfit), color: '#10b981' },
                    { name: 'Internal Cost', value: expenses, color: '#f43f5e' },
                  ]}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#f43f5e" />
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Margin</span>
              <span className="text-2xl font-black text-stone-800">{profitMargin}%</span>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs font-bold text-stone-500">
              <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Net Profit</span>
              <span>{((Math.max(0, netProfit) / (income || 1)) * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between text-xs font-bold text-stone-500">
              <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Op. Expenses</span>
              <span>{((expenses / (income || 1)) * 100).toFixed(0)}%</span>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* --- Transaction Ledger (Responsive) --- */}
      <GlassCard className="overflow-hidden no-print">
        <div className="p-6 border-b border-stone-100 bg-stone-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-stone-800 tracking-tight">Ledger</h3>
            <span className="px-2 py-1 rounded-lg bg-stone-200 text-stone-600 text-[10px] font-bold uppercase">{filteredTransactions.length} Records</span>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => setTransactionsFilter('ALL')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wide transition ${transactionsFilter === 'ALL' ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-500'}`}
            >
              All
            </button>
            <button
              onClick={() => setTransactionsFilter('INCOME')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wide transition ${transactionsFilter === 'INCOME' ? 'bg-purple-600 text-white' : 'bg-stone-100 text-stone-500'}`}
            >
              In
            </button>
            <button
              onClick={() => setTransactionsFilter('EXPENSE')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wide transition ${transactionsFilter === 'EXPENSE' ? 'bg-rose-500 text-white' : 'bg-stone-100 text-stone-500'}`}
            >
              Out
            </button>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-stone-50 text-[10px] uppercase font-bold text-stone-400 tracking-widest">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Ref/Desc</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 text-right">Officer</th>
                <th className="px-6 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredTransactions.filter(t => transactionsFilter === 'ALL' || t.type.includes(transactionsFilter)).map((t, i) => (
                <tr key={i} className="hover:bg-purple-50/10 transition-colors">
                  <td className="px-6 py-4 text-xs font-bold text-stone-500 font-mono">{format(new Date(t.date), 'MMM dd')}</td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-stone-800 truncate max-w-[200px]">{t.description}</p>
                    <p className="text-[10px] text-stone-400 font-mono">#{t.id.slice(0, 8)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide ${t.type.includes('INCOME') ? 'bg-purple-100 text-purple-700' : 'bg-rose-50 text-rose-600'}`}>
                      {t.type.replace('INCOME_', '').replace('EXPENSE_', '')}
                    </span>
                  </td>
                  <td className={`px-6 py-4 text-right font-bold font-mono ${t.type.includes('INCOME') ? 'text-purple-600' : 'text-stone-800'}`}>
                    {t.type.includes('INCOME') ? '+' : '-'}₵{t.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right text-xs font-bold text-stone-400">{t.submittedBy || 'System'}</td>
                  <td className="px-6 py-4 text-center">
                    {t.status === 'APPROVED' ?
                      <CheckCircle size={14} className="mx-auto text-emerald-500" /> :
                      <AlertCircle size={14} className="mx-auto text-amber-500" />
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden flex flex-col divide-y divide-stone-100">
          {filteredTransactions.filter(t => transactionsFilter === 'ALL' || t.type.includes(transactionsFilter)).map((t, i) => (
            <div key={i} className="p-5 flex justify-between items-start hover:bg-stone-50 transition active:bg-stone-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider font-mono">{format(new Date(t.date), 'MMM dd')}</span>
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${t.type.includes('INCOME') ? 'bg-purple-100 text-purple-700' : 'bg-rose-50 text-rose-600'}`}>
                    {t.type.split('_')[1]}
                  </span>
                </div>
                <p className="text-sm font-bold text-stone-800 line-clamp-1">{t.description}</p>
                <p className="text-[10px] text-stone-400 mt-1">Officer: {t.submittedBy || 'System'}</p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold font-mono ${t.type.includes('INCOME') ? 'text-purple-600' : 'text-stone-900'}`}>
                  {t.type.includes('INCOME') ? '+' : '-'}₵{t.amount.toLocaleString()}
                </p>
                {t.status !== 'APPROVED' && <span className="text-[9px] font-bold text-amber-500 uppercase">Pending</span>}
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* --- Print-Only Simple Table --- */}
      <div className="print-only">
        <h2 className="text-2xl font-bold mb-4">Financial Report</h2>
        <p className="mb-4">Period: {dateRange.start} to {dateRange.end}</p>
        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-black p-2">Date</th>
              <th className="border border-black p-2">Type</th>
              <th className="border border-black p-2">Description</th>
              <th className="border border-black p-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map(t => (
              <tr key={t.id}>
                <td className="border border-black p-2">{t.date.split('T')[0]}</td>
                <td className="border border-black p-2">{t.type}</td>
                <td className="border border-black p-2">{t.description}</td>
                <td className="border border-black p-2 text-right">₵{t.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
};
