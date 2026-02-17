import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Calendar, User, CheckCircle, Clock, AlertCircle, XCircle, ChevronRight,
  Filter, Download, MoreHorizontal, ArrowUpRight, Trash2, Minus, Printer, Zap, Crown,
  ShieldCheck, CreditCard, MessageSquare, History, Tag, ShoppingCart
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../App';
import { Booking, BookingStatus, Customer, Item, ItemStatus, Transaction, TransactionType, UserRole, TransactionStatus } from '../types';
import { getBookings, saveBookings, getCustomers, getItems, getTransactions, createTransaction, saveItems, checkAvailability, isBookingOverdue, calculateLateFee, createAuditLog } from '../services/db';
import { toastService } from '../services/toast';

const GlassCard = ({ children, className = "" }: any) => (
  <div className={`backdrop-blur-md border border-white/40 shadow-xl shadow-stone-200/40 rounded-[2.5rem] ${!className.includes('bg-') ? 'bg-white/80' : ''} ${className}`}>
    {children}
  </div>
);

export const Bookings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = React.useContext(AuthContext);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [view, setView] = useState<'list' | 'create'>('list');
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isLateFeeModalOpen, setIsLateFeeModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isLossModalOpen, setIsLossModalOpen] = useState(false);
  const [paymentBooking, setPaymentBooking] = useState<Booking | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [selectedLossItem, setSelectedLossItem] = useState<{ bookingId: string, itemId: string, itemName: string } | null>(null);
  const [lossAmount, setLossAmount] = useState<string>('');
  const [lateFeeAmount, setLateFeeAmount] = useState<string>('');
  const [printMode, setPrintMode] = useState<'invoice' | 'waybill'>('invoice');
  const [penaltyType, setPenaltyType] = useState<'LOSS' | 'DAMAGE' | 'OTHER'>('LOSS');
  const [penaltyDescription, setPenaltyDescription] = useState<string>('');
  const [inventorySearch, setInventorySearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setView(location.pathname === '/bookings/new' ? 'create' : 'list');
  }, [location.pathname]);

  useEffect(() => {
    refreshData();
    const handleSync = (e: any) => {
      if (e.detail?.table === 'items' || e.detail?.table === 'bookings' || e.detail?.table === 'customers') {
        refreshData();
      }
    };
    window.addEventListener('db-sync', handleSync);
    return () => window.removeEventListener('db-sync', handleSync);
  }, []);

  const refreshData = () => {
    setBookings(getBookings().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    setItems(getItems());
    setCustomers(getCustomers());
  };

  const [newBooking, setNewBooking] = useState({
    customerId: '',
    startDate: '',
    endDate: '',
    bookingDate: new Date().toISOString().split('T')[0], // Default to today
    selectedItems: [] as { item: Item; qty: number }[],
    notes: '',
    paidAmount: ''
  });

  const handleCreateBooking = () => {
    if (isSubmitting) return; // Prevent double submission
    setIsSubmitting(true);

    // 1. Basic Validation
    if (!newBooking.customerId) {
      toastService.error("Please select a partner/customer.");
      setIsSubmitting(false);
      return;
    }
    const customer = customers.find(c => c.id === newBooking.customerId);
    if (customer?.isBlacklisted) {
      toastService.error(`OPERATION BLOCKED: ${customer.name} is BLACKLISTED.\nReason: ${customer.riskNotes || 'High Risk'}`);
      setIsSubmitting(false);
      return;
    }
    if (!newBooking.bookingDate) {
      toastService.error("Please select the date of booking.");
      setIsSubmitting(false);
      return;
    }
    if (!newBooking.startDate || !newBooking.endDate) {
      toastService.error("Please select valid deployment and extraction dates.");
      setIsSubmitting(false);
      return;
    }
    if (newBooking.selectedItems.length === 0) {
      toastService.error("No assets selected for dispatch.");
      setIsSubmitting(false);
      return;
    }

    // 2. Logic Validation
    const start = new Date(newBooking.startDate);
    const end = new Date(newBooking.endDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Normalize to start of day for comparison

    if (start > end) {
      toastService.error("Extraction date cannot be before deployment date.");
      setIsSubmitting(false);
      return;
    }
    // Booking Date logic: we allow backdating, so no strict "past" check needed for bookingDate itself.
    // However, deployment date checks remain.
    if (end < now) {
      toastService.warning("Warning: You are creating a booking record for a past event.");
    }

    // 3. Availability Check
    const conflicts: string[] = [];
    newBooking.selectedItems.forEach(selection => {
      const available = checkAvailability(selection.item.id, newBooking.startDate, newBooking.endDate);
      if (available < selection.qty) {
        conflicts.push(`${selection.item.name} (Only ${available} available)`);
      }
    });

    if (conflicts.length > 0) {
      toastService.error(`Stock Shortage: ${conflicts[0]}`); // Show first conflict
      setIsSubmitting(false);
      return;
    }

    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) || 1;
    const totalAmount = newBooking.selectedItems.reduce((acc, curr) => acc + (curr.item.price * curr.qty * days), 0);
    const finalPaidAmount = Math.abs(parseFloat(newBooking.paidAmount || '0'));

    if (isNaN(finalPaidAmount)) {
      toastService.error("Invalid payment amount entered.");
      setIsSubmitting(false);
      return;
    }

    // Use the selected Booking Date logic
    const creationDate = new Date(newBooking.bookingDate);
    // Try to preserve current time if it is today, otherwise default to noon to avoid timezone shifts
    const isToday = newBooking.bookingDate === new Date().toISOString().split('T')[0];
    if (isToday) {
      const confirmNow = new Date();
      creationDate.setHours(confirmNow.getHours(), confirmNow.getMinutes(), confirmNow.getSeconds());
    } else {
      creationDate.setHours(12, 0, 0, 0);
    }

    const booking: Booking = {
      id: Math.random().toString(36).substr(2, 9).toUpperCase(),
      customerId: newBooking.customerId, customerName: customer?.name || 'Unknown',
      items: newBooking.selectedItems.map(i => ({ itemId: i.item.id, itemName: i.item.name, quantity: i.qty, priceAtBooking: i.item.price })),
      startDate: newBooking.startDate, endDate: newBooking.endDate, status: BookingStatus.PENDING,
      totalAmount: isNaN(totalAmount) ? 0 : totalAmount,
      paidAmount: 0, // Initial paid amount is 0 until Finance approves the transaction
      notes: newBooking.notes,
      createdAt: creationDate.toISOString()
    };

    saveBookings([booking, ...bookings]);
    createAuditLog('CREATE_BOOKING', `Created booking #${booking.id} for ${booking.customerName} (Date: ${newBooking.bookingDate})`);

    // Log initial payment if applicable
    if (finalPaidAmount > 0) {
      createTransaction({
        date: creationDate.toISOString(), // Match payment date to booking date
        amount: finalPaidAmount,
        type: TransactionType.INCOME_RENTAL,
        description: `Down payment: #${booking.id} (Pending Finance Approval)`,
        bookingId: booking.id,
        submittedBy: user?.name || 'bookings-system'
      });
    }

    setNewBooking({ customerId: '', startDate: '', endDate: '', bookingDate: new Date().toISOString().split('T')[0], selectedItems: [], notes: '', paidAmount: '' });
    navigate('/bookings');
    refreshData();
    toastService.success("Dispatch Request Processed Successfully");
    setIsSubmitting(false);
  };

  const updateStatus = (id: string, status: BookingStatus) => {
    const b = bookings.find(x => x.id === id);
    if (!b) return;

    // Handle Return Logic
    if (status === BookingStatus.RETURNED && isBookingOverdue(b)) {
      setPaymentBooking(b);
      // setLateFeeAmount(calculateLateFee(b).toString()); // Auto-calc disabled per request
      setLateFeeAmount('0');
      setIsLateFeeModalOpen(true);
      return;
    }

    // Handle Cancellation Logic with Refunds
    if (status === BookingStatus.CANCELLED && b.paidAmount > 0) {
      if (confirm(`This booking has a payment of ₵${b.paidAmount.toLocaleString()}.\n\nDo you want to REFUND this amount to the client?`)) {
        // 1. Create Refund Transaction
        createTransaction({
          amount: b.paidAmount,
          type: TransactionType.EXPENSE_OTHER,
          description: `Refund for Cancelled Booking #${b.id}`,
          date: new Date().toISOString().split('T')[0],
          submittedBy: user?.name || 'Admin',
          status: TransactionStatus.APPROVED
        });

        // 2. Cancel and Reset Payment
        saveBookings(bookings.map(x => x.id === id ? { ...x, status, paidAmount: 0, notes: `${x.notes || ''}\n[CANCELLED & REFUNDED ₵${x.paidAmount}]`.trim() } : x));
        createAuditLog('CANCEL_BOOKING', `Cancelled booking #${id} and processed refund of ₵${b.paidAmount}`);
        toastService.info("Booking cancelled and refund recorded.");
        refreshData();
        return;
      }
    }

    if (confirm(`Set status to ${status}?`)) {
      saveBookings(bookings.map(x => x.id === id ? { ...x, status } : x));
      createAuditLog('UPDATE_STATUS', `Updated booking #${id} to ${status}`);
      refreshData();
    }
  };

  const handleReportLoss = () => {
    if (!selectedLossItem || !lossAmount) return;
    const amt = Math.abs(parseFloat(lossAmount || '0')); // Ensure positive value

    // Get the current booking to show updated balance
    const currentBookings = getBookings();
    const bookingToUpdate = currentBookings.find(b => b.id === selectedLossItem.bookingId);
    if (!bookingToUpdate) return;

    // Force totalAmount to be a number to prevent string concatenation
    const currentTotal = Number(bookingToUpdate.totalAmount);
    const paid = Number(bookingToUpdate.paidAmount);
    const newTotalAmount = currentTotal + amt;
    const newOutstandingBalance = newTotalAmount - paid;

    // 1. Inventory impact if it's a permanent loss
    if (penaltyType === 'LOSS') {
      const currentItems = getItems();
      saveItems(currentItems.map(i =>
        i.id === selectedLossItem.itemId ? { ...i, totalQuantity: Math.max(0, i.totalQuantity - 1) } : i
      ));
    }

    // 2. Update booking with penalty array for transparency
    saveBookings(currentBookings.map(b =>
      b.id === selectedLossItem.bookingId
        ? {
          ...b,
          totalAmount: newTotalAmount,
          penalties: [
            ...(b.penalties || []),
            {
              type: penaltyType as 'LOSS' | 'DAMAGE' | 'OTHER',
              amount: amt,
              description: penaltyType === 'OTHER' ? penaltyDescription : `${penaltyType}: ${selectedLossItem.itemName}`,
              date: new Date().toISOString()
            }
          ],
          notes: `${b.notes || ''}\n[${penaltyType} REPORTED: ${penaltyType === 'OTHER' ? penaltyDescription : selectedLossItem.itemName} - Penalty ₵${amt}]`.trim()
        }
        : b
    ));

    createAuditLog('REPORT_PENALTY', `Reported ${penaltyType} for booking #${selectedLossItem.bookingId}: ${amt}`);
    alert(`${penaltyType} penalty of ₵${amt.toLocaleString()} applied.\n\nNow Owed: ₵${newOutstandingBalance.toLocaleString()}`);

    setIsLossModalOpen(false);
    setSelectedLossItem(null);
    setLossAmount('');
    setPenaltyDescription('');
    refreshData();
  };

  const handleLateFeeSubmit = () => {
    if (!paymentBooking) return;
    const fee = Math.abs(parseFloat(lateFeeAmount || '0'));

    const currentBookings = getBookings();
    const updated = currentBookings.map(b => b.id === paymentBooking.id ? {
      ...b,
      status: BookingStatus.RETURNED,
      totalAmount: Number(b.totalAmount) + fee,
      lateFee: fee,
      penalties: [
        ...(b.penalties || []),
        {
          type: 'LATE_FEE' as const,
          amount: fee,
          description: 'Overdue Return Penalty',
          date: new Date().toISOString()
        }
      ],
      notes: `${b.notes || ''}\n[OVERDUE RETURN: Late Fee ₵${fee.toLocaleString()} Applied]`.trim()
    } : b);

    saveBookings(updated);
    createAuditLog('RETURN_ITEMS', `Returned booking #${paymentBooking.id} with Late Fee: ${fee}`);

    setIsLateFeeModalOpen(false);
    setPaymentBooking(null);
    refreshData();
    toastService.info(`Items Returned. Late Fee of ₵${fee} added to balance.`);
  };

  const handlePrint = () => {
    window.print();
  };



  const filtered = bookings.filter(b => {
    const mS = b.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || b.id.toLowerCase().includes(searchTerm.toLowerCase());
    const mT = activeTab === 'ALL' || b.status === activeTab;
    return mS && mT;
  });

  return (
    <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-2 duration-700">

      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Bookings</h1>
          <div className="flex items-center gap-2 mt-2 text-stone-500 font-semibold bg-stone-100 px-3 py-1 rounded-full w-fit">
            <Tag size={14} className="text-purple-500" />
            <span className="text-xs uppercase tracking-wider">Dynamic Booking Logic</span>
          </div>
        </div>
        <div className="flex gap-4">
          <button onClick={() => navigate('/bookings/new')} className="bg-stone-900 text-white px-8 py-4 rounded-[1.5rem] font-bold shadow-xl hover:bg-stone-800 transition flex items-center gap-2 text-xs uppercase tracking-widest">
            <Plus size={18} /> New Reservation
          </button>
        </div>
      </div>

      {view === 'list' ? (
        <>
          {/* KPI Line */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: "Active Orders", val: bookings.filter(b => b.status === 'ACTIVE').length, col: "from-purple-600 to-purple-800", icon: Zap },
              { label: "Pending Pickups", val: bookings.filter(b => b.status === 'PENDING').length, col: "from-purple-400 to-purple-600", icon: Clock },
              { label: "Overdue Returns", val: bookings.filter(b => isBookingOverdue(b)).length, col: "from-purple-500 to-purple-900", icon: AlertCircle },
              { label: "Projected Yield", val: `₵${bookings.reduce((a, b) => a + b.totalAmount, 0).toLocaleString()}`, col: "from-purple-300 to-purple-500", icon: Crown }
            ].map((k, i) => (
              <GlassCard key={i} className="p-5 relative overflow-hidden group border-none shadow-lg">
                <div className="relative z-10 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">{k.label}</p>
                    <h3 className="text-xl font-bold text-stone-800 tracking-tight">{k.val}</h3>
                  </div>
                  <div className={`p-2.5 rounded-xl bg-gradient-to-br ${k.col} text-white shadow-xl`}>
                    <k.icon size={18} />
                  </div>
                </div>
                <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-stone-50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
              </GlassCard>
            ))}
          </div>

          {/* Table Container */}
          <GlassCard className="overflow-hidden bg-white/90">
            <div className="p-8 border-b border-stone-100 flex flex-col md:flex-row justify-between gap-6 items-center">
              <div className="flex gap-2 bg-stone-100 p-1.5 rounded-[1.5rem] overflow-x-auto no-scrollbar">
                {['ALL', ...Object.values(BookingStatus)].map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-2 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-purple-600 shadow-lg' : 'text-stone-400 hover:text-stone-800'}`}>{tab}</button>
                ))}
              </div>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                <input type="text" placeholder="Locate order..." className="w-full pl-12 pr-6 py-4 bg-stone-50 border border-stone-200 rounded-[1.5rem] font-bold text-sm text-stone-800 focus:outline-none focus:ring-4 focus:ring-purple-100 transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-stone-50/50 text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                    <th className="px-8 py-6">Reference ID</th>
                    <th className="px-8 py-6">Stakeholder</th>
                    <th className="px-8 py-6">Deployment Window</th>
                    <th className="px-8 py-6">Fiscal Status</th>
                    <th className="px-8 py-6">Dispatch State</th>
                    <th className="px-8 py-6 text-right">Utility</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100/50">
                  {filtered.map(b => (
                    <tr key={b.id} className="group hover:bg-stone-50/50 transition-all">
                      <td className="px-8 py-6">
                        <span className="text-xs font-bold text-stone-400 bg-stone-100 px-3 py-1 rounded-full">#{b.id}</span>
                      </td>
                      <td className="px-8 py-6">
                        <p className="font-bold text-stone-800 text-sm tracking-tight">{b.customerName}</p>
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-0.5">{b.items.length} Assets Attached</p>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2 text-xs font-bold text-stone-600">
                          <Calendar size={12} className="text-stone-300" />
                          <span>{b.startDate}</span>
                          <ChevronRight size={12} className="text-stone-300" />
                          <span>{b.endDate}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="w-32">
                          <div className="flex justify-between text-[10px] font-bold text-stone-400 mb-1.5">
                            <span>₵{b.paidAmount}</span>
                            <span>₵{b.totalAmount}</span>
                          </div>
                          <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-1000 ${b.paidAmount >= b.totalAmount ? 'bg-purple-900' : 'bg-purple-600'}`} style={{ width: `${Math.min(100, (b.paidAmount / b.totalAmount) * 100)}%` }}></div>
                          </div>
                          <div className="mt-2">
                            {b.paidAmount >= b.totalAmount ? (
                              <div className="text-[8px] font-bold text-purple-800 uppercase tracking-widest">
                                ✓ Paid in Full
                              </div>
                            ) : b.paidAmount > 0 ? (
                              <div className="text-[8px] font-bold text-purple-600 uppercase tracking-widest">
                                Partial Payment
                              </div>
                            ) : (
                              <div className="text-[8px] font-bold text-purple-400 uppercase tracking-widest">
                                Unpaid
                              </div>
                            )}
                          </div>
                          {b.notes && b.notes.includes('LOSS/DAMAGE REPORTED') && (
                            <div className="mt-1 text-[8px] font-bold text-rose-600 uppercase tracking-widest">
                              Penalty Applied
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${b.status === 'ACTIVE' ? 'bg-purple-50 text-purple-600 border-purple-100' : b.status === 'PENDING' ? 'bg-purple-900/10 text-purple-900 border-purple-200' : b.status === 'RETURNED' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-stone-50 text-stone-700 border-stone-100'}`}>{b.status}</span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2 transition-opacity flex-wrap max-w-[320px] ml-auto">
                          {/* Printing */}
                          <button
                            onClick={() => { setPaymentBooking(b); setIsPrintModalOpen(true); }}
                            className="px-3 py-1.5 bg-stone-100 text-stone-600 rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-stone-200 transition-all flex items-center gap-2"
                          >
                            <Printer size={12} /> Print
                          </button>

                          {/* Payment Actions */}
                          {(b.totalAmount - b.paidAmount) > 0 && b.paidAmount < b.totalAmount && (
                            <>
                              <button
                                onClick={() => { setPaymentBooking(b); setPaymentAmount(''); setIsPaymentModalOpen(true); }}
                                className="px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-purple-600 hover:text-white transition-all flex items-center gap-2"
                              >
                                <CreditCard size={12} /> Deposit
                              </button>
                              <button
                                onClick={() => { setPaymentBooking(b); setPaymentAmount((b.totalAmount - b.paidAmount).toString()); setIsPaymentModalOpen(true); }}
                                className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-purple-700 transition-all flex items-center gap-2"
                              >
                                <Zap size={12} /> Settlement
                              </button>
                            </>
                          )}

                          {/* Status Transitions */}
                          {b.status === BookingStatus.PENDING && (
                            <>
                              <button
                                onClick={() => updateStatus(b.id, BookingStatus.ACTIVE)}
                                className="px-3 py-1.5 bg-stone-900 text-white rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-stone-800 transition-all flex items-center gap-2"
                              >
                                <CheckCircle size={12} /> Pick Up
                              </button>
                              <button
                                onClick={() => updateStatus(b.id, BookingStatus.CANCELLED)}
                                className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-red-100 transition-all flex items-center gap-2"
                              >
                                <XCircle size={12} /> Cancel
                              </button>
                            </>
                          )}
                          {(b.status === BookingStatus.ACTIVE || b.status === BookingStatus.OVERDUE) && (
                            <button
                              onClick={() => updateStatus(b.id, BookingStatus.RETURNED)}
                              className="px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-amber-100 transition-all flex items-center gap-2"
                            >
                              <ArrowUpRight size={12} /> Return
                            </button>
                          )}

                          {/* Loss & Damage & General Penalty Reporting */}
                          {(b.status === BookingStatus.ACTIVE || b.status === BookingStatus.OVERDUE || b.status === BookingStatus.PENDING) && (
                            <button
                              onClick={() => {
                                if (b.items.length > 0) {
                                  setSelectedLossItem({ bookingId: b.id, itemId: b.items[0].itemId, itemName: b.items[0].itemName });
                                } else {
                                  setSelectedLossItem({ bookingId: b.id, itemId: 'NONE', itemName: 'N/A' });
                                }
                                setPenaltyType('LOSS');
                                setLossAmount('');
                                setPenaltyDescription('');
                                setIsLossModalOpen(true);
                              }}
                              className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-rose-100 transition-all flex items-center gap-2"
                              title="Report Loss, Damage, or add a General Fee/Penalty"
                            >
                              <AlertCircle size={12} /> Add Penalty / Loss
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </>
      ) : (
        <div className="max-w-7xl mx-auto space-y-10">
          {/* Progress Indication */}
          <div className="flex items-center justify-center gap-4 mb-2">
            {[
              { id: 1, label: 'Client', icon: User },
              { id: 2, label: 'Schedule', icon: Calendar },
              { id: 3, label: 'Assets', icon: Tag },
              { id: 4, label: 'Review', icon: ShieldCheck }
            ].map((step, i) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${newBooking.customerId ? 'bg-purple-600 text-white shadow-lg' : 'bg-stone-200 text-stone-500'}`}>
                    {newBooking.customerId && i === 0 ? <CheckCircle size={16} /> : i + 1}
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-stone-400">{step.label}</span>
                </div>
                {i < 3 && <div className="h-[2px] w-12 bg-stone-100 mb-6"></div>}
              </React.Fragment>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Main Configuration Panel */}
            <div className="lg:col-span-2 space-y-8">
              <GlassCard className="p-10 divide-y divide-stone-100">
                {/* Partner Selection */}
                <div className="pb-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl"><User size={20} /></div>
                    <div>
                      <h4 className="text-xl font-bold text-stone-800 tracking-tight">Partner Selection</h4>
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Identify the stakeholder for this deployment</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="relative group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-purple-500 transition-colors" size={18} />
                      <select
                        className="w-full pl-12 pr-6 py-4 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all appearance-none"
                        value={newBooking.customerId}
                        onChange={e => setNewBooking({ ...newBooking, customerId: e.target.value })}
                      >
                        <option value="">Select a Registered Partner...</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <button onClick={() => navigate('/customers/add')} className="h-14 border-2 border-dashed border-stone-200 rounded-2xl flex items-center justify-center gap-2 text-stone-400 font-bold text-xs hover:border-purple-400 hover:text-purple-600 transition-all">
                      <Plus size={16} /> Register New Partner
                    </button>
                  </div>
                </div>

                {/* Logistics window */}
                <div className="py-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl"><Calendar size={20} /></div>
                    <div>
                      <h4 className="text-xl font-bold text-stone-800 tracking-tight">Operational Window</h4>
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Deployment and extraction schedule</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-4">
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Date of Booking</label>
                      <div className="relative">
                        <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400" />
                        <input
                          type="date"
                          className="w-full pl-12 pr-6 py-4 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-purple-100"
                          value={newBooking.bookingDate}
                          onChange={e => setNewBooking({ ...newBooking, bookingDate: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Pickup Date</label>
                      <input
                        type="date"
                        className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-purple-100"
                        value={newBooking.startDate}
                        onChange={e => {
                          const newStart = e.target.value;
                          let itemsChanged = false;
                          let updatedItems = [...newBooking.selectedItems];

                          if (newStart && newBooking.endDate) {
                            updatedItems = updatedItems.map(selection => {
                              const avail = checkAvailability(selection.item.id, newStart, newBooking.endDate);
                              if (selection.qty > avail) {
                                itemsChanged = true;
                                return { ...selection, qty: Math.max(0, avail) }; // Clamp to available or 0
                              }
                              return selection;
                            }).filter(x => x.qty > 0); // Remove items that became 0
                          }

                          setNewBooking({ ...newBooking, startDate: newStart, selectedItems: updatedItems });
                          if (itemsChanged) {
                            toastService.info("Stock Adjusted: Some item quantities were reduced based on availability for the new dates.");
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Return Date</label>
                      <input
                        type="date"
                        className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-purple-100"
                        value={newBooking.endDate}
                        onChange={e => {
                          const newEnd = e.target.value;
                          let itemsChanged = false;
                          let updatedItems = [...newBooking.selectedItems];

                          if (newBooking.startDate && newEnd) {
                            updatedItems = updatedItems.map(selection => {
                              const avail = checkAvailability(selection.item.id, newBooking.startDate, newEnd);
                              if (selection.qty > avail) {
                                itemsChanged = true;
                                return { ...selection, qty: Math.max(0, avail) };
                              }
                              return selection;
                            }).filter(x => x.qty > 0);
                          }

                          setNewBooking({ ...newBooking, endDate: newEnd, selectedItems: updatedItems });
                          if (itemsChanged) {
                            toastService.info("Stock Adjusted: Some item quantities were reduced based on availability for the new dates.");
                          }
                        }}
                      />
                    </div>
                  </div>
                  {newBooking.startDate && newBooking.endDate && (
                    <div className="mt-8 p-4 bg-purple-50 rounded-2xl border border-purple-100 inline-flex items-center gap-3">
                      <Clock size={16} className="text-purple-600" />
                      <span className="text-xs font-bold text-purple-800 uppercase tracking-widest">Total Duration: {Math.ceil((new Date(newBooking.endDate).getTime() - new Date(newBooking.startDate).getTime()) / (1000 * 60 * 60 * 24)) || 1} Operational Days</span>
                    </div>
                  )}
                </div>

                {/* Asset Selection Grid */}
                <div className="pt-10">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><Tag size={20} /></div>
                      <div>
                        <h4 className="text-xl font-bold text-stone-800 tracking-tight">Inventory Dispatch</h4>
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Allocate assets to this project ({items.length} Available)</p>
                      </div>
                    </div>
                    <div className="relative w-64">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                      <input
                        type="text"
                        placeholder="Search inventory..."
                        className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-100 rounded-xl text-xs font-bold focus:outline-none"
                        value={inventorySearch}
                        onChange={(e) => setInventorySearch(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto no-scrollbar pb-4">
                    {items.filter(i =>
                      i.status !== ItemStatus.DAMAGED &&
                      (i.name.toLowerCase().includes(inventorySearch.toLowerCase()) || i.category.toLowerCase().includes(inventorySearch.toLowerCase()))
                    ).length === 0 ? (
                      <div className="col-span-2 flex flex-col items-center justify-center py-10 text-stone-400">
                        <Tag size={32} className="mb-2 opacity-50" />
                        <p className="text-xs font-bold uppercase tracking-widest">No matching assets found</p>
                      </div>
                    ) : (
                      items.filter(i =>
                        i.status !== ItemStatus.DAMAGED &&
                        (i.name.toLowerCase().includes(inventorySearch.toLowerCase()) || i.category.toLowerCase().includes(inventorySearch.toLowerCase()))
                      ).map(item => {
                        const selected = newBooking.selectedItems.find(x => x.item.id === item.id);
                        const isAvailableStatus = item.status === ItemStatus.AVAILABLE;
                        const availableQty = checkAvailability(item.id, newBooking.startDate, newBooking.endDate);

                        return (
                          <div
                            key={item.id}
                            className={`flex items-center gap-4 p-4 bg-white border rounded-3xl transition-all group ${selected ? 'border-purple-400 shadow-lg shadow-purple-50' : 'border-stone-100 hover:border-purple-200'} ${!isAvailableStatus || availableQty <= 0 ? 'opacity-60 grayscale' : ''}`}
                          >
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors overflow-hidden ${selected ? 'bg-purple-50 text-purple-600' : 'bg-stone-50 text-stone-400'}`}>
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                              ) : (
                                <Zap size={20} />
                              )}
                            </div>
                            <div className="flex-1 text-left">
                              <p className="text-xs font-bold text-stone-800">{item.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[9px] font-bold text-stone-400 uppercase tracking-tighter">₵{item.price} / day</span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-lg border ${availableQty - (selected?.qty || 0) > 0 ? 'text-purple-600 bg-purple-50 border-purple-100' : 'text-rose-600 bg-rose-50 border-rose-100'}`}>
                                  {Math.max(0, availableQty - (selected?.qty || 0))} Avail.
                                </span>
                                {!isAvailableStatus && (
                                  <span className="text-[8px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-lg uppercase border border-amber-100">{item.status}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center bg-stone-50 rounded-2xl p-1 gap-1">
                              {selected && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...newBooking.selectedItems];
                                      const idx = updated.findIndex(x => x.item.id === item.id);
                                      if (updated[idx].qty > 1) updated[idx].qty -= 1;
                                      else updated.splice(idx, 1);
                                      setNewBooking({ ...newBooking, selectedItems: updated });
                                    }}
                                    className="w-8 h-8 rounded-xl bg-white text-stone-400 hover:text-rose-500 flex items-center justify-center transition-colors border border-stone-100"
                                  >
                                    <Minus size={14} />
                                  </button>
                                  <input
                                    type="number"
                                    min="1"
                                    className="w-10 text-center text-xs font-bold text-purple-600 bg-transparent outline-none focus:ring-0 border-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    value={selected.qty}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value);
                                      const available = checkAvailability(item.id, newBooking.startDate, newBooking.endDate);

                                      if (isNaN(val) || val < 1) return;

                                      if (val > available) {
                                        toastService.warning(`Insufficient Stock: Only ${available} units available.`);
                                        setNewBooking({ ...newBooking, selectedItems: newBooking.selectedItems.map(x => x.item.id === item.id ? { ...x, qty: available } : x) });
                                      } else {
                                        setNewBooking({ ...newBooking, selectedItems: newBooking.selectedItems.map(x => x.item.id === item.id ? { ...x, qty: val } : x) });
                                      }
                                    }}
                                  />
                                </>
                              )}
                              <button
                                type="button"
                                disabled={availableQty <= 0 && !selected}
                                onClick={() => {
                                  const available = checkAvailability(item.id, newBooking.startDate, newBooking.endDate);
                                  const currentQty = selected ? selected.qty : 0;

                                  if (available <= 0) {
                                    toastService.warning(`Item Unavailable: ${item.name} is out of stock for these dates.`);
                                    return;
                                  }

                                  if (currentQty >= available) {
                                    toastService.warning(`Insufficient Stock: Only ${available} units of ${item.name} are available for these dates.`);
                                    return;
                                  }

                                  if (selected) {
                                    setNewBooking({ ...newBooking, selectedItems: newBooking.selectedItems.map(x => x.item.id === item.id ? { ...x, qty: x.qty + 1 } : x) });
                                  } else {
                                    setNewBooking({ ...newBooking, selectedItems: [...newBooking.selectedItems, { item, qty: 1 }] });
                                  }
                                }}
                                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${selected ? 'bg-purple-600 text-white shadow-md' : availableQty <= 0 ? 'bg-stone-100 text-stone-300 cursor-not-allowed' : 'bg-white text-stone-400 hover:text-purple-600 border border-stone-100'}`}
                              >
                                {selected ? <Plus size={14} /> : <Plus size={14} />}
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )
                    }
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Side Invoice Preview - Pro Forma */}
            <div className="space-y-8">
              <GlassCard className="p-8 sticky top-8 bg-stone-900 text-white overflow-hidden">
                <div className="relative z-10 flex flex-col h-full min-h-[600px]">
                  <div className="flex justify-between items-center mb-10 pb-6 border-b border-white/5">
                    <div>
                      <h5 className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-300">Pro Forma Invoice</h5>
                      <p className="text-xl font-bold tracking-tighter mt-1 text-white">Order Summary</p>
                    </div>
                    <Tag size={20} className="text-purple-400 opacity-50" />
                  </div>

                  <div className="flex-1 space-y-6">
                    {newBooking.selectedItems.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center py-20 opacity-20">
                        <Zap size={48} className="mb-4" />
                        <p className="text-[10px] font-bold uppercase tracking-widest">Awaiting Selection</p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-4 max-h-[250px] overflow-y-auto no-scrollbar pr-2">
                          {newBooking.selectedItems.map((sel, idx) => (
                            <div key={idx} className="flex justify-between items-start animate-in slide-in-from-right-2">
                              <div>
                                <p className="text-xs font-bold text-white">{sel.item.name}</p>
                                <div className="flex items-center gap-1 mt-1">
                                  <input
                                    type="number"
                                    min="1"
                                    className="w-10 bg-white/5 text-[10px] font-bold text-white border border-white/10 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-purple-400 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    value={sel.qty}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value);
                                      const available = checkAvailability(sel.item.id, newBooking.startDate, newBooking.endDate);
                                      if (isNaN(val) || val < 1) return;

                                      const updated = [...newBooking.selectedItems];
                                      if (val > available) {
                                        toastService.warning(`Insufficient Stock: Only ${available} units available.`);
                                        updated[idx].qty = available;
                                      } else {
                                        updated[idx].qty = val;
                                      }
                                      setNewBooking({ ...newBooking, selectedItems: updated });
                                    }}
                                  />
                                  <span className="text-[8px] font-bold text-purple-200/40 uppercase tracking-[0.2em] ml-1">Units x ₵{sel.item.price}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-bold">₵{sel.item.price * sel.qty}</span>
                                <button type="button" onClick={() => {
                                  const updated = [...newBooking.selectedItems];
                                  if (updated[idx].qty > 1) updated[idx].qty -= 1;
                                  else updated.splice(idx, 1);
                                  setNewBooking({ ...newBooking, selectedItems: updated });
                                }} className="text-white/20 hover:text-rose-400"><Minus size={14} /></button>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="pt-6 border-t border-white/5 space-y-4">
                          <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-purple-200/40">
                            <span>Operational Duration</span>
                            <span className="text-white font-bold">{Math.ceil((new Date(newBooking.endDate).getTime() - new Date(newBooking.startDate).getTime()) / (1000 * 60 * 60 * 24)) || 1} Days</span>
                          </div>
                          <div className="flex justify-between items-center text-xl font-bold tracking-tighter pt-4">
                            <span>Grand Total</span>
                            <span className="text-purple-400">₵{newBooking.selectedItems.reduce((a, c) => a + (c.item.price * c.qty * (Math.ceil((new Date(newBooking.endDate).getTime() - new Date(newBooking.startDate).getTime()) / (1000 * 60 * 60 * 24)) || 1)), 0).toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="pt-6 space-y-4">
                          <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Advance Commitment (Paid)</label>
                          <div className="relative">
                            <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                            <input
                              type="number"
                              placeholder="0.00"
                              className="w-full pl-12 pr-6 py-3 bg-white/5 border border-white/10 rounded-xl text-lg font-bold outline-none focus:bg-white/10 transition-all text-purple-300"
                              value={newBooking.paidAmount}
                              onChange={e => setNewBooking({ ...newBooking, paidAmount: e.target.value })}
                            />
                          </div>
                        </div>

                        {/* Balance Due Display */}
                        <div className="pt-4 border-t border-white/5 flex justify-between items-center animate-in fade-in slide-in-from-bottom-2">
                          <span className="text-xs font-bold text-white/60 uppercase tracking-widest">Balance Due</span>
                          <span className={`text-xl font-bold tracking-tighter ${(newBooking.selectedItems.reduce((a, c) => a + (c.item.price * c.qty * (Math.ceil((new Date(newBooking.endDate).getTime() - new Date(newBooking.startDate).getTime()) / (1000 * 60 * 60 * 24)) || 1)), 0) - (parseFloat(newBooking.paidAmount) || 0)) > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            ₵{(newBooking.selectedItems.reduce((a, c) => a + (c.item.price * c.qty * (Math.ceil((new Date(newBooking.endDate).getTime() - new Date(newBooking.startDate).getTime()) / (1000 * 60 * 60 * 24)) || 1)), 0) - (parseFloat(newBooking.paidAmount) || 0)).toLocaleString()}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="mt-10 grid grid-cols-1 gap-4">
                    <button
                      onClick={handleCreateBooking}
                      disabled={isSubmitting}
                      className={`w-full py-5 rounded-2xl font-bold text-xs uppercase tracking-[0.2em] shadow-2xl transition group flex items-center justify-center
                        ${(newBooking.selectedItems.length > 0 && newBooking.customerId && newBooking.startDate && newBooking.endDate)
                          ? 'bg-purple-600 hover:bg-purple-500 text-white cursor-pointer'
                          : 'bg-stone-200 text-stone-400 cursor-not-allowed hover:bg-rose-100 hover:text-rose-500'}
                        ${isSubmitting ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
                      `}
                    >
                      {isSubmitting ? 'Processing...' : <>Process Dispatch Request <ChevronRight size={14} className="inline-block ml-2 group-hover:translate-x-1 transition-transform" /></>}
                    </button>
                    <button type="button" onClick={() => navigate('/bookings')} className="py-2 text-[10px] font-bold uppercase text-white/30 hover:text-white transition-colors tracking-widest">Cancel Order</button>
                    <button
                      type="button"
                      onClick={() => setNewBooking({ customerId: '', startDate: '', endDate: '', bookingDate: new Date().toISOString().split('T')[0], selectedItems: [], notes: '', paidAmount: '' })}
                      className="py-2 text-[10px] font-bold uppercase text-rose-300 hover:text-rose-100 transition-colors tracking-widest"
                    >
                      Reset Form
                    </button>
                  </div>
                </div>
                {/* Background flair */}
                <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px]"></div>
              </GlassCard>
            </div>
          </div>
        </div>
      )}

      {/* Late Fee Modal */}
      {isLateFeeModalOpen && paymentBooking && (
        <div className="fixed inset-0 bg-purple-900/40 backdrop-blur-xl flex items-center justify-center z-50 p-6 animate-in fade-in zoom-in-95 duration-300">
          <GlassCard className="w-full max-w-md bg-white p-10 border-purple-100">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-100">
                <Clock size={32} />
              </div>
              <h3 className="text-xl font-bold text-stone-900 tracking-tighter">Overdue Return Detected</h3>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-2">Late Fee Calculation</p>
            </div>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2 ml-1">Applied Penalty (GH₵)</label>
                <input type="number" step="0.01" min="0" className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-xl text-purple-600 outline-none focus:ring-4 focus:ring-purple-100" value={lateFeeAmount} onChange={e => setLateFeeAmount(e.target.value)} />
                <p className="text-[9px] font-bold text-stone-400 mt-2 ml-2">Enter penalty amount manually (Default is 0 to waive).</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button type="button" onClick={() => { setIsLateFeeModalOpen(false); setPaymentBooking(null); }} className="py-4 font-bold text-stone-400 text-[10px] uppercase tracking-widest">Cancel</button>
                <button onClick={handleLateFeeSubmit} className="py-4 bg-purple-600 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-xl hover:bg-purple-700 transition">Confirm Return & Fee</button>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Payment Modal Refinement */}
      {isPaymentModalOpen && paymentBooking && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xl flex items-center justify-center z-50 p-6 animate-in fade-in zoom-in-95 duration-300">
          <GlassCard className="w-full max-w-md bg-white p-10">
            <h3 className="text-2xl font-bold text-stone-900 tracking-tighter mb-8 text-center text-purple-900">
              {parseFloat(paymentAmount) === (paymentBooking.totalAmount - paymentBooking.paidAmount) ? 'Account Settlement' : 'Security Deposit'}
            </h3>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2 ml-1">Receipt Amount (GH₵)</label>
                <input type="number" step="0.01" min="0" className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-[1.5rem] font-bold text-2xl text-purple-900 outline-none" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} />
              </div>
              <div className="p-5 bg-purple-50 rounded-3xl border border-purple-100 flex items-center gap-4">
                <ShieldCheck className="text-purple-600" size={24} />
                <p className="text-xs font-bold text-purple-900">This transaction will be logged and the client profile updated.</p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4">
                <button type="button" onClick={() => { setIsPaymentModalOpen(false); setPaymentBooking(null); }} className="py-4 font-bold text-stone-400 text-[10px] uppercase tracking-widest">Abort</button>
                <button onClick={() => {
                  const amt = parseFloat(paymentAmount);
                  // We no longer update booking.paidAmount immediately. 
                  // It will be updated when the Finance Officer approves this transaction.
                  createTransaction({
                    date: new Date().toISOString(),
                    amount: amt,
                    type: TransactionType.INCOME_RENTAL,
                    description: `Payment: #${paymentBooking.id}`,
                    bookingId: paymentBooking.id,
                    status: TransactionStatus.PENDING,
                    submittedBy: 'bookings-system'
                  });
                  createAuditLog('SUBMIT_PAYMENT', `Submitted payment of ${amt} for booking #${paymentBooking.id}`);
                  setIsPaymentModalOpen(false); setPaymentBooking(null); refreshData();
                }} className="py-4 bg-purple-600 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-xl hover:bg-purple-700 transition">Authorize</button>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Penalty/Adjustment Reporting Modal */}
      {isLossModalOpen && selectedLossItem && (
        <div className="fixed inset-0 bg-purple-900/40 backdrop-blur-xl flex items-center justify-center z-50 p-6 animate-in fade-in slide-in-from-bottom-4">
          <GlassCard className="w-full max-w-md bg-white p-10 border-purple-100">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-100">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-2xl font-bold text-stone-900 tracking-tighter">Bill Adjustment / Penalty</h3>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-2">Transparency Audit Record</p>
            </div>

            <div className="space-y-6">
              <div className="flex gap-2 p-1 bg-stone-100 rounded-2xl">
                {(['LOSS', 'DAMAGE', 'OTHER'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setPenaltyType(type)}
                    className={`flex-1 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all ${penaltyType === type ? 'bg-white shadow-sm text-purple-600' : 'text-stone-400'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {penaltyType !== 'OTHER' ? (
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2 ml-1">Affected Asset</label>
                  <select
                    className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-sm outline-none"
                    value={selectedLossItem.itemId}
                    onChange={(e) => {
                      const item = bookings.find(b => b.id === selectedLossItem.bookingId)?.items.find(i => i.itemId === e.target.value);
                      if (item) setSelectedLossItem({ ...selectedLossItem, itemId: item.itemId, itemName: item.itemName });
                    }}
                  >
                    {bookings.find(b => b.id === selectedLossItem.bookingId)?.items.map(item => (
                      <option key={item.itemId} value={item.itemId}>{item.itemName}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2 ml-1">Penalty Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Cleaning Fee, Extra Labor..."
                    className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-purple-100"
                    value={penaltyDescription}
                    onChange={e => setPenaltyDescription(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2 ml-1">Penalty Amount (₵)</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-xl text-purple-600 outline-none focus:ring-4 focus:ring-purple-100"
                  value={lossAmount}
                  onChange={e => setLossAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 text-[10px] text-purple-800">
                <p className="font-bold mb-2 uppercase tracking-widest">Audit Policy:</p>
                <ul className="space-y-1">
                  <li>• Every billable item is listed individually on the receipt.</li>
                  {penaltyType === 'LOSS' && <li>• Inventory will be permanently reduced by 1 unit.</li>}
                  <li>• This creates a transparent paper trail for the client.</li>
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button type="button" onClick={() => setIsLossModalOpen(false)} className="py-4 font-bold text-stone-400 text-[10px] uppercase tracking-widest">Abort</button>
                <button onClick={handleReportLoss} className="py-4 bg-purple-600 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-xl hover:bg-purple-700 transition">Confirm Penalty</button>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Print Modal / Invoice Template */}
      {isPrintModalOpen && paymentBooking && (
        <div className="fixed inset-0 bg-stone-900/90 flex justify-center z-[100] overflow-y-auto p-4 py-12 print:p-0 print:bg-white animate-in fade-in duration-300">
          <div className="w-full max-w-4xl bg-white shadow-2xl rounded-3xl overflow-hidden print:shadow-none print:rounded-none">
            {/* Control Header - Sticky for visibility */}
            <div className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-stone-100 p-8 flex justify-between items-center z-20 print:hidden">
              <div>
                <h4 className="font-bold uppercase tracking-widest text-[10px] text-stone-400">Document Generation</h4>
                <p className="text-xs font-bold text-stone-500 mt-1">Select Output Format & Print</p>
              </div>
              <div className="flex gap-4 items-center">
                <div className="flex bg-stone-100 rounded-lg p-1">
                  <button onClick={() => setPrintMode('invoice')} className={`px-4 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${printMode === 'invoice' ? 'bg-white shadow-sm text-purple-600' : 'text-stone-400'}`}>Invoice</button>
                  <button onClick={() => setPrintMode('waybill')} className={`px-4 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${printMode === 'waybill' ? 'bg-white shadow-sm text-purple-600' : 'text-stone-400'}`}>Waybill / Gate Pass</button>
                </div>
                <button onClick={() => setIsPrintModalOpen(false)} className="px-6 py-3 border border-stone-200 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-stone-50 transition">Dismiss</button>
                <button onClick={handlePrint} className="px-6 py-3 bg-stone-900 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-stone-800 transition flex items-center gap-2 shadow-lg shadow-stone-900/20">
                  <Printer size={14} /> Print Document
                </button>
              </div>
            </div>

            {/* Print Template Body */}
            <div className="p-12 print:p-0" id="printable-invoice">
              {printMode === 'invoice' ? (
                // --- INVOICE VIEW ---
                <>
                  <div className="flex justify-between items-start mb-16">
                    <div>
                      <h1 className="text-4xl font-bold tracking-tighter text-stone-900 mb-2">NAGOR RENTALS</h1>
                      <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">Premium Logistics & Equipment</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-stone-400 uppercase tracking-[0.2em] mb-2">Order Tracking ID</p>
                      <p className="text-2xl font-bold tracking-tighter text-purple-600">#{paymentBooking.id}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-12 mb-16">
                    <div>
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-4">Billed To</p>
                      <h3 className="text-xl font-bold text-stone-800">{paymentBooking.customerName}</h3>
                      <p className="text-sm font-medium text-stone-500 mt-1">Client Authorization & Billing</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-4">Deployment Schedule</p>
                      <p className="text-sm font-bold text-stone-800">{new Date(paymentBooking.startDate).toLocaleDateString()} — {new Date(paymentBooking.endDate).toLocaleDateString()}</p>
                      <p className="text-xs font-medium text-stone-500 mt-1">
                        Duration: {Math.ceil((new Date(paymentBooking.endDate).getTime() - new Date(paymentBooking.startDate).getTime()) / (1000 * 60 * 60 * 24)) || 1} Days
                      </p>
                    </div>
                  </div>

                  <table className="w-full mb-12">
                    <thead>
                      <tr className="border-b border-stone-200">
                        <th className="text-left py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Item Description</th>
                        <th className="text-center py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Unit Price</th>
                        <th className="text-center py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Qty</th>
                        <th className="text-center py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Duration</th>
                        <th className="text-right py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {paymentBooking.items.map((item, i) => {
                        const days = Math.ceil((new Date(paymentBooking.endDate).getTime() - new Date(paymentBooking.startDate).getTime()) / (1000 * 60 * 60 * 24)) || 1;
                        return (
                          <tr key={i}>
                            <td className="py-4 text-sm font-bold text-stone-800">
                              {item.itemName}
                              <div className="text-[10px] text-stone-400 font-normal mt-0.5">Standard Rental Asset</div>
                            </td>
                            <td className="py-4 text-center text-sm font-medium text-stone-600">₵{item.priceAtBooking.toLocaleString()}</td>
                            <td className="py-4 text-center text-sm font-medium text-stone-600">{item.quantity}</td>
                            <td className="py-4 text-center text-sm font-medium text-stone-600">{days} Days</td>
                            <td className="py-4 text-right text-sm font-bold text-stone-800">
                              ₵{(item.priceAtBooking * item.quantity * days).toLocaleString()}
                            </td>
                          </tr>
                        )
                      })}
                      {/* Penalties & Adjustments Section */}
                      {paymentBooking.penalties && paymentBooking.penalties.map((penalty, i) => (
                        <tr key={`penalty-${i}`} className="bg-rose-50/30">
                          <td className="py-4 text-sm font-bold text-rose-700">
                            {penalty.description}
                            <div className="text-[10px] text-rose-400 font-normal mt-0.5 uppercase tracking-wider">Penalty / Fee</div>
                          </td>
                          <td className="py-4 text-center text-sm font-medium text-stone-600 font-mono">--</td>
                          <td className="py-4 text-center text-sm font-medium text-stone-600">1</td>
                          <td className="py-4 text-center text-sm font-medium text-stone-600 font-mono">--</td>
                          <td className="py-4 text-right text-sm font-bold text-rose-700">
                            ₵{penalty.amount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="flex justify-end mb-16">
                    <div className="w-80 space-y-3">
                      {/* Calculated Definitions */}
                      {(() => {
                        const days = Math.ceil((new Date(paymentBooking.endDate).getTime() - new Date(paymentBooking.startDate).getTime()) / (1000 * 60 * 60 * 24)) || 1;
                        const itemTotal = paymentBooking.items.reduce((a, c) => a + (c.priceAtBooking * c.quantity * days), 0);
                        const penaltyTotal = paymentBooking.penalties ? paymentBooking.penalties.reduce((a, p) => a + p.amount, 0) : 0;
                        const grandTotal = itemTotal + penaltyTotal;

                        return (
                          <>
                            {/* 1. Item Total */}
                            <div className="flex justify-between items-center text-sm font-bold text-stone-500">
                              <span>Total Amount of Items</span>
                              <span>₵{itemTotal.toLocaleString()}</span>
                            </div>

                            {/* 2. Operations Duration Note */}
                            <div className="flex justify-end text-[10px] font-bold text-stone-400 uppercase tracking-widest -mt-2 mb-2">
                              (Duration: {days} Days)
                            </div>

                            {/* 3. Penalties */}
                            <div className={`flex justify-between items-center text-sm font-bold ${penaltyTotal > 0 ? 'text-rose-600' : 'text-stone-400'}`}>
                              <span>Total Amount of Penalties</span>
                              <span>{penaltyTotal > 0 ? '+' : ''} ₵{penaltyTotal.toLocaleString()}</span>
                            </div>

                            <div className="h-px bg-stone-200 my-2"></div>

                            {/* 4. Grand Total */}
                            <div className="flex justify-between items-center">
                              <span className="text-lg font-bold text-stone-900 tracking-tight">Grand Total</span>
                              <span className="text-2xl font-bold text-purple-600 tracking-tighter">₵{grandTotal.toLocaleString()}</span>
                            </div>
                          </>
                        )
                      })()}

                      {/* 5. Payments */}
                      <div className="flex justify-between items-center text-sm font-bold text-stone-500">
                        <span>Total Paid by Client</span>
                        <span>- ₵{paymentBooking.paidAmount.toLocaleString()}</span>
                      </div>

                      {/* 7. Balance */}
                      <div className={`pt-2 flex justify-between items-center text-md font-bold ${paymentBooking.totalAmount - paymentBooking.paidAmount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        <span>Balance Due</span>
                        <span>₵{(paymentBooking.totalAmount - paymentBooking.paidAmount).toLocaleString()}</span>
                      </div>

                      {paymentBooking.paidAmount >= paymentBooking.totalAmount && (
                        <div className="pt-2 flex justify-end items-center text-xs font-bold text-emerald-600 uppercase tracking-widest">
                          <span className="flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg">
                            <CheckCircle size={12} /> Paid in Full
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Signatures Section */}
                  <div className="mt-20 pt-10 border-t border-dashed border-stone-200 grid grid-cols-2 gap-20">
                    <div className="text-center">
                      <div className="w-full border-b border-stone-400 mb-4 h-12"></div>
                      <p className="text-[10px] font-bold uppercase text-stone-500 tracking-widest">Client Signature & Date</p>
                    </div>
                    <div className="text-center">
                      <div className="w-full border-b border-stone-400 mb-4 h-12"></div>
                      <p className="text-[10px] font-bold uppercase text-stone-500 tracking-widest">Sales Representative / Manager</p>
                    </div>
                  </div>
                  <div className="border-t border-stone-200 pt-8 text-center text-[10px] text-stone-400 uppercase tracking-widest">
                    <p>Thank you for choosing Nagor Rentals. Please retain this invoice for your records.</p>
                  </div>
                </>
              ) : (
                // --- WAYBILL / GATE PASS VIEW ---
                <>
                  <div className="border-4 border-stone-800 p-8 rounded-none">
                    <div className="flex justify-between items-start mb-12 border-b-2 border-stone-800 pb-8">
                      <div>
                        <h1 className="text-5xl font-black tracking-tighter text-stone-900 mb-2 uppercase">WAYBILL</h1>
                        <p className="text-sm font-bold text-stone-500 uppercase tracking-widest">Gate Pass & Loading Authorization</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-stone-400 uppercase tracking-[0.2em] mb-1">Ref No.</p>
                        <p className="text-3xl font-mono font-bold text-stone-900">#{paymentBooking.id}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-12 mb-12">
                      <div>
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Destination / Client</p>
                        <h3 className="text-2xl font-bold text-stone-900 bg-stone-100 p-2 inline-block px-4 mb-2 uppercase">{paymentBooking.customerName}</h3>
                        <p className="text-sm font-bold text-stone-500">Authorized for Dispatch</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Dispatch Date</p>
                        <h3 className="text-2xl font-bold text-stone-900">{new Date().toLocaleDateString()}</h3>
                        <p className="text-sm font-bold text-stone-500">Time: {new Date().toLocaleTimeString()}</p>
                      </div>
                    </div>

                    <table className="w-full mb-16 border-2 border-stone-800">
                      <thead className="bg-stone-800 text-white">
                        <tr>
                          <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-widest w-16">Check</th>
                          <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-widest">Description of Goods</th>
                          <th className="text-center py-3 px-4 text-xs font-bold uppercase tracking-widest w-32">Quantity</th>
                          <th className="text-center py-3 px-4 text-xs font-bold uppercase tracking-widest w-32">Return Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-800">
                        {paymentBooking.items.map((item, i) => (
                          <tr key={i}>
                            <td className="py-4 px-4 border-r-2 border-stone-800"><div className="w-6 h-6 border-2 border-stone-300"></div></td>
                            <td className="py-4 px-4 text-lg font-bold text-stone-900 border-r-2 border-stone-800">{item.itemName}</td>
                            <td className="py-4 px-4 text-center text-xl font-bold text-stone-900 border-r-2 border-stone-800">{item.quantity}</td>
                            <td className="py-4 px-4"></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="grid grid-cols-3 gap-8 mt-20">
                      <div className="border-t-2 border-stone-800 pt-2">
                        <p className="text-xs font-bold uppercase tracking-widest text-stone-400">Dispatched By (Warehouse)</p>
                        <div className="h-16"></div>
                      </div>
                      <div className="border-t-2 border-stone-800 pt-2">
                        <p className="text-xs font-bold uppercase tracking-widest text-stone-400">Driver / Transport</p>
                        <div className="h-16"></div>
                      </div>
                      <div className="border-t-2 border-stone-800 pt-2">
                        <p className="text-xs font-bold uppercase tracking-widest text-stone-400">Received By (Client)</p>
                        <div className="h-16"></div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>


          </div>

          <style>
            {`
                @media print {
                  @page { margin: 15mm; size: auto; }
                  body { visibility: hidden; }
                  #printable-invoice, #printable-invoice * { visibility: visible; }
                  #printable-invoice {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    background: white;
                  }
                  .print\\:hidden { display: none !important; }
                }
              `}
          </style>
        </div>
      )}
    </div>
  );
};
