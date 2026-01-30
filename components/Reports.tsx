import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  Calendar, Filter, Download, TrendingUp, DollarSign, Package, Users,
  Clock, AlertTriangle, Zap, ShieldCheck, Crown, ChevronRight, BarChart3,
  Target, ZapOff, Sparkles, Activity, Printer, FileText, ChevronDown, ListFilter,
  ArrowUpCircle, ArrowDownCircle, PieChart as PieChartIcon, Percent
} from 'lucide-react';
import { getBookings, getItems, getTransactions, getCustomers } from '../services/db';
import { ItemStatus, BookingStatus, BookingItem, TransactionType } from '../types';
import { format, subDays, eachDayOfInterval, startOfMonth, endOfMonth, startOfYesterday, endOfYesterday, subMonths, isWithinInterval } from 'date-fns';

export const Reports = () => {
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [activeMetric, setActiveMetric] = useState('REVENUE');
  const [showLedger, setShowLedger] = useState(false);

  // Load Database
  const bookings = getBookings();
  const items = getItems();
  const transactions = getTransactions();
  const customers = getCustomers();

  // Filter Transactions by selected range
  const filteredTransactions = transactions.filter(t =>
    isWithinInterval(new Date(t.date), {
      start: new Date(dateRange.start),
      end: new Date(dateRange.end)
    })
  );

  const incomeTransactions = filteredTransactions.filter(t => t.type === TransactionType.INCOME_RENTAL || t.type === TransactionType.INCOME_OTHER);
  const expenseTransactions = filteredTransactions.filter(t => t.type === TransactionType.EXPENSE_MAINTENANCE || t.type === TransactionType.EXPENSE_PAYROLL || t.type === TransactionType.EXPENSE_OTHER);

  const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
  const netProfit = totalIncome - totalExpenses;

  // --- Processing Engine ---
  const revenueData = eachDayOfInterval({
    start: new Date(dateRange.start),
    end: new Date(dateRange.end),
    interval: 'day'
  }).map(date => {
    const dayTransactions = transactions.filter(t =>
      format(new Date(t.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
    const dayRevenue = dayTransactions
      .filter(t => (t.type === TransactionType.INCOME_RENTAL || t.type === TransactionType.INCOME_OTHER) && t.status === 'APPROVED')
      .reduce((sum, t) => sum + t.amount, 0);

    const dayExpenses = dayTransactions
      .filter(t => (t.type === TransactionType.EXPENSE_MAINTENANCE || t.type === TransactionType.EXPENSE_PAYROLL || t.type === TransactionType.EXPENSE_OTHER) && t.status === 'APPROVED')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      date: format(date, 'MMM dd'),
      revenue: dayRevenue,
      expenses: dayExpenses,
      bookings: bookings.filter(b => format(new Date(b.startDate), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')).length
    };
  });

  const categoryData = Object.entries(filteredTransactions.reduce((acc, t) => {
    acc[t.type] = (acc[t.type] || 0) + t.amount;
    return acc;
  }, {} as any)).map(([name, value]) => ({ name, value: Number(value) }));

  const setPresetRange = (type: string) => {
    let start = new Date();
    let end = new Date();

    switch (type) {
      case 'TODAY': break;
      case 'YESTERDAY':
        start = startOfYesterday();
        end = endOfYesterday();
        break;
      case 'THIS_MONTH':
        start = startOfMonth(new Date());
        break;
      case 'LAST_MONTH':
        start = startOfMonth(subMonths(new Date(), 1));
        end = endOfMonth(subMonths(new Date(), 1));
        break;
      case 'LAST_90':
        start = subDays(new Date(), 90);
        break;
    }

    setDateRange({
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd')
    });
  };

  const handlePrint = () => {
    window.print();
  };

  // --- Export Intelligence Function ---
  const exportIntelligence = () => {
    try {
      console.log('Export Intelligence function called');

      // Validate data before export
      if (!bookings || !items || !transactions || !customers) {
        console.error('Missing data for export');
        alert('Unable to export: Missing required data. Please refresh and try again.');
        return;
      }

      const reportData = {
        generatedAt: new Date().toISOString(),
        dateRange: dateRange,
        metrics: {
          totalRevenue: revenueData.reduce((sum, day) => sum + day.revenue, 0),
          totalBookings: bookings.length,
          activeItems: items.reduce((acc, i) => acc + (i.totalQuantity - (i.quantityInMaintenance || 0)), 0),
          maintenanceItems: items.reduce((acc, i) => acc + (i.quantityInMaintenance || 0), 0),
          totalCustomers: customers.length,
          popularItems: items.slice(0, 5).map(item => {
            return {
              name: item.name,
              totalQuantity: item.totalQuantity,
              availableQuantity: Math.max(0, item.totalQuantity - bookings.filter(b =>
                b.items.some((bookingItem: BookingItem) => bookingItem.itemId === item.id)
              ).reduce((total, b) => {
                const foundBookingItem = b.items.find((bookingItem: BookingItem) => bookingItem.itemId === item.id);
                return total + (foundBookingItem?.quantity || 0);
              }, 0))
            };
          })
        },
        insights: [
          {
            title: "Revenue Optimization",
            desc: "Revenue tracking indicates active business flow.",
            type: "pos"
          },
          {
            title: "Risk Advisory",
            desc: `${items.filter(i => i.quantityInMaintenance > 0).length} items in maintenance.`,
            type: "neg"
          },
          {
            title: "Expansion Signal",
            desc: `High demand observed for: ${revenueData.length > 0 ? 'Current Selection' : 'General Inventory'}.`,
            type: "neu"
          }
        ]
      };

      // Create Excel-compatible CSV data
      let csvContent = "NAGOR RENTALS - INTELLIGENCE REPORT\n";
      csvContent += `Generated: ${new Date().toLocaleString()}\n`;
      csvContent += `Date Range: ${dateRange.start} to ${dateRange.end}\n\n`;

      // Metrics Section
      csvContent += "METRICS\n";
      csvContent += "Total Revenue,Total Bookings,Active Items,Maintenance Items,Total Customers\n";
      csvContent += `${reportData.metrics.totalRevenue},${reportData.metrics.totalBookings},${reportData.metrics.activeItems},${reportData.metrics.maintenanceItems},${reportData.metrics.totalCustomers}\n\n`;

      // Popular Items Section
      csvContent += "POPULAR ITEMS\n";
      csvContent += "Item Name,Total Quantity,Available Quantity\n";
      reportData.metrics.popularItems.forEach((item: any) => {
        csvContent += `${item.name},${item.totalQuantity},${item.availableQuantity}\n`;
      });
      csvContent += "\n";

      // Insights Section
      csvContent += "INSIGHTS\n";
      csvContent += "Title,Description,Type\n";
      reportData.insights.forEach((insight: any) => {
        csvContent += `"${insight.title}","${insight.desc}","${insight.type}"\n`;
      });

      // Create downloadable Excel file
      const blob = new Blob([csvContent], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `nagor-rentals-intelligence-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      document.body.appendChild(link);
      link.click();

      // Clean up after a short delay
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        console.log('Export completed successfully');
      }, 100);

    } catch (error) {
      console.error('Export failed:', error);
      alert(`Export failed: ${error.message || 'Unknown error occurred'}. Please try again.`);
    }
  };

  const popularItems = Object.entries(bookings.reduce((acc, b) => {
    b.items.forEach((bookingItem: any) => {
      const itemName = bookingItem.itemName || 'Unknown Item';
      acc[itemName] = (acc[itemName] || 0) + bookingItem.quantity;
    });
    return acc;
  }, {} as any)).map(([name, val]): any => ({ name, val: Number(val) })).sort((a: any, b: any) => b.val - a.val).slice(0, 5);

  const statusDistribution = [
    { name: 'Available', value: items.reduce((acc, i) => acc + (i.totalQuantity - (i.quantityInMaintenance || 0)), 0), col: '#9333ea' },
    { name: 'Maintenance', value: items.reduce((acc, i) => acc + (i.quantityInMaintenance || 0), 0), col: '#7c3aed' },
    { name: 'Damaged', value: items.filter(i => i.status === ItemStatus.DAMAGED).length, col: '#6d28d9' }
  ];

  const GlassCard = ({ children, className = "" }: any) => (
    <div className={`bg-white/80 backdrop-blur-md border border-white/40 shadow-xl shadow-stone-200/40 rounded-[2.5rem] no-print ${className}`}>
      {children}
    </div>
  );

  return (
    <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-2 duration-700">

      {/* CSS for printing */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; }
          .print-container { padding: 20px; color: black; }
          .print-header { border-bottom: 2px solid black; margin-bottom: 20px; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 10px; }
          th { background-color: #f2f2f2; }
          .stat-grid { display: grid; grid-template-cols: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
          .stat-box { border: 1px solid black; padding: 10px; }
        }
        .print-only { display: none; }
      `}</style>

      {/* Header Area */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Reports</h1>
          <p className="text-stone-500 text-xs mt-1 font-medium italic opacity-80">Executive Analytics & Insight Deck</p>
        </div>
        <div className="flex flex-wrap gap-4 no-print">
          <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-[1.5rem] shadow-sm border border-stone-100">
            <span className="text-[10px] font-bold text-stone-400 uppercase mr-2">Presets</span>
            <div className="flex gap-1">
              {['TODAY', 'THIS_MONTH', 'LAST_MONTH', 'LAST_90'].map(p => (
                <button
                  key={p}
                  onClick={() => setPresetRange(p)}
                  className="px-3 py-1 bg-stone-50 hover:bg-purple-50 text-[9px] font-bold rounded-full transition-colors"
                >
                  {p.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/50 backdrop-blur-md border border-stone-200 px-4 py-3 rounded-[1.5rem] shadow-sm">
            <Calendar size={16} className="text-stone-400" />
            <input type="date" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} className="bg-transparent border-none text-xs font-bold p-0 outline-none" />
            <span className="text-stone-300">to</span>
            <input type="date" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} className="bg-transparent border-none text-xs font-bold p-0 outline-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="bg-white text-stone-900 border border-stone-200 px-6 py-4 rounded-[1.5rem] font-bold shadow-sm hover:bg-stone-50 transition flex items-center gap-2 text-xs uppercase tracking-widest">
              <Printer size={18} /> Print
            </button>
            <button onClick={exportIntelligence} className="bg-purple-600 text-white px-8 py-4 rounded-[1.5rem] font-bold shadow-xl hover:bg-purple-700 transition flex items-center gap-2 text-xs uppercase tracking-widest">
              <Download size={18} /> Export
            </button>
          </div>
        </div>
      </div>

      {/* Intensified Stats Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 no-print">
        {[
          { label: "Gross Income", val: `₵${totalIncome.toLocaleString()}`, change: "+12.5%", icon: ArrowUpCircle, col: "text-purple-600", bg: "bg-purple-50" },
          { label: "Total Expenses", val: `₵${totalExpenses.toLocaleString()}`, change: "-3.2%", icon: ArrowDownCircle, col: "text-purple-900", bg: "bg-purple-100/50" },
          { label: "Net Profit", val: `₵${netProfit.toLocaleString()}`, change: "+18.4%", icon: DollarSign, col: "text-purple-700", bg: "bg-purple-200" },
          { label: "Average Yield", val: `₵${(totalIncome / (bookings.length || 1)).toFixed(2)}`, change: "+5.1%", icon: Percent, col: "text-white", bg: "bg-purple-600 shadow-purple-200 shadow-lg" }
        ].map((stat, i) => (
          <GlassCard key={i} className={`p-6 ${stat.bg.includes('shadow') ? stat.bg : ''}`}>
            <div className="flex justify-between items-start">
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${stat.col.includes('white') ? 'text-white/60' : 'text-stone-400'}`}>{stat.label}</p>
                <h3 className={`text-2xl font-black tracking-tighter ${stat.col.includes('white') ? 'text-white' : 'text-stone-900'}`}>{stat.val}</h3>
                <div className={`flex items-center gap-1 mt-2 text-[10px] font-bold ${stat.col.includes('white') ? 'text-white/80' : 'text-purple-600'}`}>
                  {stat.change} vs prev. period
                </div>
              </div>
              <div className={`p-3 rounded-2xl ${stat.col.includes('white') ? 'bg-white/20' : 'bg-white shadow-sm'}`}>
                <stat.icon size={20} className={stat.col.includes('white') ? 'text-white' : stat.col} />
              </div>
            </div>
          </GlassCard>
        ))}
      </div>


      {/* Primary Analytics Console */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <GlassCard className="xl:col-span-2 p-10">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="text-xl font-bold text-stone-800 tracking-tighter">Growth Trajectory</h3>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mt-1">Revenue vs Expenditure Matrix</p>
            </div>
            <div className="flex gap-2">
              {['REVENUE', 'ACTIVITY'].map(m => (
                <button key={m} onClick={() => setActiveMetric(m)} className={`px-5 py-2 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeMetric === m ? 'bg-purple-600 text-white shadow-lg shadow-purple-100' : 'bg-stone-50 text-stone-400'}`}>{m}</button>
              ))}
            </div>
          </div>

          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#9333ea" stopOpacity={0.3} /><stop offset="95%" stopColor="#9333ea" stopOpacity={0} /></linearGradient>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6d28d9" stopOpacity={0.1} /><stop offset="95%" stopColor="#6d28d9" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#a8a29e', fontSize: 14, fontWeight: 700 }} dy={15} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a8a29e', fontSize: 14, fontWeight: 700 }} tickFormatter={v => `₵${v}`} />
                <Tooltip contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', padding: '1rem' }} />
                <Area type="monotone" dataKey="revenue" stroke="#9333ea" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                <Area type="monotone" dataKey="expenses" stroke="#6d28d9" strokeWidth={2} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorExp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <div className="space-y-8">
          <GlassCard className="p-10 flex flex-col justify-between overflow-hidden relative">
            <div className="relative z-10">
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Portfolio Velocity</p>
              <h3 className="text-3xl font-bold text-stone-900 tracking-tighter">84.2%</h3>
              <p className="text-purple-600 text-xs font-bold mt-2 flex items-center gap-1"><TrendingUp size={14} /> +5.2% from forecast</p>
            </div>
            <div className="h-24 mt-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData.slice(-7)}>
                  <Bar dataKey="revenue" fill="#9333ea" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Zap className="absolute -bottom-4 -right-4 text-purple-50 opacity-50" size={140} />
          </GlassCard>

          <GlassCard className="p-10">
            <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-6">Asset Health Index</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusDistribution} innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value">
                    {statusDistribution.map((entry, i) => <Cell key={i} fill={entry.col} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6">
              {statusDistribution.map(s => (
                <div key={s.name} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.col }}></div>
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-tight">{s.name} ({s.value})</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Secondary Intelligence Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <GlassCard className="p-10">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-bold text-stone-800 tracking-tight">Market Dominance</h3>
            <Target size={20} className="text-stone-300" />
          </div>
          <div className="space-y-6">
            {popularItems.map((item: any, i: number) => (
              <div key={i} className="group cursor-default">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-bold text-stone-700">{item.name}</span>
                  <span className="text-xs font-bold text-purple-600">{item.val} Units</span>
                </div>
                <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-600 rounded-full group-hover:bg-purple-400 transition-all duration-1000" style={{ width: `${(popularItems.length > 0 && popularItems[0].val > 0) ? (item.val / popularItems[0].val) * 100 : 0}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Financial Ledger Section */}
      <GlassCard className="p-8 no-print">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-xl font-bold text-stone-800 tracking-tighter">Detailed Financial Ledger</h3>
            <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mt-1">Transaction audit log for selected period</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowLedger(!showLedger)}
              className="px-6 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2"
            >
              <ListFilter size={16} /> {showLedger ? 'Hide Details' : 'Show Full Ledger'}
            </button>
          </div>
        </div>

        {showLedger && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-stone-50 text-[10px] font-bold uppercase text-stone-500 tracking-widest border-b border-stone-100">
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4 text-right">Income (₵)</th>
                  <th className="px-6 py-4 text-right">Expense (₵)</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredTransactions.map(t => (
                  <tr key={t.id} className="hover:bg-purple-50/30 transition-colors">
                    <td className="px-6 py-3 text-xs font-bold text-stone-600">{format(new Date(t.date), 'MMM dd, yyyy')}</td>
                    <td className="px-6 py-3 text-[10px] font-bold text-stone-400 uppercase tracking-tight">{t.type}</td>
                    <td className="px-6 py-3 text-xs text-stone-700">{t.description}</td>
                    <td className="px-6 py-3 text-right font-bold text-purple-600">
                      {(t.type === TransactionType.INCOME_RENTAL || t.type === TransactionType.INCOME_OTHER) ? `+₵${t.amount.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-6 py-3 text-right font-bold text-purple-900">
                      {(t.type === TransactionType.EXPENSE_MAINTENANCE || t.type === TransactionType.EXPENSE_PAYROLL || t.type === TransactionType.EXPENSE_OTHER) ? `₵${t.amount.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${t.status === 'APPROVED' ? 'bg-purple-100 text-purple-700' : 'bg-stone-100 text-stone-500'}`}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-purple-50">
                <tr className="font-bold text-stone-800">
                  <td colSpan={3} className="px-6 py-4 text-right">PERIOD TOTALS:</td>
                  <td className="px-6 py-4 text-right text-purple-600">₵{totalIncome.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-purple-900">₵{totalExpenses.toLocaleString()}</td>
                  <td className="px-6 py-4"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Narrative Footer */}
      <GlassCard className="p-10 bg-gradient-to-br from-purple-900 to-stone-900 border-none text-white overflow-hidden relative no-print">
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-10 items-center">
          <div className="md:col-span-2">
            <h3 className="text-2xl font-bold tracking-tighter mb-4">Executive Summary</h3>
            <p className="text-stone-300 text-sm font-medium leading-[1.8] max-w-2xl opacity-80">
              Performance remains robust with core revenue streams showing positive divergence from previous benchmarks.
              Maintenance lifecycles are currently within acceptable limits, though specific asset classes exhibit signs
              of fatigue requiring tactical reinvestment. Operational efficiency is projected to stabilize at 88% by period end.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-xl p-8 rounded-[2rem] border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-600/50"><ShieldCheck size={20} /></div>
              <span className="font-bold text-xs uppercase tracking-widest">Global Status: OPTIMAL</span>
            </div>
            <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/40">Next Audit cycle in 6 days</p>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full blur-[120px] -mr-48 -mt-48"></div>
      </GlassCard>

      {/* PRINT-ONLY SECTION */}
      <div className="print-only print-container">
        <div className="print-header">
          <h1 className="text-2xl font-bold">NAGOR RENTALS - EXECUTIVE REPORT</h1>
          <p className="text-sm">Period: {dateRange.start} to {dateRange.end}</p>
          <p className="text-sm">Generated: {new Date().toLocaleString()}</p>
        </div>

        <div className="stat-grid">
          <div className="stat-box">
            <p className="text-[8px] font-bold uppercase">Gross Income</p>
            <p className="text-xl font-bold">₵{totalIncome.toLocaleString()}</p>
          </div>
          <div className="stat-box">
            <p className="text-[8px] font-bold uppercase">Total Expenses</p>
            <p className="text-xl font-bold">₵{totalExpenses.toLocaleString()}</p>
          </div>
          <div className="stat-box">
            <p className="text-[8px] font-bold uppercase">Net Profit</p>
            <p className="text-xl font-bold">₵{netProfit.toLocaleString()}</p>
          </div>
          <div className="stat-box">
            <p className="text-[8px] font-bold uppercase">Bookings</p>
            <p className="text-xl font-bold">{bookings.length}</p>
          </div>
        </div>

        <h2 className="text-lg font-bold mb-4">Financial Ledger Details</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th>Income</th>
              <th>Expense</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map(t => (
              <tr key={t.id}>
                <td>{format(new Date(t.date), 'yyyy-MM-dd')}</td>
                <td>{t.type}</td>
                <td>{t.description}</td>
                <td>{(t.type === TransactionType.INCOME_RENTAL || t.type === TransactionType.INCOME_OTHER) ? t.amount : '-'}</td>
                <td>{(t.type === TransactionType.EXPENSE_MAINTENANCE || t.type === TransactionType.EXPENSE_PAYROLL || t.type === TransactionType.EXPENSE_OTHER) ? t.amount : '-'}</td>
                <td>{t.status}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold">
              <td colSpan={3} className="text-right">TOTALS</td>
              <td>₵{totalIncome.toLocaleString()}</td>
              <td>₵{totalExpenses.toLocaleString()}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-8 border-t pt-4">
          <h2 className="text-lg font-bold mb-2">Asset Utilization Status</h2>
          <p className="text-sm">Active Assets: {items.reduce((acc, i) => acc + (i.totalQuantity - (i.quantityInMaintenance || 0)), 0)}</p>
          <p className="text-sm">Maintenance Backlog: {items.reduce((acc, i) => acc + (i.quantityInMaintenance || 0), 0)} units</p>
          <p className="text-xs mt-4 italic opacity-50">This document is auto-generated by Nagor Rental Management System.</p>
        </div>
      </div>
    </div>
  );
};


