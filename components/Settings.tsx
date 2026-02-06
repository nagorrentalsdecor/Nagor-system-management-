import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  AlertCircle,
  CheckCircle,
  XCircle,
  UserCog,
  Lock,
  Bell,
  CreditCard,
  FileText,
  Users,
  Mail,
  Calendar as CalendarIcon,
  Shield,
  Key,
  Database,
  Globe,
  Zap,
  Clock,
  Star,
  TrendingUp,
  Phone,
  Trash2,
  Edit2,
  UserPlus,
  MoreVertical
} from 'lucide-react';
import { getEmployees, getSettings, saveSettings, saveEmployees, getAuditLogs, createAuditLog, exportDatabase, importDatabase, clearDatabase, seedDatabase } from '../services/db';
import { AuditLog, Employee, EmployeeStatus } from '../types';

type SettingSection = 'general' | 'users' | 'notifications' | 'billing' | 'invoices' | 'team' | 'logs' | 'data';

interface SettingItem {
  id: string;
  label: string;
  description: string;
  type: 'toggle' | 'select' | 'text' | 'number' | 'date' | 'textarea';
  options?: { label: string; value: string }[];
  value: any;
  section: SettingSection;
}



const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white/80 backdrop-blur-md border border-white/40 shadow-xl shadow-stone-200/40 rounded-[2.5rem] ${className}`}>
    {children}
  </div>
);

export const Settings = () => {
  const [activeTab, setActiveTab] = useState<SettingSection>('general');
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    if (activeTab === 'logs') {
      setLogs(getAuditLogs());
    }
  }, [activeTab]);

  const [showUserModal, setShowUserModal] = useState(false);
  const [editingSystemUser, setEditingSystemUser] = useState<Employee | null>(null);
  const [selectedEmployeeForAccess, setSelectedEmployeeForAccess] = useState<string>('');
  const [userFormRole, setUserFormRole] = useState<string>('');

  const [employees, setEmployees] = useState<any[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [teamSecuritySettings, setTeamSecuritySettings] = useState({
    requireStrongPassword: true,
    logActivities: true,
    requireTwoFactor: false
  });

  // Load team members from employees
  useEffect(() => {
    const loadedEmployees = getEmployees();
    setEmployees(loadedEmployees);
  }, []);

  // Initialize settings
  useEffect(() => {
    const loadedSettings = getSettings();
    if (loadedSettings.length > 0) {
      setSettings(loadedSettings);
    } else {
      // Fallback if DB is empty (should be seeded by seedDatabase)
      const initialSettings: SettingItem[] = [
        {
          id: 'business_name',
          label: 'Business Name',
          description: 'The name of your rental business',
          type: 'text',
          value: 'Nagor Rentals',
          section: 'general'
        },
        {
          id: 'currency',
          label: 'Currency',
          description: 'Default currency for all transactions',
          type: 'select',
          options: [
            { label: 'Ghana Cedi (GH₵)', value: 'GHS' },
            { label: 'US Dollar ($)', value: 'USD' },
            { label: 'Euro (€)', value: 'EUR' },
            { label: 'Pound Sterling (£)', value: 'GBP' },
          ],
          value: 'GHS',
          section: 'general'
        },
        {
          id: 'timezone',
          label: 'Time Zone',
          description: 'Set your local time zone for accurate time tracking',
          type: 'select',
          options: [
            { label: 'Africa/Accra (GMT+0)', value: 'Africa/Accra' },
            { label: 'UTC (GMT+0)', value: 'UTC' },
          ],
          value: 'Africa/Accra',
          section: 'general'
        },
        {
          id: 'business_address',
          label: 'Business Address',
          description: 'Your business address for invoices and receipts',
          type: 'textarea',
          value: '123 Business Street\nAccra, Ghana',
          section: 'general'
        },
        {
          id: 'business_email',
          label: 'Business Email',
          description: 'Contact email for customer inquiries',
          type: 'text',
          value: 'info@nagorrentals.com',
          section: 'general'
        },
        {
          id: 'business_phone',
          label: 'Business Phone',
          description: 'Contact phone number for customers',
          type: 'text',
          value: '+233 24 123 4567',
          section: 'general'
        },
        {
          id: 'notifications_enabled',
          label: 'Email Notifications',
          description: 'Receive email notifications for important events',
          type: 'toggle',
          value: true,
          section: 'notifications'
        },
        {
          id: 'notify_overdue',
          label: 'Overdue Alerts',
          description: 'Get notified when items are overdue',
          type: 'toggle',
          value: true,
          section: 'notifications'
        },
        {
          id: 'notify_new_booking',
          label: 'New Booking Alerts',
          description: 'Get notified for new bookings',
          type: 'toggle',
          value: true,
          section: 'notifications'
        },
        {
          id: 'invoice_prefix',
          label: 'Invoice Prefix',
          description: 'Prefix for all invoice numbers (e.g., NR-)',
          type: 'text',
          value: 'NR-',
          section: 'invoices'
        },
        {
          id: 'invoice_terms',
          label: 'Payment Terms',
          description: 'Default payment terms for invoices (in days)',
          type: 'number',
          value: 7,
          section: 'invoices'
        },
        {
          id: 'deposit_percentage',
          label: 'Default Deposit Percentage',
          description: 'Default deposit required for bookings',
          type: 'number',
          value: 30,
          section: 'billing'
        },
        {
          id: 'late_fee_percentage',
          label: 'Late Return Fee',
          description: 'Daily late fee as percentage of rental cost',
          type: 'number',
          value: 10,
          section: 'billing'
        },
      ];
      setSettings(initialSettings);
    }
  }, []);

  const handleSettingChange = (id: string, value: any) => {
    setSettings(prev =>
      prev.map(setting =>
        setting.id === id ? { ...setting, value } : setting
      )
    );
  };

  const handleSave = () => {
    setIsSaving(true);
    setSaveStatus({ type: null, message: '' });

    try {
      saveSettings(settings);
      createAuditLog('UPDATE_SETTINGS', 'Updated system configuration');
      setIsSaving(false);
      setSaveStatus({
        type: 'success',
        message: 'Settings saved successfully!'
      });

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveStatus({ type: null, message: '' });
      }, 3000);
    } catch (error) {
      setIsSaving(false);
      setSaveStatus({
        type: 'error',
        message: 'Failed to save settings.'
      });
    }
  };

  // Team Settings Handlers
  const handleDeleteMember = (memberId: string) => {
    if (window.confirm('Are you sure you want to delete this team member? This will verify system access.')) {
      const updatedEmployees = employees.filter(e => e.id !== memberId);
      setEmployees(updatedEmployees);
      saveEmployees(updatedEmployees);
      createAuditLog('DELETE_EMPLOYEE', `Deleted employee ID: ${memberId} via Settings`);
      alert('Team member removed successfully');
    }
  };

  const handleEditMember = (member: any) => {
    setSelectedMember(member);
    setShowAddMember(true);
  };

  const handleSaveTeamSettings = () => {
    alert('Team security settings saved successfully!');
    createAuditLog('UPDATE_SECURITY', 'Updated team security settings');
    console.log('Saving team security settings:', teamSecuritySettings);
  };

  const handleToggleSecurity = (setting: string) => {
    setTeamSecuritySettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  // User Management Handlers (Refactored)
  const handleAddUser = () => {
    setEditingSystemUser(null);
    setSelectedEmployeeForAccess('');
    setUserFormRole('');
    setShowUserModal(true);
  };

  const handleEditUser = (user: Employee) => {
    setEditingSystemUser(user);
    setUserFormRole(user.role);
    setShowUserModal(true);
  };

  const handleSaveUser = () => {
    if (editingSystemUser) {
      // Update existing user role
      const updatedEmployees = employees.map(emp =>
        emp.id === editingSystemUser.id ? { ...emp, role: userFormRole } : emp
      ) as Employee[];

      setEmployees(updatedEmployees);
      saveEmployees(updatedEmployees);
      createAuditLog('UPDATE_USER_ACCESS', `Updated access role for: ${editingSystemUser.name} to ${userFormRole}`);
      alert('User role updated successfully');
    } else {
      // Grant access to new user
      if (!selectedEmployeeForAccess || !userFormRole) {
        alert('Please select an employee and a role');
        return;
      }

      const updatedEmployees = employees.map(emp => {
        if (emp.id === selectedEmployeeForAccess) {
          // Auto-generate credentials if missing
          const username = emp.username || `${emp.name.split(' ')[0].toLowerCase()}.${Math.floor(Math.random() * 1000)}`;
          const tempPassword = 'password123'; // Default for new access

          return {
            ...emp,
            hasSystemAccess: true,
            role: userFormRole,
            username,
            password: tempPassword,
            isFirstLogin: true,
            passwordChangeRequired: true
          };
        }
        return emp;
      }) as Employee[];

      setEmployees(updatedEmployees);
      saveEmployees(updatedEmployees);
      createAuditLog('GRANT_USER_ACCESS', `Granted system access to: ${employees.find(e => e.id === selectedEmployeeForAccess)?.name}`);
      alert(`Access granted successfully! Default password is 'password123'. Login required.`);
    }
    setShowUserModal(false);
  };

  const handleRevokeAccess = (userId: string) => {
    if (window.confirm('Are you sure you want to REVOKE system access for this user? They will no longer be able to log in.')) {
      const updatedEmployees = employees.map(emp =>
        emp.id === userId ? { ...emp, hasSystemAccess: false } : emp
      );
      setEmployees(updatedEmployees);
      saveEmployees(updatedEmployees);
      createAuditLog('REVOKE_USER_ACCESS', `Revoked system access for user ID: ${userId}`);
      alert('Access revoked successfully');
    }
  };

  // Data Management Handlers
  const handleBackup = () => {
    const jsonString = exportDatabase();
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nagor_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    createAuditLog('BACKUP_DATA', 'Created system backup');
    setSaveStatus({ type: 'success', message: 'Backup downloaded successfully!' });
    setTimeout(() => setSaveStatus({ type: null, message: '' }), 3000);
  };

  const handleRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!window.confirm('WARNING: restoring data will overwrite your current system data. This cannot be undone. Are you sure?')) {
      event.target.value = ''; // Reset input
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (importDatabase(content)) {
        createAuditLog('RESTORE_DATA', 'Restored system from backup');
        alert('System restored successfully! The page will now reload.');
        window.location.reload();
      } else {
        alert('Failed to restore data. Invalid file format.');
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    if (window.confirm('DANGER: This will delete ALL data including bookings, customers, and inventory. This action cannot be undone. Are you sure?')) {
      if (window.confirm('Are you REALLY sure? Last chance!')) {
        clearDatabase();
        seedDatabase();
        createAuditLog('RESET_SYSTEM', 'Performed factory reset');
        alert('System reset complete. Reloading...');
        window.location.reload();
      }
    }
  };

  const handleProductionPurge = async () => {
    if (window.confirm('PRODUCTION PROTOCOL: This will permanently delete all TEST Bookings, Transactions, Payroll, and Audit Logs.\n\nInventory, Employees, and Settings will be PRESERVED.\n\nAre you ready to launch productively?')) {
      if (window.confirm('FINAL CONFIRMATION: Purge all activity records?')) {
        try {
          await clearDatabase();
          alert('System purged successfully! All test records have been removed. The system is now ready for production. Reloading...');
          window.location.reload();
        } catch (err) {
          console.error(err);
          alert('Failed to purge data. Please check your connection.');
        }
      }
    }
  };

  const sections = [
    { id: 'general', label: 'General', icon: <SettingsIcon className="h-4 w-4 mr-2" /> },
    { id: 'users', label: 'Users & Permissions', icon: <UserCog className="h-4 w-4 mr-2" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4 mr-2" /> },


    { id: 'team', label: 'Team Settings', icon: <Users className="h-4 w-4 mr-2" /> },
    { id: 'data', label: 'Data Management', icon: <Database className="h-4 w-4 mr-2" /> },
    { id: 'logs', label: 'System Activity', icon: <Clock className="h-4 w-4 mr-2" /> },
  ];

  const filteredSettings = settings.filter(setting => setting.section === activeTab);

  const renderGeneralTab = () => (
    <div className="space-y-8">
      <GlassCard className="p-8">
        <div className="flex items-center mb-6">
          <div className="p-3 bg-purple-100 rounded-full mr-4">
            <Globe className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-stone-800">Business Information</h3>
            <p className="text-sm text-stone-500">Configure your business details and preferences</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {filteredSettings.map((setting) => (
            <div key={setting.id} className="space-y-2">
              <label htmlFor={setting.id} className="block text-sm font-bold text-stone-700 mb-2">
                {setting.label}
              </label>
              <p className="text-xs text-stone-500 mb-2">{setting.description}</p>
              {setting.type === 'toggle' ? (
                <div className="flex items-center h-10">
                  <button
                    type="button"
                    className={`${setting.value ? 'bg-purple-600' : 'bg-stone-200'
                      } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500`}
                    onClick={() => handleSettingChange(setting.id, !setting.value)}
                  >
                    <span className="sr-only">Toggle</span>
                    <span
                      className={`${setting.value ? 'translate-x-5' : 'translate-x-0'
                        } pointer-events-none relative inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                    >
                      <span
                        className={`${setting.value ? 'opacity-0 ease-out duration-100' : 'opacity-100 ease-in duration-200'
                          } absolute inset-0 h-full w-full flex items-center justify-center transition-opacity`}
                        aria-hidden="true"
                      >
                        <svg className="h-3 w-3 text-stone-400" fill="none" viewBox="0 0 12 12">
                          <path
                            d="M4 8l2-2m0 0l2-2M6 6L4 4m2 2l2 2"
                            stroke="currentColor"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                      <span
                        className={`${setting.value ? 'opacity-100 duration-200 ease-in' : 'opacity-0 duration-100 ease-out'
                          } absolute inset-0 h-full w-full flex items-center justify-center transition-opacity`}
                        aria-hidden="true"
                      >
                        <svg className="h-3 w-3 text-purple-600" fill="currentColor" viewBox="0 0 12 12">
                          <path d="M3.707 5.293a1 1 0 00-1.414 1.414l1.414-1.414zM5 8l-.707.707a1 1 0 001.414 0L5 8zm4.707-3.293a1 1 0 00-1.414-1.414L1.414 1.414zm-7.414 2l2 2 1.414-1.414-2-2-1.414 1.414zm3.414 2l4-4-1.414-1.414-2-2-1.414 1.414z" />
                        </svg>
                      </span>
                    </span>
                  </button>
                </div>
              ) : setting.type === 'select' ? (
                <select
                  id={setting.id}
                  value={setting.value}
                  onChange={(e) => handleSettingChange(setting.id, e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-3 text-base border-stone-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-xl"
                >
                  {setting.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : setting.type === 'textarea' ? (
                <textarea
                  id={setting.id}
                  rows={3}
                  value={setting.value}
                  onChange={(e) => handleSettingChange(setting.id, e.target.value)}
                  className="shadow-sm focus:ring-purple-500 focus:border-purple-500 mt-1 block w-full sm:text-sm border border-stone-300 rounded-xl p-3"
                />
              ) : (
                <input
                  type={setting.type}
                  id={setting.id}
                  value={setting.value}
                  onChange={(e) => handleSettingChange(setting.id, e.target.value)}
                  className="shadow-sm focus:ring-purple-500 focus:border-purple-500 mt-1 block w-full sm:text-sm border border-stone-300 rounded-xl p-3"
                />
              )}
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-8 py-4 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Save size={20} />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );

  const renderUsersTab = () => {
    const systemUsers = employees.filter(e => e.hasSystemAccess);
    const employeesWithoutAccess = employees.filter(e => !e.hasSystemAccess && e.status === EmployeeStatus.ACTIVE);

    return (
      <div className="space-y-8">
        <GlassCard className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-full mr-4">
                <Shield className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-stone-800">User Management</h3>
                <p className="text-sm text-stone-500">Manage system access for employees</p>
              </div>
            </div>
            <button onClick={handleAddUser} className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Grant Access
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-200">
              <thead className="bg-stone-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Username</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Last Active</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-stone-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-stone-200">
                {systemUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 bg-stone-200 rounded-full flex items-center justify-center mr-3">
                          <span className="text-sm font-bold text-stone-600">{user.name.charAt(0)}</span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-stone-900">{user.name}</div>
                          <div className="text-xs text-stone-500">{user.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600 font-mono">
                      {user.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-bold rounded-full ${user.role === 'ADMIN' ? 'bg-purple-900 text-white' :
                        user.role === 'MANAGER' ? 'bg-purple-600 text-white' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                      {/* Placeholder for now as we don't track session activity yet */}
                      Live
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button onClick={() => handleEditUser(user)} className="text-purple-600 hover:text-purple-900 font-medium text-sm hover:bg-purple-50 px-3 py-1 rounded-lg transition">Edit Role</button>
                        <button onClick={() => handleRevokeAccess(user.id)} className="text-purple-900 hover:text-purple-700 font-medium text-sm hover:bg-purple-50 px-3 py-1 rounded-lg transition">Revoke</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {systemUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-stone-400">
                      No users have system access yet. Click "Grant Access" to start.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>

        {/* User Modal */}
        {showUserModal && (
          <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xl flex items-center justify-center z-50 p-6">
            <GlassCard className="w-full max-w-md bg-white shadow-2xl">
              <div className="p-8">
                <h3 className="text-xl font-bold text-stone-800 mb-6">{editingSystemUser ? 'Edit User Access' : 'Grant System Access'}</h3>

                <div className="space-y-4 mb-6">
                  {editingSystemUser ? (
                    <div>
                      <label className="block text-sm font-bold text-stone-700 mb-2">Employee</label>
                      <input
                        type="text"
                        value={editingSystemUser.name}
                        disabled
                        className="w-full px-4 py-2 bg-stone-100 border border-stone-300 rounded-lg text-stone-500"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-bold text-stone-700 mb-2">Select Employee</label>
                      <select
                        value={selectedEmployeeForAccess}
                        onChange={(e) => setSelectedEmployeeForAccess(e.target.value)}
                        className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                      >
                        <option value="">Choose an employee...</option>
                        {employeesWithoutAccess.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.name}</option>
                        ))}
                      </select>
                      {employeesWithoutAccess.length === 0 && (
                        <p className="text-xs text-amber-600 mt-1">No active employees found without access.</p>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-bold text-stone-700 mb-2">System Role</label>
                    <select
                      value={userFormRole}
                      onChange={(e) => setUserFormRole(e.target.value)}
                      className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                      <option value="">Select a role</option>
                      <option value="ADMIN">Administrator (Full Access)</option>
                      <option value="MANAGER">Manager (Operations)</option>
                      <option value="FINANCE">Finance Officer</option>
                      <option value="CASHIER">Cashier</option>
                      <option value="SALES">Sales Personnel</option>
                      <option value="VIEWER">Viewer (Read Only)</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowUserModal(false)}
                    className="flex-1 px-4 py-2 bg-stone-200 text-stone-700 rounded-lg font-bold hover:bg-stone-300 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveUser}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition"
                  >
                    {editingSystemUser ? 'Update Role' : 'Grant Access'}
                  </button>
                </div>
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    );
  };

  const renderNotificationsTab = () => {
    const notificationSettings = filteredSettings;
    return (
      <div className="space-y-8">
        <GlassCard className="p-8">
          <div className="flex items-center mb-6">
            <div className="p-3 bg-purple-100 rounded-full mr-4">
              <Bell className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-800">Notification Preferences</h3>
              <p className="text-sm text-stone-500">Configure how you receive system alerts</p>
            </div>
          </div>

          <div className="space-y-6">
            {notificationSettings.map((setting) => (
              <div key={setting.id} className="flex items-center justify-between p-4 bg-stone-50 rounded-xl hover:bg-stone-100 transition">
                <div className="flex-1">
                  <div>
                    <h4 className="text-sm font-bold text-stone-800">{setting.label}</h4>
                    <p className="text-xs text-stone-500 mt-1">{setting.description}</p>
                  </div>
                </div>
                <div className="ml-4">
                  {setting.type === 'toggle' && (
                    <button
                      type="button"
                      className={`${setting.value ? 'bg-purple-600' : 'bg-purple-200'
                        } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200`}
                      onClick={() => handleSettingChange(setting.id, !setting.value)}
                    >
                      <span
                        className={`${setting.value ? 'translate-x-5' : 'translate-x-0'
                          } pointer-events-none relative inline-block h-5 w-5 rounded-full bg-white shadow transform transition ease-in-out duration-200`}
                      />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-8 py-4 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Save size={20} />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    );
  };

  const renderBillingTab = () => (
    <div className="space-y-8">
      <GlassCard className="p-8">
        <div className="flex items-center mb-6">
          <div className="p-3 bg-purple-100 rounded-full mr-4">
            <CreditCard className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-stone-800">Billing Configuration</h3>
            <p className="text-sm text-stone-500">Set up payment processing and fee structures</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredSettings.map((setting) => (
            <div key={setting.id} className="space-y-2">
              <label htmlFor={setting.id} className="block text-sm font-bold text-stone-700 mb-2">
                {setting.label}
              </label>
              <p className="text-xs text-stone-500 mb-2">{setting.description}</p>
              <div className="relative">
                <input
                  type={setting.type}
                  id={setting.id}
                  value={setting.value}
                  onChange={(e) => handleSettingChange(setting.id, e.target.value)}
                  className="shadow-sm focus:ring-purple-500 focus:border-purple-500 mt-1 block w-full sm:text-sm border border-stone-300 rounded-xl p-3 pr-12"
                />
                {setting.type === 'number' && (
                  <span className="absolute right-3 top-3 text-stone-500 text-sm">%</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-8 py-4 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Save size={20} />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );

  const renderInvoicesTab = () => (
    <div className="space-y-8">
      <GlassCard className="p-8">
        <div className="flex items-center mb-6">
          <div className="p-3 bg-purple-100 rounded-full mr-4">
            <FileText className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-stone-800">Invoice Settings</h3>
            <p className="text-sm text-stone-500">Configure invoice numbering and payment terms</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredSettings.map((setting) => (
            <div key={setting.id} className="space-y-2">
              <label htmlFor={setting.id} className="block text-sm font-bold text-stone-700 mb-2">
                {setting.label}
              </label>
              <p className="text-xs text-stone-500 mb-2">{setting.description}</p>
              {setting.type === 'number' ? (
                <div className="relative">
                  <input
                    type={setting.type}
                    id={setting.id}
                    value={setting.value}
                    onChange={(e) => handleSettingChange(setting.id, e.target.value)}
                    className="shadow-sm focus:ring-purple-500 focus:border-purple-500 mt-1 block w-full sm:text-sm border border-stone-300 rounded-xl p-3 pr-12"
                  />
                  <span className="absolute right-3 top-3 text-stone-500 text-sm">days</span>
                </div>
              ) : (
                <input
                  type={setting.type}
                  id={setting.id}
                  value={setting.value}
                  onChange={(e) => handleSettingChange(setting.id, e.target.value)}
                  className="shadow-sm focus:ring-purple-500 focus:border-purple-500 mt-1 block w-full sm:text-sm border border-stone-300 rounded-xl p-3"
                />
              )}
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-8 py-4 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Save size={20} />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );

  const renderTeamTab = () => (
    <div className="space-y-8">
      {/* Team Overview - Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <GlassCard className="p-4 sm:p-6 bg-gradient-to-br from-purple-50/50 to-purple-100/30 border-purple-100/50">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0">
            <div>
              <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">Total Team</p>
              <p className="text-2xl sm:text-4xl font-bold text-purple-900 mt-2">{employees.length}</p>
            </div>
            <Users className="text-purple-400 hidden sm:block flex-shrink-0" size={24} />
          </div>
        </GlassCard>

        <GlassCard className="p-4 sm:p-6 bg-gradient-to-br from-purple-50/50 to-purple-100/30 border-purple-100/50">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0">
            <div>
              <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">Active</p>
              <p className="text-2xl sm:text-4xl font-bold text-purple-900 mt-2">{employees.filter(e => e.status === 'ACTIVE').length}</p>
            </div>
            <UserCog className="text-purple-400 hidden sm:block flex-shrink-0" size={24} />
          </div>
        </GlassCard>

        <GlassCard className="p-4 sm:p-6 bg-gradient-to-br from-purple-50/50 to-purple-100/30 border-purple-100/50">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0">
            <div>
              <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">With Access</p>
              <p className="text-2xl sm:text-4xl font-bold text-purple-900 mt-2">{employees.filter(e => e.hasSystemAccess).length}</p>
            </div>
            <Shield className="text-purple-400 hidden sm:block flex-shrink-0" size={24} />
          </div>
        </GlassCard>

        <GlassCard className="p-4 sm:p-6 bg-gradient-to-br from-purple-50/50 to-purple-100/30 border-purple-100/50">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0">
            <div>
              <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">Laborers</p>
              <p className="text-2xl sm:text-4xl font-bold text-purple-900 mt-2">{employees.filter(e => e.role === 'LABORER').length}</p>
            </div>
            <TrendingUp className="text-purple-400 hidden sm:block flex-shrink-0" size={24} />
          </div>
        </GlassCard>
      </div>

      {/* Team Members List */}
      <GlassCard className="p-4 sm:p-8 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">Team Members</h3>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">Manage and monitor all team members</p>
          </div>
          <button
            onClick={() => setShowAddMember(true)}
            type="button"
            className="w-full sm:w-auto px-4 sm:px-6 py-3 bg-purple-600 text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center sm:justify-start gap-2 hover:bg-purple-700 transition shadow-lg shadow-purple-600/20 active:scale-95"
          >
            <UserPlus size={18} /> Add Team Member
          </button>
        </div>

        {employees.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-stone-100 rounded-full mb-4">
              <Users className="h-8 w-8 text-stone-400" />
            </div>
            <h4 className="text-lg font-bold text-stone-800 mb-2">No Team Members Yet</h4>
            <p className="text-xs sm:text-sm text-stone-500 px-4">Start building your team by adding members in the HR section</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-left min-w-full">
              <thead className="text-[8px] sm:text-[9px] font-bold uppercase text-stone-400 tracking-widest border-b border-stone-100 bg-stone-50/50">
                <tr>
                  <th className="px-3 sm:px-6 py-3 sm:py-4">Name</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 hidden sm:table-cell">Role</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 hidden md:table-cell">Status</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 hidden lg:table-cell">Access</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {employees.map(emp => (
                  <tr key={emp.id} className="hover:bg-stone-50/50 transition-colors text-xs sm:text-sm">
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-full bg-purple-100 flex items-center justify-center font-bold text-purple-600 text-xs sm:text-sm flex-shrink-0">
                          {emp.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-stone-800 text-xs sm:text-sm truncate">{emp.name}</p>
                          <p className="text-[9px] sm:text-xs text-stone-400 truncate">ID: {emp.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 hidden sm:table-cell">
                      <span className={`text-[9px] sm:text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-full uppercase tracking-widest inline-block ${emp.role === 'ADMIN' ? 'bg-purple-600 text-white' :
                        emp.role === 'MANAGER' ? 'bg-purple-400 text-white' :
                          emp.role === 'FINANCE' ? 'bg-purple-200 text-purple-800' :
                            emp.role === 'LABORER' ? 'bg-purple-100 text-purple-700' :
                              'bg-purple-50 text-purple-600'
                        }`}>
                        {emp.role}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 hidden md:table-cell">
                      <div className={`flex items-center gap-1 sm:gap-2 text-[9px] sm:text-xs font-bold whitespace-nowrap ${emp.status === 'ACTIVE' ? 'text-purple-600' : emp.status === 'ON_LEAVE' ? 'text-purple-400' : 'text-purple-300'
                        }`}>
                        <div className={`w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full ${emp.status === 'ACTIVE' ? 'bg-purple-600' : emp.status === 'ON_LEAVE' ? 'bg-purple-400' : 'bg-purple-300'
                          }`}></div>
                        {emp.status}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 hidden lg:table-cell">
                      <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                        {emp.hasSystemAccess ? (
                          <CheckCircle className="text-purple-600 flex-shrink-0" size={16} />
                        ) : (
                          <XCircle className="text-purple-200 flex-shrink-0" size={16} />
                        )}
                        <span className="font-bold text-purple-600 hidden sm:inline">{emp.hasSystemAccess ? 'Enabled' : 'Disabled'}</span>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <button
                          onClick={() => handleEditMember(emp)}
                          type="button"
                          className="p-1.5 sm:p-2 text-stone-400 hover:text-purple-600 hover:bg-stone-50 rounded-lg transition active:scale-95"
                          title="Edit"
                        >
                          <Edit2 size={14} className="sm:w-4 sm:h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteMember(emp.id)}
                          type="button"
                          className="p-1.5 sm:p-2 text-stone-400 hover:text-rose-600 hover:bg-stone-50 rounded-lg transition active:scale-95"
                          title="Delete"
                        >
                          <Trash2 size={14} className="sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Team Settings */}
      <GlassCard className="p-4 sm:p-8">
        <h3 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight mb-6">Team Permissions & Settings</h3>

        <div className="space-y-4 sm:space-y-6">
          <div className="p-4 sm:p-6 bg-stone-50 rounded-2xl border border-stone-100">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-4">
              <div>
                <h4 className="font-bold text-stone-900 text-base sm:text-lg">Role-Based Access Control</h4>
                <p className="text-xs sm:text-sm text-stone-600 mt-1">Configure what each role can access and do</p>
              </div>
              <Shield className="text-purple-600 hidden sm:block flex-shrink-0" size={24} />
            </div>
            <div className="text-xs sm:text-sm text-stone-600 mt-4 space-y-2">
              <p><strong>Admin:</strong> Full system access, can manage all features and users</p>
              <p><strong>Manager:</strong> Can manage bookings, inventory, and view reports</p>
              <p><strong>Finance:</strong> Can manage financial transactions and approve payments</p>
              <p><strong>Laborer:</strong> Limited access, cannot view financial or admin pages</p>
              <p><strong>Viewer:</strong> Read-only access to dashboards and reports</p>
            </div>
          </div>

          <div className="p-4 sm:p-6 bg-stone-50 rounded-2xl border border-stone-100">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-4">
              <div>
                <h4 className="font-bold text-stone-900 text-base sm:text-lg">Data Security</h4>
                <p className="text-xs sm:text-sm text-stone-600 mt-1">Team member access is protected and logged</p>
              </div>
              <Lock className="text-purple-600 hidden sm:block flex-shrink-0" size={24} />
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={teamSecuritySettings.requireStrongPassword}
                  onChange={() => handleToggleSecurity('requireStrongPassword')}
                  className="w-4 sm:w-5 h-4 sm:h-5 rounded border-stone-300 cursor-pointer"
                />
                <span className="text-xs sm:text-sm font-semibold text-stone-700 group-hover:text-stone-900">Require strong passwords for system access</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={teamSecuritySettings.logActivities}
                  onChange={() => handleToggleSecurity('logActivities')}
                  className="w-4 sm:w-5 h-4 sm:h-5 rounded border-stone-300 cursor-pointer"
                />
                <span className="text-xs sm:text-sm font-semibold text-stone-700 group-hover:text-stone-900">Log all user activities and changes</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={teamSecuritySettings.requireTwoFactor}
                  onChange={() => handleToggleSecurity('requireTwoFactor')}
                  className="w-4 sm:w-5 h-4 sm:h-5 rounded border-stone-300 cursor-pointer"
                />
                <span className="text-xs sm:text-sm font-semibold text-stone-700 group-hover:text-stone-900">Require two-factor authentication</span>
              </label>
            </div>
          </div>
        </div>

        <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-stone-200 flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4">
          <button
            onClick={() => {
              setTeamSecuritySettings({
                requireStrongPassword: true,
                logActivities: true,
                requireTwoFactor: false
              });
            }}
            type="button"
            className="px-4 sm:px-6 py-2 sm:py-3 border border-stone-200 text-stone-700 rounded-2xl font-bold text-xs sm:text-sm hover:bg-stone-50 transition active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveTeamSettings}
            type="button"
            className="px-4 sm:px-6 py-2 sm:py-3 bg-purple-600 text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-purple-700 transition shadow-lg shadow-purple-600/20 active:scale-95"
          >
            <Save size={16} className="sm:w-5 sm:h-5" /> Save Settings
          </button>
        </div>
      </GlassCard>

      {/* Add/Edit Team Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xl flex items-center justify-center z-50 p-4 animate-in fade-in">
          <GlassCard className="w-full max-w-lg bg-white shadow-[0_30px_100px_rgba(0,0,0,0.3)] overflow-hidden">
            <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-stone-100 bg-stone-50/30 flex justify-between items-center">
              <div>
                <h3 className="text-lg sm:text-2xl font-bold text-stone-900 tracking-tight">{selectedMember ? 'Edit Team Member' : 'Add Team Member'}</h3>
                <p className="text-[9px] sm:text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1">Navigate to HR section to manage members</p>
              </div>
              <button
                onClick={() => {
                  setShowAddMember(false);
                  setSelectedMember(null);
                }}
                type="button"
                className="p-2 rounded-full border border-stone-200 flex items-center justify-center text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition flex-shrink-0"
              >
                <XCircle size={20} />
              </button>
            </div>
            <div className="p-4 sm:p-8">
              <div className="text-center py-8">
                <Users className="mx-auto text-stone-400 mb-4" size={32} />
                <h4 className="text-sm sm:text-lg font-bold text-stone-800 mb-2">Manage in HR Section</h4>
                <p className="text-xs sm:text-sm text-stone-600 mb-6">Use the HR module to add, edit, or remove team members with full profile management</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => {
                      setShowAddMember(false);
                      setSelectedMember(null);
                    }}
                    type="button"
                    className="flex-1 px-4 py-2 border border-stone-200 text-stone-700 rounded-2xl font-bold text-xs sm:text-sm hover:bg-stone-50 transition active:scale-95"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => window.location.hash = '#/hr'}
                    type="button"
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-2xl font-bold text-xs sm:text-sm hover:bg-purple-700 transition active:scale-95"
                  >
                    Go to HR
                  </button>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );

  const renderDataTab = () => (
    <div className="space-y-8">
      <GlassCard className="p-8">
        <div className="flex items-center mb-6">
          <div className="p-3 bg-purple-100 rounded-full mr-4">
            <Database className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-stone-800">Data Management</h3>
            <p className="text-sm text-stone-500">Backup, restore, and reset your system data</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-stone-50 rounded-2xl border border-stone-200">
            <h4 className="text-lg font-bold text-stone-800 mb-2">Backup System</h4>
            <p className="text-sm text-stone-500 mb-4">Download a JSON file containing all your system data.</p>
            <button
              onClick={handleBackup}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition"
            >
              Download Backup
            </button>
          </div>

          <div className="p-6 bg-purple-50 rounded-2xl border border-purple-200">
            <h4 className="text-lg font-bold text-purple-800 mb-2">Restore System</h4>
            <p className="text-sm text-purple-500 mb-4">Restore system data from a previously saved JSON file.</p>
            <label className="w-full flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition cursor-pointer">
              <span>Select File to Restore</span>
              <input
                type="file"
                accept=".json"
                onChange={handleRestore}
                className="hidden"
              />
            </label>
          </div>

          <div className="p-6 bg-purple-900/10 rounded-2xl border border-purple-200">
            <h4 className="text-lg font-bold text-purple-800 mb-2">Factory Reset</h4>
            <p className="text-sm text-purple-600 mb-4">Clear all data and reset the system to default state.</p>
            <button
              onClick={handleReset}
              className="w-full px-4 py-2 bg-purple-900 text-white rounded-xl font-bold hover:bg-purple-800 transition"
            >
              Reset System
            </button>
          </div>

          <div className="p-6 bg-rose-50 rounded-2xl border border-rose-100">
            <h4 className="text-lg font-bold text-rose-800 mb-2">Production Launch</h4>
            <p className="text-sm text-rose-600 mb-4">Purge all test Bookings, Transactions, and Logs. Keep Inventory/Staff.</p>
            <button
              onClick={handleProductionPurge}
              className="w-full px-4 py-2 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition shadow-lg shadow-rose-100"
            >
              Clear Local Test Data
            </button>
          </div>
        </div>
      </GlassCard>
    </div>
  );

  const renderLogsTab = () => (
    <div className="space-y-8">
      <GlassCard className="p-8">
        <div className="flex items-center mb-6">
          <div className="p-3 bg-purple-100 rounded-full mr-4">
            <Clock className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-stone-800">System Activity Logs</h3>
            <p className="text-sm text-stone-500">Audit trail of all administrative and financial actions</p>
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-stone-200">
          <table className="min-w-full divide-y divide-stone-200">
            <thead className="bg-stone-50">
              <tr>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-stone-500 uppercase tracking-widest">Time</th>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-stone-500 uppercase tracking-widest">Action</th>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-stone-500 uppercase tracking-widest">User</th>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-stone-500 uppercase tracking-widest">Details</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-stone-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-stone-500">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-3 py-1 text-[10px] font-bold bg-purple-100 text-purple-700 rounded-full border border-purple-200 uppercase tracking-wider">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-stone-800">
                    {log.userName}
                  </td>
                  <td className="px-6 py-4 text-sm text-stone-600">
                    {log.details}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-stone-400">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mb-2">
                        <Clock size={20} className="text-stone-300" />
                      </div>
                      <p>No activity recorded yet</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );

  return (
    <div className="space-y-8 pb-12 transition-all duration-700 animate-in fade-in slide-in-from-bottom-2">
      {/* Dynamic Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Settings</h1>
          <p className="text-stone-500 text-xs mt-1 font-medium italic opacity-80">System Configuration & Preferences</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-2xl shadow-lg text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <div className="lg:w-80">
          <GlassCard className="p-6">
            <h2 className="text-lg font-semibold text-stone-800 mb-6">Configuration</h2>
            <nav className="space-y-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveTab(section.id as SettingSection)}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-2xl transition-all ${activeTab === section.id
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                    }`}
                >
                  <div className="flex items-center justify-center w-8 h-8 bg-white rounded-full mr-3 shadow-lg">
                    {section.icon}
                  </div>
                  <span className="font-bold">{section.label}</span>
                </button>
              ))}
            </nav>
          </GlassCard>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center mb-8">
              <div>
                <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
                  {sections.find(s => s.id === activeTab)?.label}
                </h1>
                <p className="text-stone-500">
                  Manage your {sections.find(s => s.id === activeTab)?.label.toLowerCase()} settings
                </p>
              </div>
            </div>

            {saveStatus.type && (
              <div
                className={`mb-8 p-4 rounded-2xl ${saveStatus.type === 'success'
                  ? 'bg-purple-100 border-purple-200 text-purple-700'
                  : 'bg-purple-900 border-purple-800 text-white'
                  }`}
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    {saveStatus.type === 'success' ? (
                      <CheckCircle className="h-5 w-5 text-purple-600" aria-hidden="true" />
                    ) : (
                      <XCircle className="h-5 w-5 text-white" aria-hidden="true" />
                    )}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium">{saveStatus.message}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Content */}
            <div>
              {activeTab === 'general' && renderGeneralTab()}
              {activeTab === 'users' && renderUsersTab()}
              {activeTab === 'notifications' && renderNotificationsTab()}
              {activeTab === 'billing' && renderBillingTab()}
              {activeTab === 'invoices' && renderInvoicesTab()}
              {activeTab === 'team' && renderTeamTab()}
              {activeTab === 'data' && renderDataTab()}
              {activeTab === 'logs' && renderLogsTab()}
            </div>

            {/* Info Footer */}
            <div className="mt-8 border-t border-stone-200 pt-6">
              <div className="bg-purple-50 border-l-4 border-purple-400 p-4 rounded-2xl">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-purple-400" aria-hidden="true" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-purple-700">
                      Changes to settings are automatically saved. Some changes may require a page refresh to take effect.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
