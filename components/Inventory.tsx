import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit2,
  AlertTriangle,
  Package,
  Tag,
  DollarSign,
  Activity,
  MoreHorizontal,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  LayoutGrid,
  Trash2,
  Zap,
  Layers,
  ChevronRight,
  Filter,
  Upload,
  Image as ImageIcon,
  Camera
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Item, ItemStatus, BookingStatus } from '../types';
import { getItems, saveItems, getBookings, createAuditLog, deleteItem as deleteItemFromDb } from '../services/db';
import { toastService } from '../services/toast';
import { ImageCapture } from './ImageCapture';


const GlassCard = ({ children, className = "" }: any) => (
  <div className={`bg-white/80 backdrop-blur-md border border-white/40 shadow-xl shadow-stone-200/40 rounded-[2rem] ${className}`}>
    {children}
  </div>
);

export const Inventory = () => {
  // Data State
  const [items, setItems] = useState<Item[]>([]);
  const [rentedCounts, setRentedCounts] = useState<Record<string, number>>({});
  const navigate = useNavigate();
  const location = useLocation();

  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');

  // Form State
  const [formData, setFormData] = useState<any>({
    name: '', category: '', totalQuantity: '', price: '', status: ItemStatus.AVAILABLE, imageUrl: ''
  });

  useEffect(() => {
    if (location.pathname === '/inventory/add') {
      openModal();
    }
    loadData();

    const handleSync = (e: any) => {
      if (e.detail?.table === 'items' || e.detail?.table === 'bookings') {
        loadData();
      }
    };
    window.addEventListener('db-sync', handleSync);
    return () => window.removeEventListener('db-sync', handleSync);
  }, [location.pathname]);

  const loadData = () => {
    const allItems = getItems();
    setItems(allItems);

    // Calculate currently rented counts for EACH item
    const bookings = getBookings();
    const now = new Date().getTime();
    const activeBookings = bookings.filter(b => {
      const start = new Date(b.startDate).getTime();
      const end = new Date(b.endDate).getTime();
      return (b.status === BookingStatus.ACTIVE || b.status === BookingStatus.OVERDUE || (b.status === BookingStatus.PENDING && start <= now && end >= now));
    });

    const counts: Record<string, number> = {};
    activeBookings.forEach(b => {
      b.items.forEach(bi => {
        counts[bi.itemId] = (counts[bi.itemId] || 0) + bi.quantity;
      });
    });
    setRentedCounts(counts);
  };

  const refreshData = () => {
    loadData();
  };

  // --- Metrics ---
  const metrics = {
    totalValue: items.reduce((acc, i) => acc + (i.price * i.totalQuantity), 0),
    totalUnits: items.reduce((acc, i) => acc + i.totalQuantity, 0),
    lowStock: items.filter(i => i.totalQuantity < 10).length,
    maintenance: items.filter(i => i.status === ItemStatus.MAINTENANCE).length
  };

  // --- CRUD Operations ---
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.category) {
      toastService.error("Please provide Item Designation and Category.");
      return;
    }

    // Ensure numbers are parsed correctly
    const finalData = {
      ...formData,
      totalQuantity: parseInt(String(formData.totalQuantity || 0)),
      price: parseFloat(String(formData.price || 0))
    };

    let updatedItems = [...items];
    if (editingItem) {
      updatedItems = updatedItems.map(i => i.id === editingItem.id ? { ...i, ...finalData } as Item : i);
      createAuditLog('UPDATE_ASSET', `Updated asset details for: ${finalData.name}`);
    } else {
      updatedItems.push({
        ...finalData,
        id: Math.random().toString(36).substr(2, 9),
      } as Item);
      createAuditLog('CREATE_ASSET', `Added new asset to inventory: ${finalData.name}. Qty: ${finalData.totalQuantity}`);
    }

    saveItems(updatedItems);
    setItems(updatedItems);
    closeModal();
    navigate('/inventory'); // Ensure URL clears if came from /add
    refreshData();
    toastService.success(editingItem ? "Asset updated successfully." : "New asset registered successfully.");
  };

  const deleteItem = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this asset?')) {
      deleteItemFromDb(id);
      const updated = items.filter(i => i.id !== id);
      setItems(updated);
      createAuditLog('DELETE_ASSET', `Deleted asset: ${items.find(i => i.id === id)?.name}`);
      closeModal();
    }
  };

  const openModal = (item?: Item) => {
    if (item) {
      setEditingItem(item);
      setFormData(item);
    } else {
      setEditingItem(null);
      setFormData({ name: '', category: '', totalQuantity: '', price: '', status: ItemStatus.AVAILABLE, imageUrl: '' });
    }
    setIsModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    if (location.pathname === '/inventory/add') {
      navigate('/inventory');
    }
  };

  // --- UI Components ---
  const categories = ['ALL', 'CHAIRS', 'TABLES', 'CANOPIES', 'LIGHTING', 'DRAPES', 'DECOR', 'TABLEWARE', 'CATERING', 'ELECTRONICS', 'FLOORING', 'OTHERS'];

  const filteredItems = items.filter(i => {
    const matchesSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase()) || i.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchedTab = activeTab === 'ALL' ? true : i.category.toUpperCase() === activeTab;
    return matchesSearch && matchedTab;
  });



  const StockRing = ({ total, rented, color }: { total: number, rented: number, color: string }) => {
    const pct = total > 0 ? (rented / total) * 100 : 0;
    const radius = 18;
    const circ = 2 * Math.PI * radius;
    const offset = circ - (pct / 100) * circ;

    return (
      <div className="relative flex items-center justify-center w-12 h-12">
        <svg className="w-12 h-12 transform -rotate-90">
          <circle cx="24" cy="24" r={radius} stroke="currentColor" strokeWidth="4" fill="transparent" className="text-stone-100" />
          <circle cx="24" cy="24" r={radius} stroke="currentColor" strokeWidth="4" fill="transparent"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className={color} />
        </svg>
        <span className="absolute text-[8px] font-bold">{Math.round((total - rented))}</span>
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-12 transition-all duration-700 animate-in fade-in slide-in-from-bottom-2">

      {/* Premium Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Inventory</h1>
          <p className="text-stone-500 text-xs mt-1 font-medium italic opacity-80">Global Asset Showroom & Portfolio</p>
        </div>

        <div className="flex gap-3">
          <GlassCard className="p-1 flex gap-1">
            <button onClick={() => setViewMode('GRID')} className={`px-4 py-2 rounded-2xl text-xs font-bold transition ${viewMode === 'GRID' ? 'bg-purple-600 text-white shadow-lg shadow-purple-200' : 'text-stone-500 hover:bg-stone-50'}`}>GRID</button>
            <button onClick={() => setViewMode('TABLE')} className={`px-4 py-2 rounded-2xl text-xs font-bold transition ${viewMode === 'TABLE' ? 'bg-purple-600 text-white shadow-lg shadow-purple-200' : 'text-stone-500 hover:bg-stone-50'}`}>TABLE</button>
          </GlassCard>
          <button
            onClick={() => navigate('/inventory/add')}
            className="bg-purple-600 text-white px-6 py-3 rounded-[1.5rem] font-bold shadow-xl shadow-purple-200 hover:bg-purple-700 transition active:scale-95 flex items-center gap-2"
          >
            <Plus size={20} /> Add Asset
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Asset Value", val: `₵${metrics.totalValue.toLocaleString()}`, icon: DollarSign, col: "from-purple-600 to-purple-800 shadow-purple-600/20" },
          { label: "Total Stock", val: metrics.totalUnits, icon: Package, col: "from-purple-500 to-purple-700 shadow-purple-500/20" },
          { label: "Low Alerts", val: metrics.lowStock, icon: AlertTriangle, col: "from-purple-400 to-purple-600 shadow-purple-400/20" },
          { label: "Down-Time", val: metrics.maintenance, icon: Activity, col: "from-purple-300 to-purple-500 shadow-purple-300/20" }
        ].map((kpi, i) => (
          <div key={i} className={`relative overflow-hidden group bg-gradient-to-br ${kpi.col} p-5 rounded-[2rem] shadow-xl text-white transform hover:-translate-y-1 transition-all duration-500`}>
            <kpi.icon className="absolute right-4 bottom-4 opacity-20" size={40} />
            <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest mb-1">{kpi.label}</p>
            <h3 className="text-xl font-bold tracking-tight">{kpi.val}</h3>
          </div>
        ))}
      </div>

      {/* Control Bar */}
      <GlassCard className="p-6">
        <div className="flex flex-col lg:flex-row justify-between gap-6 items-center">
          <div className="flex gap-2 bg-stone-100 p-1.5 rounded-[1.5rem] overflow-x-auto w-full">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`px-5 py-2 rounded-2xl text-[10px] uppercase font-bold tracking-widest transition-all whitespace-nowrap
                  ${activeTab === cat ? 'bg-white text-purple-600 shadow-md' : 'text-stone-500 hover:text-stone-800 hover:bg-stone-200/50'}
                `}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full lg:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
            <input
              type="text"
              placeholder="Filter showroom..."
              className="w-full pl-12 pr-6 py-4 bg-stone-50 border border-stone-200 rounded-[1.5rem] focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium text-stone-800"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </GlassCard>

      {/* Main Grid View */}
      {viewMode === 'GRID' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredItems.map(item => {
            const rented = rentedCounts[item.id] || 0;
            const available = item.totalQuantity - rented;
            const isLow = item.totalQuantity < 10;

            return (
              <GlassCard key={item.id} className="group overflow-hidden hover:shadow-2xl transition-all duration-500">
                <div className="relative h-48 bg-stone-100 border-b border-stone-100 group-hover:h-52 transition-all duration-500 overflow-hidden">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-stone-50 to-stone-200/50 text-stone-300">
                      <ImageIcon size={48} className="mb-2 opacity-50" />
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">No Visual</span>
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    <span className={`px-2 py-1 rounded-lg text-[9px] font-bold tracking-wider shadow-sm border backdrop-blur-md ${item.status === 'Available' ? 'bg-purple-500/90 text-white border-purple-400' : 'bg-purple-300/90 text-white border-purple-200'}`}>
                      {item.status}
                    </span>
                  </div>
                </div>
                <div className="p-6 bg-white">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-sm font-bold text-stone-800 tracking-tight line-clamp-1">{item.name}</h4>
                      <p className="text-[10px] font-medium text-stone-400 mt-0.5">{item.category}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-2 rounded-xl border border-stone-100">
                      <p className="text-[9px] font-bold text-stone-400 uppercase">Per Day</p>
                      <p className="text-sm font-bold text-stone-800">₵{item.price}</p>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-stone-100">
                      <p className="text-[9px] font-bold text-stone-400 uppercase">Available</p>
                      <p className="text-sm font-bold text-purple-600">
                        {Math.max(0, item.totalQuantity - rented - (item.quantityInMaintenance || 0))}/{item.totalQuantity}
                      </p>
                    </div>
                  </div>
                  {(item.quantityInMaintenance || 0) > 0 && (
                    <div className="mt-3 bg-purple-50 p-2 rounded-xl border border-purple-100 flex items-center gap-2">
                      <AlertTriangle size={12} className="text-purple-500" />
                      <p className="text-[9px] font-bold text-purple-600 uppercase tracking-wide">{item.quantityInMaintenance} Units in Repair</p>
                    </div>
                  )}
                </div>
                <div className="p-4 bg-white/50 flex justify-between items-center">
                  <div className="flex gap-1">
                    <button onClick={() => openModal(item)} className="p-2 text-stone-400 hover:text-purple-600 hover:bg-white rounded-xl transition shadow-sm"><Edit2 size={16} /></button>
                    <button onClick={(e) => deleteItem(item.id, e)} className="p-2 text-stone-400 hover:text-purple-900 hover:bg-white rounded-xl transition shadow-sm"><Trash2 size={16} /></button>
                  </div>
                  <span className={`text-[9px] font-bold px-3 py-1 rounded-full border
                    ${item.status === ItemStatus.AVAILABLE ? 'bg-purple-50 text-purple-700 border-purple-100' :
                      item.status === ItemStatus.MAINTENANCE ? 'bg-purple-900/10 text-purple-900 border-purple-200' : 'bg-stone-50 text-stone-700 border-stone-100'}
                  `}>
                    {item.status}
                  </span>
                </div>
              </GlassCard>
            );
          })}
        </div>
      ) : (
        <GlassCard className="overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-stone-50 border-b border-stone-100 text-[10px] font-bold uppercase text-stone-500 tracking-widest">
              <tr>
                <th className="px-8 py-6">Asset Details</th>
                <th className="px-8 py-6">Category</th>
                <th className="px-8 py-6 text-center">Availability</th>
                <th className="px-8 py-6 text-right">Daily Rate</th>
                <th className="px-8 py-6">Status</th>
                <th className="px-8 py-6 text-right">Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredItems.map(item => (
                <tr key={item.id} className="hover:bg-purple-50/30 transition-colors group">
                  <td className="px-8 py-4 font-bold text-stone-800">{item.name}</td>
                  <td className="px-8 py-4 text-xs font-bold text-stone-400 uppercase tracking-tight">{item.category}</td>
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-3 justify-center">
                      <div className="w-24 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500" style={{ width: `${Math.min(100, ((item.totalQuantity - (rentedCounts[item.id] || 0)) / item.totalQuantity) * 100)}%` }}></div>
                      </div>
                      <span className="text-[10px] font-bold text-stone-600">{item.totalQuantity - (rentedCounts[item.id] || 0)}/{item.totalQuantity}</span>
                    </div>
                  </td>
                  <td className="px-8 py-4 text-right font-bold text-purple-600">₵{item.price}</td>
                  <td className="px-8 py-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.status === ItemStatus.AVAILABLE ? 'bg-purple-50 text-purple-600' : 'bg-purple-900/10 text-purple-900'}`}>{item.status}</span>
                  </td>
                  <td className="px-8 py-4 text-right">
                    <button onClick={() => openModal(item)} className="p-2 text-stone-300 hover:text-purple-600 transition"><ChevronRight size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassCard>
      )}

      {/* Inventory Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xl flex items-center justify-center z-50 p-6 animate-in fade-in duration-300">
          <GlassCard className="w-full max-w-2xl bg-white shadow-[0_30px_100px_rgba(0,0,0,0.2)] overflow-hidden">
            <div className="px-8 py-6 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
              <div>
                <h3 className="text-2xl font-bold text-stone-900 tracking-tight">{editingItem ? 'Edit Asset Instance' : 'Register New Asset'}</h3>
                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mt-1">Asset Management Protocol</p>
              </div>
              <button onClick={closeModal} className="w-10 h-10 rounded-full bg-white border border-stone-200 flex items-center justify-center text-stone-400 hover:text-stone-900 transition shadow-sm">
                <Plus className="rotate-45" size={24} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="md:col-span-2">
                  <div className="flex gap-8 items-start">
                    <div className="w-48 shrink-0">
                      <ImageCapture
                        label="Asset Photo"
                        currentImage={formData.imageUrl}
                        onImageCaptured={(img) => setFormData({ ...formData, imageUrl: img })}
                        aspectRatio="square"
                      />
                    </div>
                    <div className="flex-1 space-y-6">
                      <div>
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2">Item Designation</label>
                        <input
                          required type="text" placeholder="e.g. Royal Banquet Table"
                          className="w-full px-5 py-3.5 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none transition font-bold"
                          value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2">Inventory Category</label>
                        <select
                          className="w-full px-5 py-3.5 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none font-bold appearance-none"
                          value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}
                        >
                          <option value="">Choose Class...</option>
                          {categories.filter(c => c !== 'ALL').map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2">Service Status</label>
                  <select
                    className="w-full px-5 py-3.5 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none font-bold"
                    value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as ItemStatus })}
                  >
                    {Object.values(ItemStatus).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2">Total Unit Count</label>
                  <input
                    required type="number" min="0"
                    className="w-full px-5 py-3.5 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none font-bold"
                    value={formData.totalQuantity} onChange={e => setFormData({ ...formData, totalQuantity: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2 text-purple-400">Maintenance Queue</label>
                  <div className="relative">
                    <AlertTriangle className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-300" size={16} />
                    <input
                      type="number" min="0" max={formData.totalQuantity}
                      placeholder="0"
                      className="w-full pl-10 pr-5 py-3.5 bg-purple-50 border border-purple-100 rounded-2xl focus:ring-4 focus:ring-purple-100 focus:border-purple-300 outline-none font-bold text-purple-600"
                      value={formData.quantityInMaintenance || ''}
                      onChange={e => setFormData({ ...formData, quantityInMaintenance: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <p className="text-[9px] font-bold text-purple-400 mt-1.5 ml-1">Units here are removed from availability</p>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2">Daily Rate (GH₵)</label>
                  <input
                    required type="number" min="0" step="0.01"
                    className="w-full px-5 py-3.5 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none font-bold text-purple-600"
                    value={formData.price} onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-8 border-t border-stone-100">
                {editingItem ? (
                  <button type="button" onClick={() => deleteItem(editingItem.id)} className="text-[10px] font-bold text-purple-900 uppercase tracking-widest hover:bg-purple-50 px-4 py-2 rounded-xl transition">Purge Asset</button>
                ) : <div />}

                <div className="flex gap-4">
                  <button type="button" onClick={closeModal} className="px-8 py-3 text-sm font-bold text-stone-500 hover:text-stone-900 transition">Discard</button>
                  <button type="submit" className="px-10 py-3 bg-purple-600 text-white rounded-2xl font-bold shadow-xl shadow-purple-200 hover:bg-purple-700 transition active:scale-95">Commit Asset</button>
                </div>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
};
