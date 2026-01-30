import React, { useState } from 'react';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { saveEmployees, getEmployees } from '../services/db';

interface ChangePasswordProps {
  employeeId: string;
  employeeName: string;
  tempPassword: string;
  onPasswordChanged: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordProps> = ({
  employeeId,
  employeeName,
  tempPassword,
  onPasswordChanged
}) => {
  const [currentPassword, setCurrentPassword] = useState(tempPassword);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const validatePassword = (password: string): string | null => {
    if (password.length < 6) return 'Password must be at least 6 characters long';
    if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
    if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
    if (!/[!@#$%^&*]/.test(password)) return 'Password must contain at least one special character (!@#$%^&*)';
    return null;
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Validate current password
      if (currentPassword !== tempPassword) {
        setError('Current password is incorrect');
        setLoading(false);
        return;
      }

      // Validate new password
      const passwordError = validatePassword(newPassword);
      if (passwordError) {
        setError(passwordError);
        setLoading(false);
        return;
      }

      // Validate passwords match
      if (newPassword !== confirmPassword) {
        setError('New passwords do not match');
        setLoading(false);
        return;
      }

      // Validate not same as current
      if (newPassword === tempPassword) {
        setError('New password must be different from temporary password');
        setLoading(false);
        return;
      }

      // Update employee password
      const employees = getEmployees();
      const employee = employees.find(e => e.id === employeeId);

      if (!employee) {
        setError('Employee not found');
        setLoading(false);
        return;
      }

      // Update employee
      employee.password = newPassword;
      employee.isFirstLogin = false;
      employee.passwordChangeRequired = false;
      employee.passwordLastChanged = new Date().toISOString();

      // Save updated employees
      saveEmployees(employees);

      setSuccess('Password changed successfully! Proceeding to dashboard...');
      setTimeout(() => {
        onPasswordChanged();
      }, 1500);

    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-100 w-full max-w-md p-8">
        {/* Header */}
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-purple-100 rounded-full">
            <Lock className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-stone-900 text-center mb-1">
          Change Password
        </h1>
        <p className="text-stone-600 text-center mb-6">
          Welcome, <span className="font-bold">{employeeName}</span>! This is your first login. Please change your temporary password to a secure one.
        </p>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-rose-700">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-xl flex gap-3">
            <CheckCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-purple-700">{success}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleChangePassword} className="space-y-5">
          {/* Current Password (Temporary) */}
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2">
              Temporary Password (Given by Admin)
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 w-5 h-5 text-stone-400 pointer-events-none" />
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={loading}
                className="w-full pl-12 pr-12 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition disabled:opacity-50"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                disabled={loading}
                className="absolute right-4 top-3.5 text-stone-400 hover:text-stone-600 transition"
              >
                {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 w-5 h-5 text-stone-400 pointer-events-none" />
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Create a secure password"
                disabled={loading}
                className="w-full pl-12 pr-12 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition disabled:opacity-50"
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                disabled={loading}
                className="absolute right-4 top-3.5 text-stone-400 hover:text-stone-600 transition"
              >
                {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Password Requirements */}
            <div className="mt-3 p-3 bg-stone-50 rounded-lg">
              <p className="text-xs font-bold text-stone-700 mb-2">Password Requirements:</p>
              <ul className="text-xs text-stone-600 space-y-1">
                <li className={newPassword.length >= 6 ? 'text-purple-600' : ''}>
                  ✓ At least 6 characters
                </li>
                <li className={/[A-Z]/.test(newPassword) ? 'text-purple-600' : ''}>
                  ✓ At least one uppercase letter
                </li>
                <li className={/[0-9]/.test(newPassword) ? 'text-purple-600' : ''}>
                  ✓ At least one number
                </li>
                <li className={/[!@#$%^&*]/.test(newPassword) ? 'text-purple-600' : ''}>
                  ✓ At least one special character (!@#$%^&*)
                </li>
              </ul>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 w-5 h-5 text-stone-400 pointer-events-none" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                disabled={loading}
                className="w-full pl-12 pr-12 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition disabled:opacity-50"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={loading}
                className="absolute right-4 top-3.5 text-stone-400 hover:text-stone-600 transition"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Info Box */}
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
            <p className="text-xs text-purple-800">
              <span className="font-bold">Note:</span> You must change this temporary password before you can access the system. This is a security requirement.
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !newPassword || !confirmPassword}
            className="w-full py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Changing Password...' : 'Change Password & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
};
