import React, { useState, useEffect } from 'react';
import {
  Users, Briefcase, DollarSign, Calendar, Search, Plus, MoreHorizontal, Phone, Edit2, Trash2,
  UserCheck, Building2, BadgeCheck, Star, AlertTriangle, HeartPulse, Banknote, MinusCircle,
  Clock, CheckCircle, XCircle, UserX, LogOut, MapPin, Camera, Upload, Lock, Unlock,
  CreditCard, Play, FileText, Zap, ShieldCheck, Crown, ChevronRight, MessageSquare, Key, Copy, Check
} from 'lucide-react';
import { Employee, UserRole, EmployeeStatus, PayrollRun, PayrollStatus, PayrollItem } from '../types';
import { getEmployees, saveEmployees, getPayrollRuns, savePayrollRuns, resetUserPassword, createAuditLog, generateUUID } from '../services/db';
import { ImageCapture } from './ImageCapture';

type ActionType = 'EDIT' | 'FINANCE' | 'LEAVE' | 'PERFORMANCE' | 'STATUS' | 'PAYROLL' | 'RESET_PASSWORD' | 'PENALTY' | null;


const GlassCard = ({ children, className = "" }: any) => (
  <div className={`bg-white/80 backdrop-blur-md border border-white/40 shadow-xl shadow-stone-200/40 rounded-[2.5rem] ${className}`}>
    {children}
  </div>
);

export const HR = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrollHistory, setPayrollHistory] = useState<PayrollRun[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<ActionType>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [payrollData, setPayrollData] = useState({ month: new Date().getMonth(), year: new Date().getFullYear() });
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [passwordCopied, setPasswordCopied] = useState(false);

  useEffect(() => { refreshData(); }, []);

  const refreshData = () => {
    setEmployees(getEmployees().map(e => ({
      ...e,
      status: e.status || EmployeeStatus.ACTIVE,
      loanBalance: e.loanBalance || 0,
      pendingDeductions: e.pendingDeductions || 0,
      leaveBalance: e.leaveBalance ?? 20,
      performanceRating: e.performanceRating || 0,
      hasSystemAccess: e.hasSystemAccess !== undefined ? e.hasSystemAccess : true
    })));
    setPayrollHistory(getPayrollRuns().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  };

  const saveEmployeeData = async (updated: Employee[]) => {
    try {
      await saveEmployees(updated);
      setEmployees(updated);
      closeModal();
    } catch (error) {
      console.error("Failed to save employee data:", error);
      alert("Failed to save employee data. Please try again.");
    }
  };

  const handleRunPayroll = async () => {
    const currentRuns = getPayrollRuns();
    const existing = currentRuns.find(p => p.month === payrollData.month && p.year === payrollData.year && p.status !== PayrollStatus.REJECTED);
    if (existing) return alert(`Payroll is already ${existing.status}.`);

    if (!window.confirm('Submit payroll request?')) return;

    const activeEmployees = employees.filter(e => e.status !== EmployeeStatus.TERMINATED);
    let totalAmount = 0;
    const items = activeEmployees.map(emp => {
      const net = Math.max(0, emp.salary - emp.pendingDeductions);
      totalAmount += net;
      return { employeeId: emp.id, employeeName: emp.name, baseSalary: emp.salary, deductions: emp.pendingDeductions, netPay: net };
    }).filter(i => i.netPay > 0);

    const newPayroll: PayrollRun = {
      id: generateUUID(),
      month: payrollData.month, year: payrollData.year,
      totalAmount, status: PayrollStatus.PENDING, createdAt: new Date().toISOString(), items
    };

    await savePayrollRuns([...currentRuns, newPayroll]);
    createAuditLog('RUN_PAYROLL', `Authorized payroll for ${new Date(payrollData.year, payrollData.month).toLocaleString('default', { month: 'long', year: 'numeric' })}. Total: ₵${totalAmount.toLocaleString()}`);
    refreshData();
    closeModal();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeAction === 'PAYROLL') return;

    let updated = [...employees];

    if (activeAction === 'EDIT') {
      const isNew = !employees.find(e => e.id === selectedEmployee?.id);

      let empData = {
        ...formData,
        salary: parseFloat(String(formData.salary || 0))
      };

      if (isNew) {
        // Auto-generate username: firstname.lastname (lowercase)
        const baseUsername = empData.name.split(' ').join('.').toLowerCase();
        // Check for uniqueness (simple append)
        let username = baseUsername;
        let counter = 1;
        while (employees.some(e => e.username === username)) {
          username = `${baseUsername}${counter}`;
          counter++;
        }

        empData = {
          ...empData,
          id: generateUUID(),
          status: EmployeeStatus.ACTIVE,
          joinDate: new Date().toISOString(),
          username: username,
          password: 'password123', // Default initial password
          passwordChangeRequired: true,
          isFirstLogin: true
        };

        updated.push(empData as Employee);
        createAuditLog('CREATE_EMPLOYEE', `Onboarded new staff: ${empData.name} (Username: ${username})`);
        alert(`Staff Created!\n\nUsername: ${username}\nDefault Password: password123`);
      } else {
        updated = updated.map(emp => emp.id === selectedEmployee.id ? { ...emp, ...empData } : emp);
        createAuditLog('UPDATE_EMPLOYEE', `Updated dossier for: ${empData.name}`);
      }
    } else if (activeAction === 'FINANCE') {
      const loanAmt = parseFloat(String(formData.loanAmount || 0));
      const months = parseFloat(String(formData.repaymentMonths || 1));

      updated = updated.map(emp => emp.id === selectedEmployee.id ? {
        ...emp,
        loanBalance: (emp.loanBalance || 0) + loanAmt,
        pendingDeductions: (emp.pendingDeductions || 0) + (loanAmt / months)
      } : emp);
      createAuditLog('APPROVE_LOAN', `Approved loan of ₵${loanAmt} for ${selectedEmployee.name}`);
    } else if (activeAction === 'LEAVE') {
      updated = updated.map(emp => emp.id === selectedEmployee.id ? {
        ...emp,
        status: formData.grantLeave === 'YES' ? EmployeeStatus.ON_LEAVE : EmployeeStatus.ACTIVE,
        leaveBalance: formData.grantLeave === 'YES' ? emp.leaveBalance - (Number(formData.deductDays) || 0) : emp.leaveBalance + (Number(formData.deductDays) || 0)
      } : emp);
      createAuditLog('UPDATE_LEAVE', `Updated leave status for ${selectedEmployee.name}: ${formData.grantLeave} (Days: ${formData.deductDays})`);
    } else if (activeAction === 'PERFORMANCE') {
      updated = updated.map(emp => emp.id === selectedEmployee.id ? { ...emp, performanceRating: Number(formData.rating) } : emp);
      createAuditLog('UPDATE_PERFORMANCE', `Rated ${selectedEmployee.name}: ${formData.rating}/5`);
    } else if (activeAction === 'STATUS') {
      updated = updated.map(emp => emp.id === selectedEmployee.id ? { ...emp, status: formData.newStatus } : emp);
    } else if (activeAction === 'PENALTY') {
      const penAmt = parseFloat(String(formData.deductionAmount || 0));
      updated = updated.map(emp => emp.id === selectedEmployee.id ? {
        ...emp,
        pendingDeductions: emp.pendingDeductions + penAmt
      } : emp);
      createAuditLog('APPLY_PENALTY', `Applied penalty of ₵${penAmt} to ${selectedEmployee.name}. Reason: ${formData.deductionReason}`);
    }

    await saveEmployeeData(updated);
  };

  const openFinanceModal = (emp: Employee) => {
    setSelectedEmployee(emp);
    setFormData({
      addLoan: '',
      loanAmount: 0,
      repaymentMonths: 6,
      loanPurpose: '',
      addSanction: ''
    });
    setActiveAction('FINANCE');
    setIsModalOpen(true);
  };

  const openLeaveModal = (emp: Employee) => {
    setSelectedEmployee(emp);
    setFormData({
      grantLeave: emp.status === EmployeeStatus.ON_LEAVE ? 'NO' : 'YES',
      deductDays: 0,
      leaveType: 'ANNUAL',
      leaveReason: '',
      leaveStartDate: '',
      leaveEndDate: ''
    });
    setActiveAction('LEAVE');
    setIsModalOpen(true);
  };
  const openPerformanceModal = (emp: Employee) => { setSelectedEmployee(emp); setFormData({ rating: emp.performanceRating }); setActiveAction('PERFORMANCE'); setIsModalOpen(true); };

  const openPenaltyModal = (emp: Employee) => {
    setSelectedEmployee(emp);
    setFormData({ deductionAmount: '', deductionReason: '' });
    setActiveAction('PENALTY');
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const r = new FileReader();
      r.onloadend = () => setFormData((prev: any) => ({ ...prev, [field]: r.result as string }));
      r.readAsDataURL(file);
    }
  };

  const closeModal = () => { setIsModalOpen(false); setActiveAction(null); setSelectedEmployee(null); setGeneratedPassword(null); setPasswordCopied(false); };

  const openResetPasswordModal = (emp: Employee) => {
    setSelectedEmployee(emp);
    setActiveAction('RESET_PASSWORD');
    setIsModalOpen(true);
  };

  const handleResetPassword = () => {
    if (!selectedEmployee) return;
    try {
      const newPassword = resetUserPassword(selectedEmployee.id);
      setGeneratedPassword(newPassword);
      createAuditLog('RESET_PASSWORD', `Reset password for ${selectedEmployee.name}`);
      refreshData();
    } catch (error) {
      alert('Error resetting password');
    }
  };

  const copyToClipboard = () => {
    if (generatedPassword) {
      navigator.clipboard.writeText(generatedPassword);
      setPasswordCopied(true);
      setTimeout(() => setPasswordCopied(false), 2000);
    }
  };



  const filtered = employees.filter(e => {
    const mSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase()) || e.phone.includes(searchTerm);
    const mTab = activeTab === 'ALL' || e.status === activeTab;
    return mSearch && mTab;
  });

  return (
    <div className="space-y-8 pb-12 transition-all duration-700 animate-in fade-in slide-in-from-bottom-2">

      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">HR</h1>
          <p className="text-stone-500 text-xs mt-1 font-medium italic opacity-80">Team Operations & Talent Hub</p>
        </div>
        <div className="flex gap-4">
          <button onClick={() => { setActiveAction('PAYROLL'); setPayrollData({ month: new Date().getMonth(), year: new Date().getFullYear() }); setIsModalOpen(true); }} className="bg-purple-600 text-white px-8 py-4 rounded-[2rem] font-bold shadow-xl hover:bg-purple-700 transition flex items-center gap-3 text-sm">
            <Banknote size={20} /> Force Payroll
          </button>
          <button onClick={() => { setSelectedEmployee(null); setFormData({ name: '', role: UserRole.CASHIER, phone: '', salary: '', joinDate: new Date().toISOString().split('T')[0], photoUrl: '', address: '', guarantorPhone: '', hasSystemAccess: true }); setActiveAction('EDIT'); setIsModalOpen(true); }} className="bg-purple-900 text-white px-8 py-4 rounded-[2rem] font-bold shadow-xl hover:bg-purple-800 transition flex items-center gap-3 text-sm">
            <Plus size={20} /> Onboard Staff
          </button>
        </div>
      </div>

      {/* KPI Stream */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Active Force", val: employees.filter(e => e.status === 'ACTIVE').length, icon: Users, col: "from-purple-600 to-purple-800" },
          { label: "On Leave", val: employees.filter(e => e.status === 'ON_LEAVE').length, icon: Clock, col: "from-purple-400 to-purple-600" },
          { label: "Monthly Burn", val: `₵${employees.filter(e => e.status !== 'TERMINATED').reduce((a, e) => a + e.salary, 0).toLocaleString()}`, icon: DollarSign, col: "from-purple-500 to-purple-700" },
          { label: "Performance", val: `${Math.round(employees.reduce((a, e) => a + e.performanceRating, 0) / employees.length * 20 || 0)}%`, icon: Star, col: "from-purple-300 to-purple-500" }
        ].map((kpi, i) => (
          <GlassCard key={i} className="p-6 relative overflow-hidden group">
            <div className="relative z-10 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">{kpi.label}</p>
                <h3 className="text-2xl font-bold text-stone-800 tracking-tighter">{kpi.val}</h3>
              </div>
              <div className={`p-3 rounded-2xl bg-gradient-to-br ${kpi.col} text-white shadow-lg`}>
                <kpi.icon size={20} />
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Control Panel */}
      <GlassCard className="p-6 flex flex-col lg:flex-row justify-between gap-6 items-center">
        <div className="flex gap-2 bg-stone-100 p-1.5 rounded-[1.5rem] overflow-x-auto no-scrollbar w-full lg:w-auto">
          {['ALL', ...Object.values(EmployeeStatus)].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-2 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-purple-600 shadow-lg' : 'text-stone-400 hover:text-stone-800'}`}>{tab}</button>
          ))}
        </div>
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
          <input type="text" placeholder="Locate personnel..." className="w-full pl-12 pr-6 py-4 bg-stone-50 border border-stone-200 rounded-[1.5rem] font-bold text-sm text-stone-800 focus:outline-none focus:ring-4 focus:ring-purple-100 transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </GlassCard>

      {/* Staff Grid (Identity Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {filtered.map(emp => (
          <GlassCard key={emp.id} className="group hover:shadow-2xl transition-all duration-500 overflow-hidden bg-white/90">
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div className="relative">
                  <div className="w-20 h-20 rounded-[2rem] bg-stone-100 border border-stone-200 overflow-hidden shadow-inner group-hover:scale-105 transition-transform duration-500">
                    {emp.photoUrl ? <img src={emp.photoUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-stone-300 font-bold text-2xl">{emp.name.charAt(0)}</div>}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-white shadow-sm ${emp.status === 'ACTIVE' ? 'bg-purple-600' : emp.status === 'ON_LEAVE' ? 'bg-purple-400' : 'bg-purple-200'}`}></div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openResetPasswordModal(emp)} title="Reset password" className="p-2 text-purple-300 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition"><Key size={16} /></button>
                  <button onClick={() => { setSelectedEmployee(emp); setFormData(emp); setActiveAction('EDIT'); setIsModalOpen(true); }} className="p-2 text-purple-300 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition"><Edit2 size={16} /></button>
                  <button onClick={() => { if (window.confirm('Delete dossier?')) { saveEmployeeData(employees.filter(e => e.id !== emp.id)); createAuditLog('DELETE_EMPLOYEE', `Deleted employee: ${emp.name}`); } }} className="p-2 text-purple-300 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition"><Trash2 size={16} /></button>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-bold text-stone-800 tracking-tight">{emp.name}</h3>
                <div className="flex flex-col gap-1 mt-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${emp.hasSystemAccess ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-stone-50 text-stone-400 border-stone-100'}`}>{emp.role}</span>
                    <span className="text-xs font-mono text-stone-300">ID-{emp.id.toUpperCase()}</span>
                  </div>
                  {emp.username && (
                    <span className="text-[10px] font-bold text-stone-400 bg-stone-50 px-2 py-0.5 rounded-full w-fit mt-1">
                      User: {emp.username}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3 text-sm font-bold text-stone-500 bg-stone-50 p-3 rounded-2xl group-hover:bg-white transition">
                  <Phone size={14} className="text-stone-300" /> {emp.phone}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-stone-50 p-3 rounded-2xl group-hover:bg-white transition border border-transparent group-hover:border-stone-100">
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Yield</p>
                    <p className="text-sm font-bold text-stone-800">₵{emp.salary.toLocaleString()}</p>
                  </div>
                  <div className="bg-stone-50 p-3 rounded-2xl group-hover:bg-white transition border border-transparent group-hover:border-stone-100">
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Leave</p>
                    <p className={`text-sm font-bold ${emp.leaveBalance < 5 ? 'text-rose-500' : 'text-stone-800'}`}>{emp.leaveBalance} Days</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center group-hover:bg-stone-50 p-2 rounded-2xl transition">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(s => <Star key={s} size={14} className={s <= emp.performanceRating ? 'text-amber-400 fill-amber-400' : 'text-stone-200'} />)}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openFinanceModal(emp)} className="p-2 text-purple-300 hover:text-purple-600 transition" title="Finance"><Banknote size={16} /></button>
                  <button onClick={() => openLeaveModal(emp)} className="p-2 text-purple-300 hover:text-purple-600 transition" title="Leave"><Clock size={16} /></button>
                  <button onClick={() => openPerformanceModal(emp)} className="p-2 text-purple-300 hover:text-purple-600 transition" title="Appraisal"><Star size={16} /></button>
                  <button onClick={() => openPenaltyModal(emp)} className="p-2 text-purple-300 hover:text-purple-600 transition" title="Penalty"><AlertTriangle size={16} /></button>
                </div>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Payroll History Footer */}
      <GlassCard className="p-8">
        <h3 className="text-lg font-bold text-stone-800 tracking-tight mb-6">Archive: Executive Payroll</h3>
        <div className="space-y-4">
          {payrollHistory.slice(0, 5).map(p => (
            <div key={p.id} className="flex flex-col sm:flex-row justify-between items-center p-5 bg-stone-50 rounded-[1.5rem] border border-stone-100 hover:bg-white transition-all group">
              <div className="flex items-center gap-4 mb-4 sm:mb-0">
                <div className="p-3 bg-white shadow-sm rounded-2xl text-stone-400 group-hover:text-purple-600 transition"><FileText size={24} /></div>
                <div>
                  <p className="font-bold text-stone-800 text-sm">{new Date(p.year, p.month).toLocaleString('default', { month: 'long', year: 'numeric' })} Global Run</p>
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Commited: {new Date(p.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-base font-bold text-stone-900 tracking-tighter">₵{p.totalAmount.toLocaleString()}</p>
                  <p className={`text-[9px] font-bold uppercase tracking-widest ${p.status === 'APPROVED' ? 'text-purple-600' : 'text-purple-400'}`}>{p.status}</p>
                </div>
                <ChevronRight size={20} className="text-stone-200 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Modals - Redesign */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xl flex items-center justify-center z-50 p-6 animate-in fade-in zoom-in-95 duration-300">
          {activeAction === 'RESET_PASSWORD' ? (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-[2rem] p-8 max-w-md w-full border border-amber-100 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center">
                  <Key className="text-purple-600" size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-stone-800">Reset Password</h3>
                  <p className="text-sm text-stone-600">{selectedEmployee?.name}</p>
                </div>
              </div>

              {!generatedPassword ? (
                <>
                  <div className="bg-white rounded-xl p-4 mb-6 border border-amber-100">
                    <p className="text-sm text-stone-600 mb-4">A new temporary password will be generated for this user. They will need to change it on first login.</p>
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="font-bold text-stone-700">Username:</p>
                        <p className="text-stone-600 font-mono bg-stone-50 px-3 py-2 rounded-lg">{selectedEmployee?.username || 'Not set'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleResetPassword}
                      className="flex-1 bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 transition flex items-center justify-center gap-2"
                    >
                      <Key size={18} /> Generate Password
                    </button>
                    <button
                      onClick={closeModal}
                      className="flex-1 bg-stone-200 text-stone-700 py-3 rounded-xl font-bold hover:bg-stone-300 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-white rounded-xl p-6 mb-6 border-2 border-emerald-200">
                    <p className="text-xs font-bold text-purple-600 uppercase mb-3">✓ Password Generated</p>
                    <div className="bg-purple-50 rounded-lg p-4 mb-4">
                      <p className="text-xs text-stone-600 mb-2 font-semibold">Temporary Password:</p>
                      <p className="text-3xl font-bold text-purple-600 font-mono tracking-widest">{generatedPassword}</p>
                    </div>
                    <button
                      onClick={copyToClipboard}
                      className="w-full bg-purple-600 text-white py-2.5 rounded-lg font-bold hover:bg-purple-700 transition flex items-center justify-center gap-2 text-sm"
                    >
                      {passwordCopied ? (
                        <><Check size={16} /> Copied</>
                      ) : (
                        <><Copy size={16} /> Copy Password</>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-stone-600 bg-stone-50 rounded-lg p-3 mb-6 border border-stone-200">📋 <strong>Important:</strong> Share this password with the employee. They must change it on first login.</p>
                  <button
                    onClick={closeModal}
                    className="w-full bg-stone-200 text-stone-700 py-3 rounded-xl font-bold hover:bg-stone-300 transition"
                  >
                    Done
                  </button>
                </>
              )}
            </div>
          ) : (
            <GlassCard className={`w-full ${activeAction === 'EDIT' ? 'max-w-2xl' : 'max-w-md'} bg-white shadow-[0_30px_100px_rgba(0,0,0,0.3)] overflow-hidden`}>
              <div className="px-10 py-8 border-b border-stone-100 bg-stone-50/30 flex justify-between items-center">
                <div>
                  <h3 className="text-3xl font-bold text-stone-900 tracking-tighter">{activeAction === 'EDIT' ? 'Personnel Dossier' : activeAction === 'PAYROLL' ? 'Global Disbursement' : 'Management Console'}</h3>
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mt-1">HR Operational Protocol</p>
                </div>
                <button onClick={closeModal} className="w-12 h-12 rounded-full border border-stone-200 flex items-center justify-center text-stone-400 hover:text-stone-800 transition"><Plus className="rotate-45" size={24} /></button>
              </div>

              <div className="p-10 max-h-[70vh] overflow-y-auto no-scrollbar">
                {activeAction === 'PAYROLL' && (
                  <div className="space-y-8 text-sm">
                    <div className="p-8 bg-purple-50 border border-purple-100 rounded-[2rem]">
                      <Banknote className="mx-auto text-purple-600 mb-4" size={48} />
                      <h4 className="text-xl font-bold text-purple-900">Authorize Monthly Payout</h4>
                      <p className="text-purple-700 mt-2 font-bold leading-relaxed">System will generate pending transactions for all active personnel for the selected cycle</p>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2 ml-1">Month</label>
                        <select
                          className="w-full px-5 py-3.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold focus:ring-4 focus:ring-purple-100 outline-none"
                          value={payrollData.month}
                          onChange={e => setPayrollData({ ...payrollData, month: parseInt(e.target.value) })}
                        >
                          {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (
                            <option key={i} value={i}>{m}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2 ml-1">Year</label>
                        <select
                          className="w-full px-5 py-3.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold focus:ring-4 focus:ring-purple-100 outline-none"
                          value={payrollData.year}
                          onChange={e => setPayrollData({ ...payrollData, year: parseInt(e.target.value) })}
                        >
                          {[2024, 2025, 2026, 2027].map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="p-6 bg-stone-50 border border-stone-100 rounded-[2rem] text-center">
                      <p className="text-sm font-bold text-stone-600">Selected Period:</p>
                      <p className="text-2xl font-bold text-stone-900 mt-2">{new Date(payrollData.year, payrollData.month).toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button onClick={closeModal} className="flex-1 py-4 font-bold text-stone-400 uppercase tracking-widest text-[10px]">Abort</button>
                      <button onClick={handleRunPayroll} className="flex-1 py-4 bg-purple-600 text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-xl hover:bg-purple-700 transition">Commit Run</button>
                    </div>
                  </div>
                )}

                {activeAction === 'EDIT' && (
                  <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="flex flex-col items-center mb-8">
                      <div className="w-48 h-48">
                        <ImageCapture
                          label="Identification Photo"
                          currentImage={formData.photoUrl}
                          onImageCaptured={(img) => setFormData({ ...formData, photoUrl: img })}
                          aspectRatio="square"
                        />
                      </div>
                      <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mt-3 whitespace-nowrap">Upload or Capture Staff Identity Photo</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="col-span-1 sm:col-span-2">
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2 ml-1">Legal Full Name</label>
                        <input required className="w-full px-5 py-3.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold focus:ring-4 focus:ring-purple-100 outline-none" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Staff Name" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2 ml-1">Contact No.</label>
                        <input required className="w-full px-5 py-3.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold focus:ring-4 focus:ring-purple-100 outline-none" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="Primary Phone" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2 ml-1">Capital Yield (GH₵)</label>
                        <input required type="number" className="w-full px-5 py-3.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold focus:ring-4 focus:ring-purple-100 outline-none" value={formData.salary} onChange={e => setFormData({ ...formData, salary: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2 ml-1">Join Date</label>
                        <input required type="date" className="w-full px-5 py-3.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold focus:ring-4 focus:ring-purple-100 outline-none" value={formData.joinDate} onChange={e => setFormData({ ...formData, joinDate: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2 ml-1">Guarantor Phone</label>
                        <input required className="w-full px-5 py-3.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold focus:ring-4 focus:ring-purple-100 outline-none" value={formData.guarantorPhone} onChange={e => setFormData({ ...formData, guarantorPhone: e.target.value })} placeholder="Reference Contact" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2 ml-1">Guarantor Name</label>
                        <input className="w-full px-5 py-3.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold focus:ring-4 focus:ring-purple-100 outline-none" value={formData.guarantorName || ''} onChange={e => setFormData({ ...formData, guarantorName: e.target.value })} placeholder="Full Name of Guarantor" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2 ml-1">Bank Account / Account Number</label>
                        <input className="w-full px-5 py-3.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold focus:ring-4 focus:ring-purple-100 outline-none" value={formData.bankAccount || ''} onChange={e => setFormData({ ...formData, bankAccount: e.target.value })} placeholder="Bank Account Number" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2 ml-1">Mobile Money Account</label>
                        <input className="w-full px-5 py-3.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold focus:ring-4 focus:ring-purple-100 outline-none" value={formData.mobileMoneyAccount || ''} onChange={e => setFormData({ ...formData, mobileMoneyAccount: e.target.value })} placeholder="e.g., MTN/Vodafone Number" />
                      </div>
                      <div className="col-span-1 sm:col-span-2">
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2 ml-1">Residential Address</label>
                        <textarea className="w-full px-5 py-3.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold focus:ring-4 focus:ring-purple-100 outline-none resize-none" rows={2} value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="Street, City, Region" />
                      </div>
                      <div className="grid grid-cols-2 gap-4 col-span-1 sm:col-span-2 pb-2">
                        <div className="space-y-2">
                          <ImageCapture
                            label="Ghana Card (Front)"
                            currentImage={formData.ghanaCardFrontUrl}
                            onImageCaptured={(img) => setFormData({ ...formData, ghanaCardFrontUrl: img })}
                            aspectRatio="video"
                          />
                        </div>
                        <div className="space-y-2">
                          <ImageCapture
                            label="Ghana Card (Back)"
                            currentImage={formData.ghanaCardBackUrl}
                            onImageCaptured={(img) => setFormData({ ...formData, ghanaCardBackUrl: img })}
                            aspectRatio="video"
                          />
                        </div>
                      </div>
                      <div className="col-span-1 sm:col-span-2 p-5 bg-stone-50 rounded-3xl border border-stone-100">
                        <div className="flex items-center gap-3 mb-4">
                          <input type="checkbox" id="sys-acc" className="w-5 h-5 rounded-lg border-stone-300 text-purple-600 focus:ring-purple-500" checked={formData.hasSystemAccess} onChange={e => setFormData({ ...formData, hasSystemAccess: e.target.checked })} />
                          <label htmlFor="sys-acc" className="text-sm font-bold text-stone-800 tracking-tight">Grant System Access Token</label>
                        </div>
                        <div className={`grid grid-cols-2 gap-4 ${!formData.hasSystemAccess ? 'opacity-30 pointer-events-none' : ''}`}>
                          <select className="px-5 py-3.5 bg-white border border-stone-200 rounded-2xl font-bold outline-none" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                            {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="pt-6 flex gap-4">
                      <button type="button" onClick={closeModal} className="flex-1 py-4 font-bold text-stone-400 uppercase tracking-widest text-[10px]">Abort</button>
                      <button type="submit" className="flex-1 py-4 bg-purple-900 text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-2xl hover:bg-purple-800 transition">Authorize Profile</button>
                    </div>
                  </form>
                )}

                {activeAction === 'FINANCE' && (
                  <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="p-6 bg-purple-50 rounded-[2rem] border border-purple-100 text-center">
                      <Banknote className="mx-auto text-purple-600 mb-4" size={48} />
                      <h4 className="text-xl font-bold text-purple-900">Employee Loan Management</h4>
                      <p className="text-purple-700 mt-2 font-bold leading-relaxed">Provide loans and manage employee deductions</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2">Loan Amount (GH₵)</label>
                        <input type="number" className="w-full px-5 py-3.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold" value={formData.loanAmount} onChange={e => setFormData({ ...formData, loanAmount: e.target.value })} placeholder="0.00" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2">Repayment Period</label>
                        <select className="w-full px-5 py-3.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold" value={formData.repaymentMonths} onChange={e => setFormData({ ...formData, repaymentMonths: Number(e.target.value) })}>
                          <option value={3}>3 Months</option>
                          <option value={6}>6 Months</option>
                          <option value={9}>9 Months</option>
                          <option value={12}>12 Months</option>
                          <option value={18}>18 Months</option>
                          <option value={24}>24 Months</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2">Monthly Deduction</label>
                        <div className="text-2xl font-bold text-purple-600">GH₵{formData.loanAmount && formData.repaymentMonths ? (formData.loanAmount / formData.repaymentMonths).toFixed(2) : '0.00'}</div>
                        <p className="text-xs text-stone-500 mt-1">Amount to be deducted from monthly salary</p>
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2">Loan Purpose</label>
                        <select className="w-full px-5 py-3.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold" value={formData.loanPurpose} onChange={e => setFormData({ ...formData, loanPurpose: e.target.value })}>
                          <option value="">Select Purpose</option>
                          <option value="EMERGENCY">Emergency</option>
                          <option value="EDUCATION">Education Support</option>
                          <option value="MEDICAL">Medical Expenses</option>
                          <option value="HOUSING">Housing Assistance</option>
                          <option value="PERSONAL">Personal Loan</option>
                          <option value="VEHICLE">Vehicle Purchase</option>
                        </select>
                      </div>
                    </div>

                    <div className="p-6 bg-purple-50 rounded-[2rem] border border-purple-100">
                      <div className="flex items-center gap-3 mb-4">
                        <AlertTriangle className="text-amber-600" size={20} />
                        <div>
                          <h5 className="font-bold text-purple-900">Current Loan Balance</h5>
                          <p className="text-2xl font-bold text-purple-900">GH₵{selectedEmployee?.loanBalance?.toLocaleString() || '0.00'}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="bg-white p-3 rounded-xl">
                          <p className="text-stone-600 font-bold">Total Outstanding</p>
                          <p className="text-lg font-bold text-rose-600">GH₵{(selectedEmployee?.loanBalance || 0) + (formData.loanAmount || 0)}</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl">
                          <p className="text-stone-600 font-bold">After Repayment</p>
                          <p className="text-lg font-bold text-purple-600">GH₵{Math.max(0, (selectedEmployee?.loanBalance || 0) + (formData.loanAmount || 0) - (formData.repaymentMonths ? ((formData.loanAmount || 0) / formData.repaymentMonths) * formData.repaymentMonths : 0))}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button type="button" onClick={closeModal} className="flex-1 py-4 font-bold text-stone-400 uppercase tracking-widest text-[10px]">Cancel</button>
                      <button type="submit" className="flex-1 py-4 bg-purple-600 text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-xl hover:bg-purple-700 transition">Approve Loan</button>
                    </div>
                  </form>
                )}

                {activeAction === 'PERFORMANCE' && (
                  <form onSubmit={handleSubmit} className="space-y-12 text-center">
                    <div className="space-y-6">
                      <p className="text-sm font-bold text-stone-800 tracking-tight uppercase tracking-widest leading-relaxed">Operational Efficiency Rating</p>
                      <div className="flex justify-center gap-4">
                        {[1, 2, 3, 4, 5].map(s => <button key={s} type="button" onClick={() => setFormData({ ...formData, rating: s })} className="transform hover:scale-125 transition-transform"><Star size={40} className={s <= formData.rating ? 'text-amber-400 fill-amber-400 shadow-xl shadow-amber-100' : 'text-stone-100'} /></button>)}
                      </div>
                    </div>
                    <button type="submit" className="w-full py-4 bg-purple-900 text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-xl hover:bg-purple-800 transition">Commit Appraisal</button>
                  </form>
                )}

                {activeAction === 'PENALTY' && (
                  <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="p-6 bg-purple-900/10 rounded-[2rem] border border-purple-200 text-center">
                      <AlertTriangle className="mx-auto text-purple-600 mb-4" size={48} />
                      <h4 className="text-xl font-bold text-purple-900">Penalty & Deductions</h4>
                      <p className="text-purple-700 mt-2 font-bold leading-relaxed">Apply financial sanctions for absence or misconduct</p>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2 ml-1">Deduction Amount (GH₵)</label>
                        <input required type="number" className="w-full px-5 py-3.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold text-lg text-purple-600 focus:ring-4 focus:ring-purple-100 outline-none" value={formData.deductionAmount} onChange={e => setFormData({ ...formData, deductionAmount: e.target.value })} placeholder="0.00" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2 ml-1">Reason for Sanction</label>
                        <textarea required className="w-full px-5 py-3.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold focus:ring-4 focus:ring-purple-100 outline-none resize-none" rows={3} value={formData.deductionReason} onChange={e => setFormData({ ...formData, deductionReason: e.target.value })} placeholder="e.g. Unexcused absence on Jan 12..." />
                      </div>
                    </div>

                    <div className="p-6 bg-stone-50 rounded-[2rem] border border-stone-100">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-bold text-stone-500">Current Salary</span>
                        <span className="text-sm font-bold text-stone-800">₵{selectedEmployee?.salary.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-bold text-stone-500">Existing Deductions</span>
                        <span className="text-sm font-bold text-amber-600">-₵{selectedEmployee?.pendingDeductions.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-stone-200">
                        <span className="text-sm font-bold text-stone-800">Net after Penalty</span>
                        <span className="text-lg font-bold text-purple-600">
                          ₵{Math.max(0, (selectedEmployee?.salary || 0) - (selectedEmployee?.pendingDeductions || 0) - (Number(formData.deductionAmount) || 0)).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <button type="button" onClick={closeModal} className="flex-1 py-4 font-bold text-stone-400 uppercase tracking-widest text-[10px]">Cancel</button>
                      <button type="submit" className="flex-1 py-4 bg-purple-900 text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-xl hover:bg-purple-800 transition">Confiscate Funds</button>
                    </div>
                  </form>
                )}




                {(activeAction === 'LEAVE' || activeAction === 'STATUS') && (
                  <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="p-6 bg-purple-50 rounded-[2rem] border border-purple-100 text-center">
                      <Clock className="mx-auto text-purple-600 mb-4" size={48} />
                      <h4 className="text-xl font-bold text-purple-900">Leave Management</h4>
                      <p className="text-purple-700 mt-2 font-bold leading-relaxed">Configure employee leave and time off</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2">Leave Type</label>
                        <select className="w-full px-5 py-3.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold" value={formData.leaveType} onChange={e => setFormData({ ...formData, leaveType: e.target.value })}>
                          <option value="ANNUAL">Annual Leave</option>
                          <option value="SICK">Sick Leave</option>
                          <option value="MATERNITY">Maternity Leave</option>
                          <option value="PATERNITY">Paternity Leave</option>
                          <option value="COMPASSIONATE">Compassionate Leave</option>
                          <option value="STUDY">Study Leave</option>
                          <option value="UNPAID">Unpaid Leave</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2">Leave Status</label>
                        <select className="w-full px-5 py-3.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold" value={formData.grantLeave} onChange={e => setFormData({ ...formData, grantLeave: e.target.value })}>
                          <option value="YES">Authorize Leave</option>
                          <option value="NO">Return to Duty</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2">Days to Deduct</label>
                        <input type="number" className="w-full px-5 py-3.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold" value={formData.deductDays} onChange={e => setFormData({ ...formData, deductDays: e.target.value })} placeholder="0" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2">Leave Reason</label>
                        <textarea className="w-full px-5 py-3.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold resize-none" rows={3} value={formData.leaveReason} onChange={e => setFormData({ ...formData, leaveReason: e.target.value })} placeholder="Enter leave reason..."></textarea>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2">Start Date</label>
                          <input type="date" className="w-full px-5 py-3.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold" value={formData.leaveStartDate} onChange={e => setFormData({ ...formData, leaveStartDate: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2">End Date</label>
                          <input type="date" className="w-full px-5 py-3.5 bg-stone-50 border border-stone-200 rounded-2xl font-bold" value={formData.leaveEndDate} onChange={e => setFormData({ ...formData, leaveEndDate: e.target.value })} />
                        </div>
                      </div>
                    </div>

                    <div className="p-6 bg-stone-50 rounded-[2rem] border border-stone-100">
                      <div className="flex items-center gap-3 mb-4">
                        <Calendar className="text-stone-600" size={20} />
                        <div>
                          <h5 className="font-bold text-stone-900">Current Leave Balance</h5>
                          <p className="text-2xl font-bold text-purple-900">{selectedEmployee?.leaveBalance || 0} Days</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="bg-white p-3 rounded-xl">
                          <p className="text-stone-600 font-bold">After Deduction</p>
                          <p className="text-lg font-bold text-rose-600">{Math.max(0, (selectedEmployee?.leaveBalance || 0) - (Number(formData.deductDays) || 0))} Days</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl">
                          <p className="text-stone-600 font-bold">New Balance</p>
                          <p className="text-lg font-bold text-purple-600">{Math.max(0, (selectedEmployee?.leaveBalance || 0) - (Number(formData.deductDays) || 0))} Days</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button type="button" onClick={closeModal} className="flex-1 py-4 font-bold text-stone-400 uppercase tracking-widest text-[10px]">Cancel</button>
                      <button type="submit" className="flex-1 py-4 bg-purple-600 text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-xl hover:bg-purple-700 transition">Process Leave</button>
                    </div>
                  </form>
                )}
              </div>
            </GlassCard>
          )}
        </div>
      )}
    </div>
  );
};
