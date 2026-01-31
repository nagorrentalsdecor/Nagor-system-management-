import React, { useState } from 'react';
import { AuthContext } from '../App';
import { authenticateUser } from '../services/db';
import { UserRole } from '../types';
import { ChangePasswordModal } from './ChangePasswordModal';
import {
  Eye,
  EyeOff,
  Lock,
  User,
  AlertCircle,
  CheckCircle,
  Loader,
  LogIn,
  Building2,
  Zap,
  Gem
} from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = React.useContext(AuthContext);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);
  const [changePasswordData, setChangePasswordData] = useState<{
    employeeId: string;
    employeeName: string;
    tempPassword: string;
  } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Authenticate user with username and password
      const employee = await authenticateUser(username, password);

      if (!employee) {
        setError('Invalid username or password. Please try again.');
        setLoading(false);
        return;
      }

      // Check if account is active
      if (employee.status !== 'ACTIVE') {
        setError(`Account is ${employee.status}. Contact administrator.`);
        setLoading(false);
        return;
      }

      // Check if user has system access
      if (!employee.hasSystemAccess) {
        setError('Access denied. You do not have system access permissions.');
        setLoading(false);
        return;
      }

      // Check if first login - must change temporary password
      if (employee.isFirstLogin || employee.passwordChangeRequired) {
        setChangePasswordData({
          employeeId: employee.id,
          employeeName: employee.name,
          tempPassword: password
        });
        setRequiresPasswordChange(true);
        setLoading(false);
        return;
      }

      // Successful login (not first time)
      setSuccess('Login successful! Redirecting...');

      // Simulate network delay for better UX
      setTimeout(() => {
        // Store employee info in session storage for use throughout app
        sessionStorage.setItem('currentEmployee', JSON.stringify({
          id: employee.id,
          name: employee.name,
          role: employee.role,
          username: employee.username
        }));

        login(employee.role);
        setUsername('');
        setPassword('');
      }, 800);

    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChanged = () => {
    // After password is successfully changed, login the user
    setRequiresPasswordChange(false);
    setChangePasswordData(null);
    setSuccess('Password changed! Logging in...');

    setTimeout(async () => {
      if (changePasswordData) {
        const employee = await authenticateUser(username, password);
        if (employee) {
          sessionStorage.setItem('currentEmployee', JSON.stringify({
            id: employee.id,
            name: employee.name,
            role: employee.role,
            username: employee.username
          }));

          login(employee.role);
          setUsername('');
          setPassword('');
        }
      }
    }, 1000);
  };

  const handleDemoLogin = (role: UserRole) => {
    setUsername('');
    setPassword('');
    login(role);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-purple-950"
      style={{
        backgroundImage: 'url("/images/login-bg.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-purple-900/60 backdrop-blur-sm z-0"></div>

      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-500">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img src="/images/logo.png" alt="Nagor Rentals" className="w-64 h-auto object-contain drop-shadow-2xl animate-in fade-in zoom-in duration-700" />
          </div>
          <p className="text-lg text-purple-100 font-bold tracking-wide uppercase opacity-90">Rental & Decor Management</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/90 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white/50 p-8 mb-6">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-purple-900 text-white border border-purple-800 rounded-xl flex gap-3 animate-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
              <p className="text-sm font-bold">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-xl flex gap-3 animate-in slide-in-from-top-2">
              <CheckCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-bold text-purple-700">{success}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Username Field */}
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2 ml-1">Username</label>
              <div className="relative group">
                <User className="absolute left-4 top-3.5 w-5 h-5 text-stone-400 group-focus-within:text-purple-600 transition-colors pointer-events-none" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  disabled={loading}
                  className="w-full pl-12 pr-4 py-3.5 bg-stone-50 border-2 border-transparent focus:border-purple-500/50 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-0 focus:bg-white transition-all font-medium"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2 ml-1">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-3.5 w-5 h-5 text-stone-400 group-focus-within:text-purple-600 transition-colors pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={loading}
                  className="w-full pl-12 pr-12 py-3.5 bg-stone-50 border-2 border-transparent focus:border-purple-500/50 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-0 focus:bg-white transition-all font-bold tracking-wider"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  className="absolute right-4 top-3.5 text-stone-400 hover:text-stone-600 transition disabled:opacity-50 disabled:cursor-not-allowed outline-none"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full py-4 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-xl shadow-purple-200 flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  Sign In
                </>
              )}
            </button>
          </form>


        </div>

        {/* Info Footer */}
        <div className="text-center space-y-2">
          <p className="text-purple-200/60 text-xs font-medium">© 2026 Nagor Rentals Ltd. All rights reserved.</p>
          <div className="flex flex-col items-center justify-center gap-1 text-[10px] text-purple-300 opacity-60 hover:opacity-100 transition-opacity">
            <div className="flex gap-2">
              <span>System v2.0.0</span>
              <span>•</span>
              <span>Dev: Louis Kemenyo</span>
            </div>
            <div className="flex gap-2 font-mono">
              <span>054 171 8716</span>
              <span>•</span>
              <span>024 314 5384</span>
            </div>
          </div>
        </div>
      </div>



      {/* Password Change Modal (First Login) */}
      {
        requiresPasswordChange && changePasswordData && (
          <ChangePasswordModal
            employeeId={changePasswordData.employeeId}
            employeeName={changePasswordData.employeeName}
            tempPassword={changePasswordData.tempPassword}
            onPasswordChanged={handlePasswordChanged}
          />
        )
      }
    </div >
  );
};
