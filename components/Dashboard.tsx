import React, { useEffect, useState } from 'react';
import {
  Package,
  ShoppingCart,
  DollarSign,
  AlertCircle,
  TrendingUp,
  Users,
  ArrowRight,
  Clock,
  CheckCircle,
  Calendar,
  Zap,
  ChevronRight,
  Plus,
  LogOut,
  CreditCard,
  UserPlus
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { getDashboardMetrics, getTransactions, getBookings, isBookingOverdue, getApprovedTransactions } from '../services/db';
import { DashboardMetrics, Transaction, Booking, BookingStatus, UserRole } from '../types';

import { AuthContext } from '../App';

export const Dashboard = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [dueReturns, setDueReturns] = useState<Booking[]>([]);
  const { user } = React.useContext(AuthContext);

  useEffect(() => {
    const refreshDashboardData = () => {
      // 1. Get Metrics with User Context
      const data = getDashboardMetrics(user || undefined);
      setMetrics(data);

      // 2. Calculate Chart Data with User Context
      let approvedTransactions = getApprovedTransactions();

      // Filter transactions for chart if restricted user
      if (user && ![UserRole.ADMIN, UserRole.MANAGER, UserRole.FINANCE].includes(user.role)) {
        approvedTransactions = approvedTransactions.filter(t => t.submittedBy === user.name);
      }

      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split('T')[0];
      });

      const chart = last7Days.map(date => {
        const dayTotal = approvedTransactions
          .filter(t => t.date.startsWith(date) && t.type.includes('INCOME'))
          .reduce((acc, t) => acc + t.amount, 0);
        return {
          name: new Date(date).toLocaleDateString(undefined, { weekday: 'short' }),
          revenue: dayTotal
        };
      });
      setRevenueData(chart);

      const allBookings = getBookings();
      const recent = allBookings
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);
      setRecentBookings(recent);

      // Calculate Returns Due Today
      const today = new Date().toISOString().split('T')[0];
      const due = allBookings.filter(b => b.endDate === today && b.status === BookingStatus.ACTIVE);
      setDueReturns(due);
    };

    // Initial data load
    refreshDashboardData();

    // Set up real-time data refresh every 30 seconds
    const interval = setInterval(refreshDashboardData, 30000);

    return () => clearInterval(interval);
  }, []);

  if (!metrics) return (
    <div className="flex items-center justify-center h-96">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
    </div>
  );

  const navigate = (path: string) => {
    window.location.hash = `#${path}`;
  };

  const GlassCard = ({ children, className = "" }: any) => (
    <div className={`bg-white/80 backdrop-blur-md border border-white/40 shadow-xl shadow-stone-200/50 rounded-3xl ${className}`}>
      {children}
    </div>
  );

  const QuickAction = ({ icon: Icon, label, onClick, color }: any) => (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white border border-stone-100 shadow-sm hover:shadow-md hover:border-purple-100 transition-all active:scale-95 group"
    >
      <div className={`p-3 rounded-xl ${color} bg-opacity-10 transition-colors group-hover:scale-110 duration-300`}>
        <Icon size={22} className={color.replace('bg-', 'text-')} />
      </div>
      <span className="text-xs font-semibold text-stone-600 line-clamp-1">{label}</span>
    </button>
  );

  return (
    <div className="space-y-8 pb-12 transition-all duration-700 animate-in fade-in slide-in-from-bottom-2">

      {/* Dynamic Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Dashboard</h1>
          <p className="text-stone-500 text-xs mt-1 font-medium italic opacity-80">Command Center Portfolio Overview</p>
        </div>

        <GlassCard className="p-2 flex gap-1 bg-stone-50/50">
          <button onClick={() => navigate('/bookings/new')} className="bg-purple-600 text-white px-5 py-2 rounded-2xl font-bold shadow-lg shadow-purple-200 hover:bg-purple-700 transition flex items-center gap-2 text-sm">
            <Plus size={18} /> New Booking
          </button>
          <button onClick={() => navigate('/customers')} className="bg-white text-stone-700 px-5 py-2 rounded-2xl font-bold border border-stone-200 hover:bg-stone-50 transition text-sm">
            Customers
          </button>
        </GlassCard>
      </div>

      {/* KPI Glass Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Today's Revenue", val: `GH₵${metrics.todaysRevenue.toLocaleString()}`, sub: `${metrics.weeklyRevenue > 0 ? '+' : ''}GH₵${metrics.weeklyRevenue.toLocaleString()} this week`, icon: DollarSign, col: "from-purple-600 to-violet-600 shadow-purple-600/20" },
          { label: "Active Rentals", val: metrics.rentedItems, sub: `${metrics.overdueBookings} Overdue Bookings`, icon: ShoppingCart, col: "from-purple-500 to-purple-700 shadow-purple-500/20" },
          { label: "Items in Service", val: metrics.totalItems - metrics.maintenanceItems, sub: `${metrics.maintenanceItems} In Maintenance Queue`, icon: Package, col: "from-purple-400 to-purple-600 shadow-purple-400/20" },
          { label: "Our Customers", val: metrics.totalCustomers, sub: "Registered Partners", icon: Users, col: "from-purple-300 to-purple-500 shadow-purple-300/20" }
        ].map((kpi, i) => (
          <div key={i} className={`relative overflow-hidden group bg-gradient-to-br ${kpi.col} p-5 rounded-[2rem] shadow-xl text-white transform hover:-translate-y-1 transition-all duration-500`}>
            <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
            <kpi.icon className="absolute right-4 bottom-4 opacity-20 group-hover:scale-110 transition-transform" size={40} />
            <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest mb-1">{kpi.label}</p>
            <h3 className="text-xl font-bold mb-1 tracking-tight">{kpi.val}</h3>
            <p className="text-white/60 text-[9px] font-medium tracking-wide bg-black/10 px-2 py-0.5 rounded-full w-fit backdrop-blur-sm">{kpi.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Col: Analytics & Trends */}
        <div className="lg:col-span-2 space-y-8">

          {/* Revenue Area Chart */}
          <GlassCard className="p-8">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h3 className="text-xl font-bold text-stone-800 tracking-tight">Revenue Trajectory</h3>
                <p className="text-sm text-stone-400 font-medium">Growth analysis over the last 7 business days</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-purple-600">GH₵{metrics.monthlyRevenue.toLocaleString()}</p>
                <p className="text-[10px] uppercase font-bold text-stone-400 tracking-widest">Rolling Monthly Revenue</p>
              </div>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9333ea" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }} tickFormatter={(v) => `₵${v}`} />
                  <Tooltip
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                    cursor={{ stroke: '#9333ea', strokeWidth: 2, strokeDasharray: '4 4' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#9333ea" strokeWidth={4} fillOpacity={1} fill="url(#chartGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          {/* Bottom Split: Inventory vs Top Items */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Inventory Health Donut */}
            <GlassCard className="p-6">
              <h3 className="text-lg font-bold text-stone-800 mb-4 px-2">Inventory Health</h3>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metrics.inventoryHealth}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {metrics.inventoryHealth.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            {/* Top Revenue Items */}
            <GlassCard className="p-6">
              <h3 className="text-lg font-bold text-stone-800 mb-4 px-2">Top Performance</h3>
              <div className="space-y-4">
                {metrics.topItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 group hover:bg-white hover:shadow-md transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center font-bold text-purple-600 text-xs shadow-sm">
                        #{i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-stone-700 truncate max-w-[120px]">{item.name}</p>
                        <p className="text-[10px] text-stone-400 font-bold uppercase tracking-tight">Best Seller</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-purple-600">₵{item.revenue.toLocaleString()}</p>
                      <div className="w-16 h-1 bg-stone-200 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-purple-500" style={{ width: `${Math.max(20, 100 - (i * 20))}%` }}></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </div>

        {/* Right Col: Operations & Activity */}
        <div className="space-y-8">

          {/* Quick Actions Panel */}
          <GlassCard className="p-6">
            <h3 className="text-lg font-bold text-stone-800 mb-4">Express Commands</h3>
            <div className="grid grid-cols-2 gap-4">
              <QuickAction icon={UserPlus} label="Add Partner" onClick={() => navigate('/customers/add')} color="bg-purple-400" />
              <QuickAction icon={CreditCard} label="Record Payment" onClick={() => navigate('/finance/new')} color="bg-purple-600" />
              <QuickAction icon={Package} label="Add Asset" onClick={() => navigate('/inventory/add')} color="bg-purple-300" />
              <QuickAction icon={Calendar} label="New Booking" onClick={() => navigate('/bookings/new')} color="bg-purple-500" />
            </div>
          </GlassCard>

          {/* Recent Activity Feed */}
          <GlassCard className="p-6 flex flex-col min-h-[400px]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-stone-800">Operation Logs</h3>
              {dueReturns.length > 0 && (
                <div className="bg-purple-500 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest animate-pulse">
                  {dueReturns.length} Returns Due Today!
                </div>
              )}
              {dueReturns.length === 0 && (
                <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-full uppercase tracking-widest">Real-time</span>
              )}
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto pr-2 max-h-[500px]">
              {recentBookings.length === 0 ? (
                <div className="text-center py-12">
                  <Package size={40} className="mx-auto mb-2 text-stone-200" />
                  <p className="text-sm text-stone-400 font-medium">No system activity logged</p>
                </div>
              ) : (
                recentBookings.map((booking) => (
                  <div key={booking.id} className="relative pl-6 pb-4 border-l border-stone-200 last:pb-0">
                    <div className={`absolute left-[-5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white
                      ${booking.status === BookingStatus.ACTIVE ? 'bg-purple-600' : ''}
                      ${booking.status === BookingStatus.PENDING ? 'bg-purple-400' : ''}
                      ${booking.status === BookingStatus.RETURNED ? 'bg-purple-200' : ''}
                      ${isBookingOverdue(booking) ? 'bg-purple-900 animate-ping' : ''}
                    `}></div>
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-sm font-bold text-stone-800">{booking.customerName}</p>
                      <span className="text-[10px] font-mono text-stone-400">#{booking.id}</span>
                    </div>
                    <p className="text-xs text-stone-500 font-medium truncate mb-2">
                      {booking.items.map(i => `${i.quantity} ${i.itemName}`).join(', ')}
                    </p>
                    <div className="flex gap-2">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-tighter
                          ${isBookingOverdue(booking) ? 'bg-purple-900 text-white' :
                          booking.status === BookingStatus.ACTIVE ? 'bg-purple-50 text-purple-600' :
                            booking.status === BookingStatus.RETURNED ? 'bg-purple-100 text-purple-700' : 'bg-stone-100 text-stone-600'}
                       `}>
                        {isBookingOverdue(booking) ? 'Action Required: Late' : booking.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => navigate('/bookings')}
              className="mt-6 w-full py-4 text-xs font-bold text-stone-500 uppercase tracking-widest hover:text-purple-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-purple-100 rounded-2xl transition-all flex items-center justify-center gap-2 group"
            >
              Full Operational History <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </GlassCard>
        </div>

      </div>
    </div>
  );
};
