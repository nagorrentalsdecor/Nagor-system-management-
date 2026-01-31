import { Item, Booking, Customer, Transaction, ItemStatus, BookingStatus, TransactionType, DashboardMetrics, Employee, UserRole, EmployeeStatus, PayrollRun, TransactionStatus, AuditLog, BookingItem, Penalty } from '../types';
import { supabase } from './supabase';

// --- Local Cache for Synchronous Access UI Compability ---
// The original app was designed with synchronous getters. To avoid rewriting the entire UI to async/await immediately,
// we will maintain a local cache that is synchronized with Supabase.
let cache: {
  items: Item[];
  customers: Customer[];
  bookings: Booking[];
  transactions: Transaction[];
  employees: Employee[];
  payrollRuns: PayrollRun[];
  settings: any[];
  logs: AuditLog[];
} = {
  items: [],
  customers: [],
  bookings: [],
  transactions: [],
  employees: [],
  payrollRuns: [],
  settings: [],
  logs: []
};

// Flags to track if data is initialized
let isInitialized = false;

// --- Initialization & Data Fetching ---

export const initializeData = async () => {
  if (isInitialized) return;
  console.log("Initializing Supabase Data Sync...");

  try {
    const [items, customers, bookings, transactions, employees, settings, logs, payrolls] = await Promise.all([
      supabase.from('items').select('*'),
      supabase.from('customers').select('*'),
      supabase.from('bookings').select(`*, items:booking_items(*), penalties(*)`), // Fetch related BookingItems and Penalties
      supabase.from('transactions').select('*'),
      supabase.from('employees').select('*'),
      supabase.from('settings').select('*'),
      supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(500),
      supabase.from('payroll_runs').select('*')
    ]);

    if (items.data) cache.items = items.data.map(transformItemFromDB);
    if (customers.data) cache.customers = customers.data.map(transformCustomerFromDB);
    if (employees.data) cache.employees = employees.data.map(transformEmployeeFromDB);
    if (transactions.data) cache.transactions = transactions.data.map(transformTransactionFromDB);
    if (settings.data) cache.settings = settings.data;
    if (logs.data) cache.logs = logs.data.map(transformLogFromDB);
    if (payrolls.data) cache.payrollRuns = payrolls.data.map(p => ({ ...p, items: typeof p.items === 'string' ? JSON.parse(p.items) : p.items }));

    // Complex transform for Bookings to match previous structure
    if (bookings.data) {
      cache.bookings = bookings.data.map((b: any) => ({
        id: b.id,
        customerId: b.customer_id,
        customerName: b.customer_name,
        startDate: b.start_date,
        endDate: b.end_date,
        status: b.status as BookingStatus,
        totalAmount: b.total_amount,
        paidAmount: b.paid_amount,
        lateFee: b.late_fee,
        notes: b.notes,
        createdAt: b.created_at,
        items: b.items ? b.items.map((bi: any) => ({
          itemId: bi.item_id,
          itemName: bi.item_name,
          quantity: bi.quantity,
          priceAtBooking: bi.price_at_booking
        })) : [],
        penalties: b.penalties ? b.penalties.map((p: any) => ({
          type: p.type,
          amount: p.amount,
          description: p.description,
          date: p.date
        })) : []
      }));
    }

    isInitialized = true;
    console.log("Supabase Data Loaded Successfully");
    setupRealtimeListeners();
  } catch (error) {
    console.error("Critical: Failed to load data from Supabase", error);
    // Fallback?
  }
};

// --- Realtime Sync ---
const setupRealtimeListeners = () => {
  console.log("Setting up Realtime Listeners...");
  const channel = supabase.channel('public:db_sync');

  channel
    .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
      // console.log('Realtime Event:', payload);
      handleRealtimeEvent(payload);
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        // console.log('Realtime connected!');
      }
    });
};

const handleRealtimeEvent = (payload: any) => {
  const { table, eventType, new: newRecord, old: oldRecord } = payload;
  let updatedTable = '';

  switch (table) {
    case 'items':
      updatedTable = 'items';
      if (eventType === 'DELETE') {
        cache.items = cache.items.filter(i => i.id !== oldRecord.id);
      } else {
        const item = transformItemFromDB(newRecord);
        const index = cache.items.findIndex(i => i.id === item.id);
        if (index > -1) cache.items[index] = item;
        else cache.items.push(item);
      }
      break;
    case 'customers':
      updatedTable = 'customers';
      if (eventType === 'DELETE') {
        cache.customers = cache.customers.filter(c => c.id !== oldRecord.id);
      } else {
        const customer = transformCustomerFromDB(newRecord);
        const index = cache.customers.findIndex(c => c.id === customer.id);
        if (index > -1) cache.customers[index] = customer;
        else cache.customers.push(customer);
      }
      break;
    case 'bookings':
      updatedTable = 'bookings';
      // For Bookings, handling deep relations (items, penalties) via realtime is complex
      // For now, we will just Reload the specific booking or all bookings if complex
      // Simplest strategy: Fetch the single updated booking fully from API to get relations
      if (eventType === 'DELETE') {
        cache.bookings = cache.bookings.filter(b => b.id !== oldRecord.id);
      } else {
        // Optimization: Fetch just this one
        supabase.from('bookings').select(`*, items:booking_items(*), penalties(*)`).eq('id', newRecord.id).single()
          .then(({ data }) => {
            if (data) {
              const booking = {
                // ... same transform logic ...
                id: data.id, customerId: data.customer_id, customerName: data.customer_name,
                startDate: data.start_date, endDate: data.end_date, status: data.status as BookingStatus,
                totalAmount: data.total_amount, paidAmount: data.paid_amount, lateFee: data.late_fee,
                notes: data.notes, createdAt: data.created_at,
                items: data.items ? data.items.map((bi: any) => ({
                  itemId: bi.item_id, itemName: bi.item_name, quantity: bi.quantity, priceAtBooking: bi.price_at_booking
                })) : [],
                penalties: data.penalties ? data.penalties.map((p: any) => ({
                  type: p.type, amount: p.amount, description: p.description, date: p.date
                })) : []
              };
              const idx = cache.bookings.findIndex(b => b.id === booking.id);
              if (idx > -1) cache.bookings[idx] = booking;
              else cache.bookings.push(booking);
              window.dispatchEvent(new CustomEvent('db-sync', { detail: { table: 'bookings' } }));
            }
          });
        return; // Early return because we dispatch event in async callback
      }
      break;
    case 'transactions':
      updatedTable = 'transactions';
      if (eventType === 'DELETE') {
        cache.transactions = cache.transactions.filter(t => t.id !== oldRecord.id);
      } else {
        const trans = transformTransactionFromDB(newRecord);
        const idx = cache.transactions.findIndex(t => t.id === trans.id);
        if (idx > -1) cache.transactions[idx] = trans;
        else cache.transactions.push(trans);
      }
      break;
  }

  if (updatedTable) {
    window.dispatchEvent(new CustomEvent('db-sync', { detail: { table: updatedTable } }));
  }
};

// --- Transformers (snake_case DB to camelCase App) ---
// Note: We used standard snake_case in SQL but camelCase in TypeScript
const transformItemFromDB = (i: any): Item => ({
  id: i.id,
  name: i.name || 'Unknown Item',
  category: i.category || 'Uncategorized',
  totalQuantity: i.total_quantity || 0,
  quantityInMaintenance: i.quantity_in_maintenance || 0,
  price: i.price || 0,
  status: ((i.status as string)?.trim().toUpperCase() as ItemStatus) || ItemStatus.AVAILABLE,
  imageUrl: i.image_url
});

const transformCustomerFromDB = (c: any): Customer => ({
  id: c.id,
  name: c.name || 'Unknown',
  phone: c.phone || '',
  address: c.address || '',
  email: c.email || '',
  notes: c.notes || '',
  totalRentals: c.total_rentals || 0,
  idCardUrl: c.id_card_url,
  guarantorName: c.guarantor_name,
  guarantorPhone: c.guarantor_phone,
  isBlacklisted: c.is_blacklisted || false,
  riskNotes: c.risk_notes
});

const transformEmployeeFromDB = (e: any): Employee => ({
  id: e.id,
  name: e.name || 'Unknown Staff',
  role: (e.role as UserRole) || UserRole.VIEWER,
  phone: e.phone || '',
  salary: e.salary || 0,
  joinDate: e.join_date || new Date().toISOString(),
  status: (e.status as EmployeeStatus) || EmployeeStatus.ACTIVE,
  loanBalance: e.loan_balance || 0,
  pendingDeductions: e.pending_deductions || 0,
  leaveBalance: e.leave_balance ?? 20, // Default 20 days if null
  performanceRating: e.performance_rating || 0,
  address: e.address || '',
  guarantorPhone: e.guarantor_phone || '',
  hasSystemAccess: e.has_system_access || false,
  username: e.username,
  password: e.password,
  passwordLastChanged: e.password_last_changed,
  photoUrl: e.photo_url,
  guarantorName: e.guarantor_name,
  bankAccount: e.bank_account,
  mobileMoneyAccount: e.mobile_money_account,
  ghanaCardFrontUrl: e.ghana_card_front_url,
  ghanaCardBackUrl: e.ghana_card_back_url,
  tempPassword: e.temp_password,
  isFirstLogin: e.is_first_login || false,
  passwordChangeRequired: e.password_change_required || false
});

const transformTransactionFromDB = (t: any): Transaction => ({
  id: t.id,
  date: t.date || new Date().toISOString(),
  amount: t.amount || 0,
  type: (t.type as TransactionType) || TransactionType.EXPENSE_OTHER,
  description: t.description || '',
  bookingId: t.booking_id,
  propertyId: t.property_id,
  referenceNumber: t.reference_number,
  status: (t.status as TransactionStatus) || TransactionStatus.PENDING,
  submittedBy: t.submitted_by || 'system',
  approvedBy: t.approved_by,
  approvalNotes: t.approval_notes,
  approvedAt: t.approved_at,
  createdAt: t.created_at,
  updatedAt: t.updated_at
});

const transformLogFromDB = (l: any): AuditLog => ({
  id: l.id,
  action: l.action || 'UNKNOWN',
  details: l.details || '',
  userId: l.user_id || 'system',
  userName: l.user_name || 'System',
  timestamp: l.timestamp || new Date().toISOString(),
  metadata: l.metadata
});


// --- Getters (Using Cache) ---
export const getItems = (): Item[] => cache.items;
export const getCustomers = (): Customer[] => cache.customers;
export const getEmployees = (): Employee[] => cache.employees;
export const getBookings = (): Booking[] => cache.bookings;
export const getTransactions = (): Transaction[] => cache.transactions;
export const getPayrollRuns = (): PayrollRun[] => cache.payrollRuns;
export const getSettings = (): any[] => cache.settings;
export const getAuditLogs = (): AuditLog[] => cache.logs;


// --- Setters / Mutations (Write to DB then update Cache) ---

export const saveItems = async (items: Item[]) => {
  // Identify changes is complex; for now, we assume this is called with the FULL list
  // Optimization: In a real app, only save the changed item.
  // We will assume the LAST modified item is the one to save for this demo to avoid batch complexity,
  // OR we just upsert all. Upserting all is heavy but safe.
  try {
    const dbItems = items.map(i => ({
      id: i.id.length < 10 ? undefined : i.id, // Handle potential temp IDs or new items if we changed ID logic
      // Note: Supabase Gen_Random_UUID requires undefined ID for new inserts or specific handling
      // For this migration, we kept UUIDs in the schema.
      // If the app uses non-UUIDs (e.g. '1', '2'), we might have conflicts. 
      // STRATEGY: We will UPSERT based on ID. If ID is '1', '2', we might need to migrate them to UUIDs or keep text ids.
      // Schema used UUID. The mock data used '1', '2'.
      // FIX: We should rely on the schema being UUID.
      // If we are saving *new* items, they might have temp IDs.
      name: i.name, category: i.category,
      total_quantity: i.totalQuantity, quantity_in_maintenance: i.quantityInMaintenance,
      price: i.price, status: i.status, image_url: i.imageUrl
    }));

    // For specific updates:
    // To keep it simple for this conversion, we will just update the cache immediately
    // and attempt to persist changes.
    // Ideally, `saveItems` should accept just the changed item.
    // We will mimic the behaviour: "Replace all" is what localStorage did.
    // We can't replace all in SQL efficiently.
    // Detection: We'll assume the caller passes the updated list.
    // We will just update cache and background sync the changes? No, unsafe.

    // Better approach for this code structure:
    // We iterate and upsert.
    // We will only upsert the *difference* if possible, but we don't know it.
    // We will loop and upsert all. (Inefficient but functional for small inventory).

    // Actually, getting the last item might be enough if we assume single edits.
    // But `saveItems` is often called with `[...items, newItem]`.

    // Let's just update the cache first so UI is snappy.
    cache.items = items;

    // Background Persist
    for (const i of items) {
      // Check if ID is a valid UUID? If it's '1', '2', we might have issues if DB expects UUID.
      // The Schema says UUID. The Code says '1', '2'.
      // We need to allow the DB to generate UUIDs for new items
      // AND update local IDs.

      // Handling this properly: 
      const payload: any = {
        name: i.name, category: i.category,
        total_quantity: i.totalQuantity, quantity_in_maintenance: i.quantityInMaintenance,
        price: i.price, status: i.status, image_url: i.imageUrl
      };

      if (i.id && i.id.length > 10) {
        // Assume valid UUID or existing long ID
        payload.id = i.id;
      }

      const { data, error } = await supabase.from('items').upsert(payload).select().single();
      if (data) {
        // Update cache with real ID from DB if it was new
        i.id = data.id;
      }
    }
  } catch (e) {
    console.error("Save Items Error", e);
  }
};

export const deleteItem = async (itemId: string) => {
  // Optimistic Update
  cache.items = cache.items.filter(i => i.id !== itemId);

  // Persist
  try {
    const { error } = await supabase.from('items').delete().eq('id', itemId);
    if (error) throw error;
  } catch (e) {
    console.error("Delete Item Error", e);
    // Ideally restore cache? 
  }
};

export const saveCustomers = async (customers: Customer[]) => {
  cache.customers = customers; // Optimistic
  // Persist logic similar to items
  for (const c of customers) {
    const payload: any = {
      name: c.name, phone: c.phone, address: c.address, email: c.email,
      notes: c.notes, total_rentals: c.totalRentals, id_card_url: c.idCardUrl,
      guarantor_name: c.guarantorName, guarantor_phone: c.guarantorPhone,
      is_blacklisted: c.isBlacklisted, risk_notes: c.riskNotes
    };
    if (c.id && c.id.length > 5) payload.id = c.id;

    const { data } = await supabase.from('customers').upsert(payload).select().single();
    if (data) c.id = data.id;
  }
};

export const saveBookings = async (bookings: Booking[]) => {
  // This is the most complex one due to relations (Items, Penalties)
  // We will save the "Parent" booking, then handle children.
  cache.bookings = bookings;

  for (const b of bookings) {
    // 1. Save Booking
    const bookingPayload: any = {
      customer_id: b.customerId,
      customer_name: b.customerName,
      start_date: b.startDate,
      end_date: b.endDate,
      status: b.status,
      total_amount: b.totalAmount,
      paid_amount: b.paidAmount,
      late_fee: b.lateFee,
      notes: b.notes
    };
    if (b.id && b.id.length > 10) bookingPayload.id = b.id;

    const { data: bookingData, error } = await supabase.from('bookings').upsert(bookingPayload).select().single();

    if (bookingData) {
      b.id = bookingData.id;

      // 2. Save Items (Delete old, insert new? Or Upsert?)
      // Easiest is delete all for this booking and re-insert to handle removals.
      // Only if we suspect changes.
      // For now, let's just Upsert items.
      if (b.items && b.items.length > 0) {
        // We first need to delete existing to avoid duplicates if we don't track item IDs in app
        // The app `BookingItem` interface does NOT have an ID. So we must wipe and recreate.
        await supabase.from('booking_items').delete().eq('booking_id', b.id);

        const itemsPayload = b.items.map(bi => ({
          booking_id: b.id,
          item_id: bi.itemId,
          item_name: bi.itemName,
          quantity: bi.quantity,
          price_at_booking: bi.priceAtBooking
        }));
        await supabase.from('booking_items').insert(itemsPayload);
      }

      // 3. Save Penalties
      if (b.penalties && b.penalties.length > 0) {
        await supabase.from('penalties').delete().eq('booking_id', b.id);
        const penaltyPayload = b.penalties.map(p => ({
          booking_id: b.id,
          type: p.type,
          amount: p.amount,
          description: p.description,
          date: p.date
        }));
        await supabase.from('penalties').insert(penaltyPayload);
      }
    }
  }
};

export const saveTransactions = async (transactions: Transaction[]) => {
  cache.transactions = transactions;
  for (const t of transactions) {
    const payload: any = {
      date: t.date, amount: t.amount, type: t.type, description: t.description,
      booking_id: t.bookingId, property_id: t.propertyId, reference_number: t.referenceNumber,
      status: t.status, submitted_by: t.submittedBy, approved_by: t.approvedBy,
      approval_notes: t.approvalNotes, approved_at: t.approvedAt, updated_at: t.updatedAt
    };
    if (t.id && t.id.length > 10) payload.id = t.id;
    const { data } = await supabase.from('transactions').upsert(payload).select().single();
    if (data) t.id = data.id;
  }
};

export const saveEmployees = async (employees: Employee[]) => {
  cache.employees = employees;
  for (const e of employees) {
    const payload: any = {
      name: e.name, role: e.role, phone: e.phone, salary: e.salary,
      join_date: e.joinDate, status: e.status, loan_balance: e.loanBalance,
      pending_deductions: e.pendingDeductions, leave_balance: e.leaveBalance,
      performance_rating: e.performanceRating, address: e.address,
      guarantor_phone: e.guarantorPhone, has_system_access: e.hasSystemAccess,
      username: e.username, password: e.password,
      video_url: e.photoUrl, // Map photoUrl to mismatched DB column if needed, or fix DB. DB has photo_url.
      photo_url: e.photoUrl,
      guarantor_name: e.guarantorName, bank_account: e.bankAccount,
      mobile_money_account: e.mobileMoneyAccount,
      ghana_card_front_url: e.ghanaCardFrontUrl, ghana_card_back_url: e.ghanaCardBackUrl,
      temp_password: e.tempPassword, is_first_login: e.isFirstLogin,
      password_change_required: e.passwordChangeRequired
    };
    if (e.id && e.id.length > 5) payload.id = e.id;
    const { data } = await supabase.from('employees').upsert(payload).select().single();
    if (data) e.id = data.id;
  }
};

export const saveSettings = async (settings: any[]) => {
  cache.settings = settings;
  for (const s of settings) {
    await supabase.from('settings').upsert({
      id: s.id, label: s.label, description: s.description,
      type: s.type, value: s.value, section: s.section,
      options: s.options
    });
  }
};

export const createAuditLog = async (action: string, details: string, user?: { id: string, name: string }) => {
  // Optimistic Update
  let actor = user;
  if (!actor) {
    try {
      const stored = sessionStorage.getItem('currentEmployee'); // Changed from localStorage to sessionStorage based on App.tsx usage
      if (stored) {
        const parsed = JSON.parse(stored);
        actor = { id: parsed.id || 'sys', name: parsed.name || 'System' };
      }
    } catch (e) { }
  }
  if (!actor) actor = { id: 'sys', name: 'System Admin' };

  const newLog: AuditLog = {
    id: Math.random().toString(36), // Temp ID
    action, details, userId: actor.id, userName: actor.name,
    timestamp: new Date().toISOString()
  };

  cache.logs.unshift(newLog);
  if (cache.logs.length > 500) cache.logs.pop();

  // Async Save
  supabase.from('audit_logs').insert({
    action, details, user_id: actor.id, user_name: actor.name,
    timestamp: newLog.timestamp
  }).then(); // Fire and forget

  return newLog;
};

// --- Helpers kept for business logic ---

export const authenticateUser = async (username: string, password: string): Promise<Employee | null> => {
  // We now query Supabase directly for auth to ensure security
  const { data, error } = await supabase.from('employees')
    .select('*')
    .ilike('username', username) // Case insensitive
    .eq('password', password) // In real production, hash this!
    .single();

  if (data) {
    return transformEmployeeFromDB(data);
  }

  // Fallback: Check cache if offline? No, auth should be online.
  return null;
};

// ... Keep other helpers like isBookingOverdue, calculateLateFee, checkAvailability ...
// We need to modify them to use the cache or async.
// Since the UI calls them synchronously in render loops, they MUST use cache.

export const isBookingOverdue = (booking: Booking): boolean => {
  if (booking.status === BookingStatus.RETURNED || booking.status === BookingStatus.CANCELLED) return false;
  const now = new Date();
  const endDate = new Date(booking.endDate);
  return now > endDate;
};

export const calculateLateFee = (booking: Booking): number => {
  if (!isBookingOverdue(booking)) return 0;
  const now = new Date();
  const endDate = new Date(booking.endDate);
  const diffTime = Math.abs(now.getTime() - endDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const LATE_FEE_RATE = 0.5;
  const originalDailyRate = booking.items.reduce((acc, i) => acc + (i.priceAtBooking * i.quantity), 0);
  return originalDailyRate * LATE_FEE_RATE * diffDays;
};

export const checkAvailability = (itemId: string, startDate: string, endDate: string, excludeBookingId?: string): number => {
  const items = cache.items;
  const bookings = cache.bookings;

  const item = items.find(i => i.id === itemId);
  if (!item) return 0;
  if (item.status === ItemStatus.DAMAGED) return 0;

  if (!startDate || !endDate) {
    return Math.max(0, item.totalQuantity - (item.quantityInMaintenance || 0));
  }

  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();

  if (isNaN(start) || isNaN(end)) {
    return Math.max(0, item.totalQuantity - (item.quantityInMaintenance || 0));
  }

  const overlappingBookings = bookings.filter(b => {
    if (b.id === excludeBookingId) return false;
    if (b.status === BookingStatus.RETURNED || b.status === BookingStatus.CANCELLED) return false;
    const bStart = new Date(b.startDate).getTime();
    const bEnd = new Date(b.endDate).getTime();
    if (isNaN(bStart) || isNaN(bEnd)) return false;
    return (start <= bEnd && end >= bStart);
  });

  const rentedQty = overlappingBookings.reduce((acc, b) => {
    const bookingItem = b.items.find(bi => bi.itemId === itemId);
    return acc + (bookingItem ? bookingItem.quantity : 0);
  }, 0);

  const maintenanceQty = item.quantityInMaintenance || 0;
  return Math.max(0, item.totalQuantity - rentedQty - maintenanceQty);
};

export const getDashboardMetrics = (): DashboardMetrics => {
  const items = cache.items;
  const bookings = cache.bookings;
  const transactions = cache.transactions;
  const customers = cache.customers;

  const totalItems = items.reduce((acc, i) => acc + i.totalQuantity, 0);
  const now = new Date().getTime();
  const activeBookings = bookings.filter(b => {
    const start = new Date(b.startDate).getTime();
    const end = new Date(b.endDate).getTime();
    return (b.status === BookingStatus.ACTIVE || b.status === BookingStatus.OVERDUE || (b.status === BookingStatus.PENDING && start <= now && end >= now));
  });

  const rentedItems = activeBookings.reduce((acc, b) => {
    return acc + b.items.reduce((iAcc, item) => iAcc + item.quantity, 0);
  }, 0);

  const maintenanceItems = items.reduce((acc, i) => acc + (i.quantityInMaintenance || 0), 0);
  const today = new Date().toISOString().split('T')[0];
  const todaysRevenue = transactions
    .filter(t => t.date.startsWith(today) && t.type.startsWith('INCOME') && t.status === TransactionStatus.APPROVED)
    .reduce((acc, t) => acc + t.amount, 0);

  const lastWeekDate = new Date();
  lastWeekDate.setDate(lastWeekDate.getDate() - 7);
  const weeklyRevenue = transactions
    .filter(t => new Date(t.date) >= lastWeekDate && t.type.startsWith('INCOME') && t.status === TransactionStatus.APPROVED)
    .reduce((acc, t) => acc + t.amount, 0);

  const lastMonthDate = new Date();
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  const monthlyRevenue = transactions
    .filter(t => new Date(t.date) >= lastMonthDate && t.type.startsWith('INCOME') && t.status === TransactionStatus.APPROVED)
    .reduce((acc, t) => acc + t.amount, 0);

  const itemRevenue: Record<string, number> = {};
  bookings.forEach(b => {
    b.items.forEach(item => {
      const rev = item.priceAtBooking * item.quantity;
      itemRevenue[item.itemName] = (itemRevenue[item.itemName] || 0) + rev;
    });
  });
  const topItems = Object.entries(itemRevenue)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, revenue]) => ({ name, revenue }));

  const damagedItems = items.filter(i => i.status === ItemStatus.DAMAGED).reduce((acc, i) => acc + i.totalQuantity, 0);
  const inventoryHealth = [
    { name: 'Available', value: totalItems - rentedItems - damagedItems - maintenanceItems, color: '#10b981' },
    { name: 'Rented', value: rentedItems, color: '#6366f1' },
    { name: 'Damaged', value: damagedItems, color: '#ef4444' },
    { name: 'Maintenance', value: maintenanceItems, color: '#f59e0b' },
  ];

  const pendingBookings = bookings.filter(b => b.status === BookingStatus.PENDING).length;
  const overdueBookings = bookings.filter(b => isBookingOverdue(b)).length;

  return {
    totalItems, rentedItems, availableItems: totalItems - rentedItems,
    todaysRevenue, pendingBookings, overdueBookings, maintenanceItems,
    totalCustomers: customers.length, weeklyRevenue, monthlyRevenue,
    topItems, inventoryHealth
  };
};

export const createTransaction = async (t: Omit<Transaction, 'id' | 'status' | 'createdAt'> & { status?: TransactionStatus, submittedBy: string }) => {
  // Optimistic
  const newT: Transaction = {
    ...t, id: 'temp-' + Date.now(), status: TransactionStatus.PENDING, createdAt: new Date().toISOString(), submittedBy: t.submittedBy || 'system'
  } as Transaction;

  cache.transactions.push(newT);

  // Persist
  const payload: any = {
    date: t.date, amount: t.amount, type: t.type, description: t.description,
    booking_id: t.bookingId, property_id: t.propertyId, reference_number: t.referenceNumber,
    status: TransactionStatus.PENDING, submitted_by: t.submittedBy
  };

  const { data } = await supabase.from('transactions').insert(payload).select().single();
  if (data) Object.assign(newT, transformTransactionFromDB(data));

  return newT;
};


// --- Missing Functions Restored ---

const generateDefaultPassword = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const savePayrollRuns = async (payrolls: PayrollRun[]) => {
  cache.payrollRuns = payrolls;
  for (const p of payrolls) {
    await supabase.from('payroll_runs').upsert({
      id: p.id,
      month: p.month,
      year: p.year,
      total_amount: p.totalAmount,
      status: p.status,
      created_at: p.createdAt,
      items: JSON.stringify(p.items)
    });
  }
};

export const resetUserPassword = async (employeeId: string): Promise<string> => {
  const employees = cache.employees;
  const employee = employees.find(e => e.id === employeeId);

  if (!employee) throw new Error('Employee not found');

  const tempPassword = generateDefaultPassword();

  // Update local cache
  const updatedEmp = {
    ...employee,
    tempPassword,
    password: tempPassword,
    passwordLastChanged: new Date().toISOString(),
    isFirstLogin: true,
    passwordChangeRequired: true
  };

  const index = employees.findIndex(e => e.id === employeeId);
  employees[index] = updatedEmp;

  // Persist
  await supabase.from('employees').update({
    temp_password: tempPassword,
    password: tempPassword,
    password_last_changed: updatedEmp.passwordLastChanged,
    is_first_login: true,
    password_change_required: true
  }).eq('id', employeeId);

  return tempPassword;
};

export const updateTransactionStatus = async (id: string, status: TransactionStatus, approvedBy: string, approvalNotes?: string) => {
  const transactions = cache.transactions;
  const index = transactions.findIndex(t => t.id === id);
  if (index === -1) return null;

  const transaction = transactions[index];

  const updatedTransaction = {
    ...transaction,
    status,
    approvedBy,
    approvalNotes,
    approvedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  transactions[index] = updatedTransaction;

  await supabase.from('transactions').update({
    status,
    approved_by: approvedBy,
    approval_notes: approvalNotes,
    approved_at: updatedTransaction.approvedAt,
    updated_at: updatedTransaction.updatedAt
  }).eq('id', id);

  createAuditLog(
    status === TransactionStatus.APPROVED ? 'APPROVE_TRANSACTION' : 'REJECT_TRANSACTION',
    `Transaction #${id} ${status} by ${approvedBy}. Notes: ${approvalNotes || 'None'}`,
    { id: approvedBy, name: 'Finance Officer' }
  );

  if (status === TransactionStatus.APPROVED && transaction.type.startsWith('INCOME') && transaction.bookingId) {
    const bookings = cache.bookings;
    const bookingIndex = bookings.findIndex(b => b.id === transaction.bookingId);

    if (bookingIndex !== -1) {
      const booking = bookings[bookingIndex];
      const updatedPaidAmount = booking.paidAmount + transaction.amount;
      bookings[bookingIndex] = { ...booking, paidAmount: updatedPaidAmount };

      await supabase.from('bookings').update({ paid_amount: updatedPaidAmount }).eq('id', booking.id);
    }
  }

  return transactions[index];
};

export const getPendingTransactions = (): Transaction[] => {
  return cache.transactions.filter(t => t.status === TransactionStatus.PENDING);
};

export const getApprovedTransactions = (): Transaction[] => {
  return cache.transactions.filter(t => t.status === TransactionStatus.APPROVED);
};

export const seedDatabase = async () => {
  // Only seed if empty
  if (cache.items.length === 0) {
    console.log("Seeding Supabase Database: Items...");
    const sampleItems = [
      { name: 'Gold Phoenix Chair', category: 'Chairs', total_quantity: 200, price: 15, status: 'AVAILABLE', quantity_in_maintenance: 0 },
      { name: 'White Dior Chair', category: 'Chairs', total_quantity: 150, price: 25, status: 'AVAILABLE', quantity_in_maintenance: 0 },
      { name: 'Plastic Armless Chair', category: 'Chairs', total_quantity: 500, price: 2, status: 'AVAILABLE', quantity_in_maintenance: 0 },
      { name: 'Round Table (10-seater)', category: 'Tables', total_quantity: 50, price: 40, status: 'AVAILABLE', quantity_in_maintenance: 0 },
      { name: 'Rectangular Table (6ft)', category: 'Tables', total_quantity: 30, price: 30, status: 'AVAILABLE', quantity_in_maintenance: 0 },
      { name: 'Marquee Tent (High Peak)', category: 'Tents', total_quantity: 5, price: 1500, status: 'AVAILABLE', quantity_in_maintenance: 0 },
      { name: 'Standard Canopy', category: 'Tents', total_quantity: 10, price: 200, status: 'AVAILABLE', quantity_in_maintenance: 0 },
      { name: 'Artificial Grass (Roll)', category: 'Flooring', total_quantity: 20, price: 100, status: 'AVAILABLE', quantity_in_maintenance: 0 }
    ];

    const { error } = await supabase.from('items').insert(sampleItems);
    if (error) {
      console.error("Error seeding items:", error);
    } else {
      // Refresh cache
      const { data } = await supabase.from('items').select('*');
      if (data) cache.items = data.map(transformItemFromDB);
      console.log("Items seeded successfully");
    }
  }

  if (cache.customers.length === 0) {
    console.log("Seeding Supabase Database: Customers...");
    const sampleCustomers = [
      { name: 'Event Pro GH', phone: '0555000000', email: 'contact@eventpro.gh', total_rentals: 5 },
      { name: 'Alice Weddings', phone: '0200000001', email: 'alice@weddings.com', total_rentals: 2 },
      { name: 'Corporate Events Ltd', phone: '0244000000', email: 'events@corporate.com', total_rentals: 10, is_blacklisted: false }
    ];

    const { error } = await supabase.from('customers').insert(sampleCustomers);
    if (error) {
      console.error("Error seeding customers:", error);
    } else {
      const { data } = await supabase.from('customers').select('*');
      if (data) cache.customers = data.map(transformCustomerFromDB);
      console.log("Customers seeded successfully");
    }
  }
};

export const exportDatabase = () => JSON.stringify(cache);
export const importDatabase = (json: string) => false; // Disabled for cloud sync safety
export const clearDatabase = () => { console.warn("Cannot clear cloud DB from client"); };