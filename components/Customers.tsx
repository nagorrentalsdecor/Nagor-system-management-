import React, { useState, useEffect } from 'react';
import {
  User,
  Phone,
  MapPin,
  Mail,
  Plus,
  Search,
  Edit2,
  Trash2,
  Users,
  TrendingUp,
  CreditCard,
  CalendarClock,
  MoreHorizontal,
  Star,
  MessageSquare,
  AlertTriangle,
  Upload,
  CreditCard as PaymentIcon,
  Smartphone,
  ShieldAlert,
  Printer,
  ShieldCheck,
  Crown,
  Zap,
  ChevronRight
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Customer, Booking } from '../types';
import { getCustomers, saveCustomers, getBookings, createAuditLog } from '../services/db';
import { toastService } from '../services/toast';


const GlassCard = ({ children, className = "" }: any) => (
  <div className={`bg-white/80 backdrop-blur-md border border-white/40 shadow-xl shadow-stone-200/40 rounded-[2.5rem] ${className}`}>
    {children}
  </div>
);

export const Customers = () => {
  // Data State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const navigate = useNavigate();
  const location = useLocation();

  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'BASIC' | 'KYC' | 'RISK'>('BASIC');
  const [viewingStatement, setViewingStatement] = useState<Customer | null>(null);
  const [filterMode, setFilterMode] = useState<'ACTIVE' | 'SPENT'>('ACTIVE');

  // Form State
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '', phone: '', address: '', email: '', notes: '',
    idCardUrl: '', guarantorName: '', guarantorPhone: '', isBlacklisted: false, riskNotes: ''
  });

  useEffect(() => {
    // Inject print styles into document head
    const style = document.createElement('style');
    style.setAttribute('data-print-styles', 'true');
    style.textContent = `
      @media print {
        * {
          margin: 0 !important;
          padding: 0 !important;
        }
        body {
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
        }
        html, body, #root, #root > div, #root > div > div {
          height: auto !important;
          width: 100% !important;
        }
        #printable-statement {
          display: block !important;
          visibility: visible !important;
          position: static !important;
          width: 100% !important;
          height: auto !important;
          margin: 0 !important;
          padding: 2rem !important;
          background: white !important;
          color: black !important;
          page-break-after: avoid !important;
        }
        #printable-statement * {
          display: block !important;
          visibility: visible !important;
          page-break-inside: avoid !important;
        }
        #printable-statement table {
          display: table !important;
          width: 100% !important;
          border-collapse: collapse !important;
        }
        #printable-statement table thead {
          display: table-header-group !important;
        }
        #printable-statement table tbody {
          display: table-row-group !important;
        }
        #printable-statement table tr {
          display: table-row !important;
          page-break-inside: avoid !important;
        }
        #printable-statement table td,
        #printable-statement table th {
          display: table-cell !important;
          padding: 0.5rem !important;
          border: 1px solid #ccc !important;
        }
        button, .no-print, svg, .shrink-0 {
          display: none !important;
        }
        .grid {
          display: grid !important;
        }
        .space-y-10 > * + * {
          margin-top: 2rem !important;
        }
        style {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      // Cleanup
      const printStyles = document.querySelector('style[data-print-styles="true"]');
      if (printStyles) printStyles.remove();
    };
  }, []);

  useEffect(() => {
    if (location.pathname === '/customers/add') {
      openModal();
    }
    refreshData();
  }, [location.pathname]);

  const refreshData = () => {
    setCustomers(getCustomers());
    setBookings(getBookings());
  };

  // --- Metrics & Analytics ---
  const getCustomerStats = (customerId: string) => {
    const customerBookings = bookings.filter(b => b.customerId === customerId);
    const totalSpent = customerBookings.reduce((acc, b) => acc + b.totalAmount, 0);
    const lastRental = customerBookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    return {
      totalSpent,
      count: customerBookings.length,
      lastDate: lastRental ? lastRental.createdAt : null,
      isPremium: totalSpent > 2000 || customerBookings.length > 5,
      isVip: totalSpent > 5000,
      outstandingAmount: customerBookings.filter(b => b.status !== 'RETURNED' && b.status !== 'CANCELLED').reduce((acc, b) => acc + (b.totalAmount - (b.paidAmount || 0)), 0),
      hasOverdue: customerBookings.some(b => b.status === 'OVERDUE'),
      topItems: Object.entries(customerBookings.flatMap(b => b.items).reduce((acc, i) => {
        acc[i.itemName] = (acc[i.itemName] || 0) + i.quantity;
        return acc;
      }, {} as any)).sort((a: any, b: any) => b[1] - a[1]).slice(0, 2).map(x => x[0])
    };
  };

  const globalMetrics = {
    total: customers.length,
    revenue: bookings.reduce((acc, b) => acc + b.totalAmount, 0),
    returning: customers.filter(c => getCustomerStats(c.id).count > 1).length,
    active: new Set(bookings.filter(b => b.status === 'ACTIVE').map(b => b.customerId)).size,
    blacklisted: customers.filter(c => c.isBlacklisted).length
  };

  // --- CRUD ---
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      toastService.error("Please provide Name and Contact Number.");
      return;
    }

    let updated = [...customers];
    if (editingCustomer) {
      updated = updated.map(c => c.id === editingCustomer.id ? { ...c, ...formData } as Customer : c);
      if (formData.isBlacklisted !== editingCustomer.isBlacklisted) {
        createAuditLog('UPDATE_CUSTOMER_RISK', `Partner ${formData.name} blacklist status changed to: ${formData.isBlacklisted}`);
      } else {
        createAuditLog('UPDATE_CUSTOMER', `Updated profile for: ${formData.name}`);
      }
    } else {
      updated.push({
        ...formData,
        id: Math.random().toString(36).substr(2, 9),
        totalRentals: 0,
      } as Customer);
      createAuditLog('CREATE_CUSTOMER', `Onboarded new partner: ${formData.name}`);
    }

    saveCustomers(updated);
    setCustomers(updated);
    closeModal();
    refreshData();
    toastService.success(editingCustomer ? "Partner profile updated." : "New partner onboarded successfully.");
  };

  const deleteCustomer = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Archive this client? All history will be preserved.')) {
      const updated = customers.filter(c => c.id !== id);
      saveCustomers(updated);
      setCustomers(updated);
      createAuditLog('DELETE_CUSTOMER', `Archived partner: ${customers.find(c => c.id === id)?.name}`);
    }
  };

  const openModal = (customer?: Customer) => {
    setActiveModalTab('BASIC');
    if (customer) {
      setEditingCustomer(customer);
      setFormData(customer);
    } else {
      setEditingCustomer(null);
      setFormData({
        name: '', phone: '', address: '', email: '', notes: '',
        idCardUrl: '', guarantorName: '', guarantorPhone: '', isBlacklisted: false, riskNotes: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
    if (location.pathname === '/customers/add') navigate('/customers');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };



  const filtered = customers
    .filter(c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm)
    )
    .sort((a, b) => {
      if (filterMode === 'SPENT') {
        return getCustomerStats(b.id).totalSpent - getCustomerStats(a.id).totalSpent;
      } else {
        const dateA = getCustomerStats(a.id).lastDate || '0000-00-00';
        const dateB = getCustomerStats(b.id).lastDate || '0000-00-00';
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      }
    });

  return (
    <div className="space-y-8 pb-12 transition-all duration-700 animate-in fade-in slide-in-from-bottom-2">

      {/* Visual Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Customers</h1>
          <p className="text-stone-500 text-xs mt-1 font-medium italic opacity-80">Partner Relationship Nexus & Asset Security</p>
        </div>

        <button
          onClick={() => navigate('/customers/add')}
          className="bg-purple-600 text-white px-8 py-4 rounded-[2rem] font-bold shadow-2xl shadow-purple-100 hover:bg-purple-700 transition active:scale-95 flex items-center gap-3 text-sm tracking-tight"
        >
          <Plus size={20} /> Onboard New Partner
        </button>
      </div>

      {/* Analytics Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Partner Base", val: globalMetrics.total, icon: Users, col: "from-purple-600 to-purple-800" },
          { label: "Portfolio Value", val: `₵${globalMetrics.revenue.toLocaleString()}`, icon: CreditCard, col: "from-purple-500 to-purple-700" },
          { label: "Risk Flags", val: globalMetrics.blacklisted, icon: ShieldAlert, col: "from-rose-500 to-rose-700" },
          { label: "Active Engagements", val: globalMetrics.active, icon: CalendarClock, col: "from-purple-300 to-purple-500" }
        ].map((kpi, i) => (
          <GlassCard key={i} className="p-5 relative overflow-hidden group border-none shadow-lg">
            <div className="relative z-10 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">{kpi.label}</p>
                <h3 className="text-lg font-bold text-stone-800 tracking-tight">{kpi.val}</h3>
              </div>
              <div className={`p-2.5 rounded-xl bg-gradient-to-br ${kpi.col} text-white shadow-xl`}>
                <kpi.icon size={18} />
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-stone-50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          </GlassCard>
        ))}
      </div>

      {/* Control Panel */}
      <GlassCard className="p-6 flex flex-col lg:flex-row justify-between gap-6 items-center">
        <div className="flex gap-4 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
            <input
              type="text" placeholder="Search elite partners..."
              className="w-full pl-12 pr-6 py-4 bg-stone-50 border border-stone-200 rounded-[1.5rem] font-bold text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-4 focus:ring-purple-100 transition-all shadow-inner"
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-bold text-stone-400 uppercase tracking-tight">
          <span>Sort By:</span>
          <button
            onClick={() => setFilterMode('ACTIVE')}
            className={`px-4 py-2 rounded-full border transition-all ${filterMode === 'ACTIVE' ? 'border-stone-200 bg-white text-stone-600 shadow-sm' : 'border-transparent text-stone-400 hover:text-stone-600'}`}
          >
            Recently Active
          </button>
          <button
            onClick={() => setFilterMode('SPENT')}
            className={`px-4 py-2 rounded-full border transition-all ${filterMode === 'SPENT' ? 'border-stone-200 bg-white text-stone-600 shadow-sm' : 'border-transparent text-stone-400 hover:text-stone-600'}`}
          >
            Lifetime Spent
          </button>
        </div>
      </GlassCard>

      {/* The CRM Showroom (Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {filtered.map(customer => {
          const stats = getCustomerStats(customer.id);
          return (
            <GlassCard key={customer.id} className="group hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 overflow-hidden bg-white/90">
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div className="relative">
                    <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-lg font-bold shadow-inner
                            ${stats.isVip ? 'bg-purple-100 text-purple-700' : 'bg-stone-100 text-stone-500'}
                         `}>
                      {customer.name.charAt(0)}
                    </div>
                    {stats.isVip && (
                      <div className="absolute -top-2 -right-2 bg-purple-600 p-1.5 rounded-full text-white shadow-lg border-2 border-white animate-bounce-slow">
                        <Crown size={12} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setViewingStatement(customer)} className="p-2.5 text-stone-400 hover:text-purple-600 hover:bg-stone-50 rounded-xl transition"><Printer size={16} /></button>
                    <button onClick={() => openModal(customer)} className="p-2.5 text-stone-400 hover:text-purple-600 hover:bg-stone-50 rounded-xl transition"><Edit2 size={16} /></button>
                    <button onClick={(e) => deleteCustomer(customer.id, e)} className="p-2.5 text-stone-400 hover:text-rose-600 hover:bg-stone-50 rounded-xl transition"><Trash2 size={16} /></button>
                  </div>
                </div>

                <div className="space-y-1 mb-6">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-stone-800 tracking-tight line-clamp-1">{customer.name}</h3>
                    {stats.isPremium && <Zap size={14} className="text-purple-500 fill-purple-500" />}
                  </div>
                  <div className="flex items-center flex-wrap gap-2 text-stone-400">
                    <span className="text-[10px] font-mono tracking-tighter bg-stone-50 px-2 py-0.5 rounded border border-stone-100">ID-{customer.id.toUpperCase()}</span>
                    <span className="text-[10px] uppercase font-bold text-purple-500 shadow-purple-100">{stats.isVip ? 'VIP Tier Partner' : stats.isPremium ? 'Gold Member' : 'Regular Partner'}</span>
                    {stats.topItems.map(it => (
                      <span key={it} className="text-[9px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">{it}</span>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 mb-8">
                  <div className="flex items-center gap-3 text-sm text-stone-600 font-bold bg-stone-50 p-3 rounded-2xl group-hover:bg-white border border-transparent group-hover:border-stone-100 transition-colors">
                    <div className="p-1.5 bg-white shadow-sm rounded-lg text-stone-400"><Phone size={14} /></div>
                    {customer.phone}
                  </div>
                  {customer.email && (
                    <div className="flex items-center gap-3 text-sm text-stone-600 font-bold bg-stone-50 p-3 rounded-2xl group-hover:bg-white border border-transparent group-hover:border-stone-100 transition-colors">
                      <div className="p-1.5 bg-white shadow-sm rounded-lg text-stone-400"><Mail size={14} /></div>
                      <span className="truncate">{customer.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-sm text-stone-600 font-bold bg-stone-50 p-3 rounded-2xl group-hover:bg-white border border-transparent group-hover:border-stone-100 transition-colors">
                    <div className="p-1.5 bg-white shadow-sm rounded-lg text-stone-400"><MapPin size={14} /></div>
                    <span className="truncate">{customer.address || 'Global/Remote'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-stone-50 rounded-3xl border border-stone-100 group-hover:bg-purple-50/50 group-hover:border-purple-100 transition-all">
                    <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-1">Rental Count</p>
                    <p className="text-base font-bold text-stone-800">{stats.count} Units</p>
                  </div>
                  <div className={`p-4 rounded-3xl border transition-all ${stats.outstandingAmount > 0 ? 'bg-purple-900/10 border-purple-200' : 'bg-stone-50 border-stone-100 group-hover:bg-purple-50/50 group-hover:border-purple-100'}`}>
                    <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-1">{stats.outstandingAmount > 0 ? 'Outstanding' : 'Total Yield'}</p>
                    <p className={`text-base font-bold ${stats.outstandingAmount > 0 ? 'text-purple-900' : 'text-purple-600'}`}>₵{stats.outstandingAmount > 0 ? stats.outstandingAmount.toLocaleString() : stats.totalSpent.toLocaleString()}</p>
                  </div>
                </div>

                {customer.isBlacklisted && (
                  <div className="mt-4 p-3 bg-rose-600 text-white rounded-2xl flex items-center gap-2 animate-pulse">
                    <ShieldAlert size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Blacklisted / High Risk</span>
                  </div>
                )}

                {stats.hasOverdue && !customer.isBlacklisted && (
                  <div className="mt-4 p-3 bg-purple-700 text-white rounded-2xl flex items-center gap-2">
                    <AlertTriangle size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Has Overdue Items</span>
                  </div>
                )}
              </div>

              <div className="flex border-t border-stone-100 h-14">
                <button
                  onClick={() => openWhatsApp(customer.phone)}
                  className="flex-1 border-r border-stone-50 text-[10px] font-bold uppercase text-purple-600 hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
                >
                  <MessageSquare size={14} /> WhatsApp
                </button>
                <button
                  onClick={() => window.location.href = `tel:${customer.phone}`}
                  className="flex-1 text-[10px] font-bold uppercase text-stone-500 hover:bg-stone-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Phone size={14} /> Call
                </button>
                <button
                  onClick={() => navigate(`/bookings?customer=${customer.id}`)}
                  className="flex-1 bg-stone-50 text-stone-400 hover:bg-stone-900 hover:text-white transition-all flex items-center justify-center"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Customer Modal Redesign */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xl flex items-center justify-center z-50 p-6 animate-in fade-in zoom-in-95 duration-300">
          <GlassCard className="w-full max-w-xl bg-white shadow-[0_30px_100px_rgba(0,0,0,0.3)] overflow-hidden">
            <div className="px-10 py-8 border-b border-stone-100 flex justify-between items-center bg-stone-50/30">
              <div>
                <h3 className="text-3xl font-bold text-stone-900 tracking-tighter">{editingCustomer ? 'Refine Profile' : 'Onboard Partner'}</h3>
                <p className="text-xs font-bold text-stone-400 uppercase tracking-[0.1em] mt-1">CRM Registration Protocol</p>
              </div>
              <button type="button" onClick={closeModal} className="w-12 h-12 rounded-full border border-stone-200 bg-white flex items-center justify-center text-stone-400 hover:text-stone-900 transition shadow-sm">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-10 space-y-8 flex-1 overflow-y-auto">
              <div className="flex gap-4 p-1.5 bg-stone-100 rounded-3xl mb-8">
                {(['BASIC', 'KYC', 'RISK'] as const).map(tab => (
                  <button
                    key={tab} type="button"
                    onClick={() => setActiveModalTab(tab)}
                    className={`flex-1 py-2 rounded-2xl text-[10px] font-bold tracking-widest transition-all ${activeModalTab === tab ? 'bg-white text-purple-600 shadow-md' : 'text-stone-400'}`}
                  >
                    {tab === 'BASIC' ? 'Basic Info' : tab === 'KYC' ? 'Identity / KYC' : 'Risk Management'}
                  </button>
                ))}
              </div>

              {/* Basic Section */}
              {activeModalTab === 'BASIC' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div>
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1.5 ml-1">Legal Full Name</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-purple-500 transition-colors" size={18} />
                      <input
                        required type="text" placeholder="John Doe Enterprise"
                        className="w-full pl-12 pr-6 py-4 bg-stone-50 border border-stone-200 rounded-2xl font-bold focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all"
                        value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1.5 ml-1">Direct Contact No.</label>
                      <div className="relative group">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-purple-500 transition-colors" size={18} />
                        <input
                          required type="text" placeholder="024 XXX XXXX"
                          className="w-full pl-12 pr-6 py-4 bg-stone-50 border border-stone-200 rounded-2xl font-bold focus:ring-4 focus:ring-purple-100 outline-none transition-all"
                          value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1.5 ml-1">E-Mail Address</label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-purple-500 transition-colors" size={18} />
                        <input
                          type="email" placeholder="client@example.com"
                          className="w-full pl-12 pr-6 py-4 bg-stone-50 border border-stone-200 rounded-2xl font-bold focus:ring-4 focus:ring-purple-100 outline-none transition-all"
                          value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1.5 ml-1">Operational Locale</label>
                    <div className="relative group">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-purple-500 transition-colors" size={18} />
                      <input
                        type="text" placeholder="Physical Address or GPS Code"
                        className="w-full pl-12 pr-6 py-4 bg-stone-50 border border-stone-200 rounded-2xl font-bold focus:ring-4 focus:ring-purple-100 outline-none transition-all"
                        value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* KYC Section */}
              {activeModalTab === 'KYC' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1.5 ml-1">Guarantor Name</label>
                      <input
                        type="text" placeholder="Emergency Contact Name"
                        className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-2xl font-bold focus:ring-4 focus:ring-purple-100 outline-none transition-all"
                        value={formData.guarantorName} onChange={e => setFormData({ ...formData, guarantorName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1.5 ml-1">Guarantor Phone</label>
                      <input
                        type="text" placeholder="Emergency Phone"
                        className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-2xl font-bold focus:ring-4 focus:ring-purple-100 outline-none transition-all"
                        value={formData.guarantorPhone} onChange={e => setFormData({ ...formData, guarantorPhone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1.5 ml-1">ID Document (Ghana Card / Passport)</label>
                    <div className="flex items-center gap-6">
                      <div className="flex-1 bg-stone-50 border-2 border-dashed border-stone-200 rounded-[2rem] h-32 flex flex-col items-center justify-center relative group overflow-hidden">
                        {formData.idCardUrl ? (
                          <img src={formData.idCardUrl} className="w-full h-full object-cover" />
                        ) : (
                          <>
                            <Upload className="text-stone-300 mb-2" />
                            <span className="text-[10px] font-bold text-stone-400 uppercase">Upload ID Photo</span>
                          </>
                        )}
                        <input
                          type="file" accept="image/*"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={(e) => handleFileUpload(e, 'idCardUrl')}
                        />
                      </div>
                      {formData.idCardUrl && (
                        <button type="button" onClick={() => setFormData({ ...formData, idCardUrl: '' })} className="text-rose-500 font-bold text-xs">Remove</button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Risk Management Section */}
              {activeModalTab === 'RISK' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className={`p-6 rounded-[2rem] border-2 transition-all ${formData.isBlacklisted ? 'bg-rose-50 border-rose-200' : 'bg-purple-50 border-purple-200'}`}>
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h4 className={`text-sm font-bold uppercase tracking-tight ${formData.isBlacklisted ? 'text-rose-700' : 'text-purple-600'}`}>
                          {formData.isBlacklisted ? 'Blacklist Active' : 'Account Status: Good'}
                        </h4>
                        <p className="text-[10px] font-bold text-stone-400 mt-1">Restrict rentals for this partner</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, isBlacklisted: !formData.isBlacklisted })}
                        className={`w-14 h-8 rounded-full relative transition-all ${formData.isBlacklisted ? 'bg-rose-600' : 'bg-stone-200'}`}
                      >
                        <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${formData.isBlacklisted ? 'left-7' : 'left-1'}`}></div>
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1.5 ml-1">Risk / Behavioral Notes</label>
                    <textarea
                      rows={3} placeholder="Reasons for blacklist, credit concerns, or special alerts..."
                      className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-2xl font-bold focus:ring-4 focus:ring-purple-100 outline-none transition-all resize-none"
                      value={formData.riskNotes} onChange={e => setFormData({ ...formData, riskNotes: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="pt-8 border-t border-stone-100 flex justify-end gap-5">
                <button type="button" onClick={closeModal} className="px-8 py-3 font-bold text-stone-400 hover:text-stone-900 transition uppercase tracking-widest text-xs">Abort</button>
                <button type="submit" className="px-10 py-4 bg-purple-600 text-white rounded-[1.5rem] font-bold shadow-xl shadow-purple-100 hover:bg-purple-700 transition active:scale-95 text-sm uppercase tracking-widest">Confirm Profile</button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
      {/* Statement / Ledger Modal */}
      {viewingStatement && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xl flex items-center justify-center z-50 p-6 animate-in fade-in duration-300">
          <GlassCard className="w-full max-w-4xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="no-print px-10 py-8 border-b border-stone-100 bg-stone-50/50 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-3xl font-bold text-stone-900 tracking-tighter">Partner Ledger</h3>
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1">Audit-Ready Transactional Statement</p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => window.print()}
                  className="bg-purple-600 text-white px-6 py-3 rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-purple-100 hover:bg-purple-700 transition flex items-center gap-2"
                >
                  <Printer size={16} /> Execute Print
                </button>
                <button type="button" onClick={() => setViewingStatement(null)} className="w-12 h-12 rounded-full border border-stone-200 bg-white flex items-center justify-center text-stone-400 hover:text-stone-900 transition"><Plus size={24} className="rotate-45" /></button>
              </div>
            </div>

            <div id="printable-statement" className="flex-1 overflow-y-auto p-12 space-y-10 selection:bg-purple-50">

              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-4xl font-bold text-stone-900 mb-2">{viewingStatement.name}</h2>
                  <p className="text-stone-500 font-bold tracking-tight">{viewingStatement.phone} • {viewingStatement.email || 'No Email'}</p>
                  <p className="text-stone-400 text-sm mt-1">{viewingStatement.address || 'Global Account'}</p>
                </div>
                <div className="text-right">
                  <div className="bg-stone-900 text-white px-4 py-1 rounded-lg font-bold text-[10px] uppercase tracking-widest inline-block mb-2">Statement of Account</div>
                  <p className="text-stone-400 font-bold text-[10px] uppercase tracking-widest">{new Date().toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-8">
                <div className="p-6 bg-stone-50 rounded-3xl border border-stone-100">
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Lifetime Vol.</p>
                  <p className="text-2xl font-bold text-stone-900">{bookings.filter(b => b.customerId === viewingStatement.id).length} Contracts</p>
                </div>
                <div className="p-6 bg-purple-50 rounded-3xl border border-purple-100">
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Total Yield</p>
                  <p className="text-2xl font-bold text-purple-600">₵{getCustomerStats(viewingStatement.id).totalSpent.toLocaleString()}</p>
                </div>
                <div className="p-6 bg-purple-900/10 rounded-3xl border border-purple-200">
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Outstanding</p>
                  <p className="text-2xl font-bold text-purple-900">₵{getCustomerStats(viewingStatement.id).outstandingAmount.toLocaleString()}</p>
                </div>
              </div>

              <div>
                <table className="w-full text-left">
                  <thead className="text-[10px] font-bold uppercase text-stone-400 tracking-widest border-b-2 border-stone-100">
                    <tr>
                      <th className="py-4">Timeline</th>
                      <th className="py-4">Reference</th>
                      <th className="py-4">Designation</th>
                      <th className="py-4 text-right">Fiscal Status</th>
                      <th className="py-4 text-right hover:text-purple-600 transition-colors">Yield</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-50">
                    {bookings.filter(b => b.customerId === viewingStatement.id)
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map(booking => (
                        <tr key={booking.id} className="text-sm">
                          <td className="py-4 font-bold text-stone-400 font-mono">{new Date(booking.createdAt).toLocaleDateString()}</td>
                          <td className="py-4 font-bold text-stone-800">#{booking.id}</td>
                          <td className="py-4">
                            <p className="font-bold text-stone-600">{booking.items.map(i => i.itemName).join(', ')}</p>
                            <p className="text-[10px] font-bold text-stone-300 uppercase tracking-widest">{booking.startDate} to {booking.endDate}</p>
                          </td>
                          <td className="py-4 text-right">
                            <div className="flex flex-col items-end gap-1">
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${booking.status === 'RETURNED' ? 'bg-purple-50 text-purple-600' : booking.status === 'OVERDUE' ? 'bg-purple-900/10 text-purple-900' : 'bg-purple-100 text-purple-700'}`}>
                                {booking.status}
                              </span>

                              {/* Itemized Penalties */}
                              {booking.penalties && booking.penalties.map((p, pIdx) => (
                                <span key={pIdx} className="text-[8px] font-bold px-2 py-0.5 rounded-full uppercase bg-rose-50 text-rose-600 border border-rose-100">
                                  {p.description}: ₵{p.amount.toLocaleString()}
                                </span>
                              ))}

                              {/* Legacy Late Fee Support */}
                              {!booking.penalties?.some(p => p.type === 'LATE_FEE') && booking.lateFee && booking.lateFee > 0 && (
                                <span className="text-[8px] font-bold px-2 py-0.5 rounded-full uppercase bg-amber-50 text-amber-800 border border-amber-200">
                                  Late Fee: ₵{booking.lateFee.toLocaleString()}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 text-right font-bold text-stone-900">₵{booking.totalAmount.toLocaleString()}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

    </div>
  );
};
