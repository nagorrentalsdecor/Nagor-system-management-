// Build timestamp: 2026-01-30 23:15
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { MainLayout } from './components/MainLayout';
import { Dashboard } from './components/Dashboard';
import { Inventory } from './components/Inventory';
import { Bookings } from './components/Bookings';
import { Customers } from './components/Customers';
import { Finance } from './components/Finance';
import { HR } from './components/HR';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
import { ToastContainer } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Login } from './components/Login';
import { NotFound } from './components/NotFound';
import { seedDatabase, getEmployees, initializeData } from './services/db';
import { UserRole } from './types';
import { Loader2 } from 'lucide-react';

// Auth Context and routes
export const AuthContext = React.createContext<{
  user: { name: string; role: UserRole } | null;
  login: (role: UserRole) => void;
  logout: () => void;
}>({
  user: null,
  login: () => { },
  logout: () => { },
});

const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  const { user } = React.useContext(AuthContext);
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const RoleBasedRoute = ({ children, allowedRoles }: { children?: React.ReactNode; allowedRoles: UserRole[] }) => {
  const { user } = React.useContext(AuthContext);
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md text-center border border-stone-200">
          <h1 className="text-2xl font-bold text-stone-800 mb-4">Access Denied</h1>
          <p className="text-stone-600 mb-6">You do not have permission to access this page. This area is restricted to: {allowedRoles.join(', ')}</p>
          <button
            onClick={() => window.location.href = '/#/'}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
};

export default function App() {
  console.log("BUILD_VER: 1.0.1 - MainLayout Fix");
  const [user, setUser] = useState<{ name: string; role: UserRole } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize mock DB & Supabase Cache
    const init = async () => {
      // Rescue timeout: If it takes more than 8 seconds, force the app to show the login
      const rescueTimer = setTimeout(() => {
        if (loading) {
          console.warn("Initialization taking too long, forcing load completion.");
          setLoading(false);
        }
      }, 8000);

      try {
        await initializeData();

        // Check for existing session
        const employeeData = sessionStorage.getItem('currentEmployee');
        if (employeeData) {
          try {
            const emp = JSON.parse(employeeData);
            setUser({ name: emp.name, role: emp.role });
          } catch (e) {
            sessionStorage.removeItem('currentEmployee');
          }
        }
      } catch (err) {
        console.error("Initialization Failed:", err);
      } finally {
        clearTimeout(rescueTimer);
        setLoading(false);
      }
    };
    init();
  }, []);

  const login = (role: UserRole) => {
    // Get employee name from session storage (set by Login component)
    const employeeData = sessionStorage.getItem('currentEmployee');
    const employeeName = employeeData ? JSON.parse(employeeData).name : 'Staff Member';
    setUser({ name: employeeName, role });
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('currentEmployee');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8f7f4] relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-100 rounded-full blur-[120px] opacity-50 animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-stone-200 rounded-full blur-[120px] opacity-50 animate-pulse" style={{ animationDelay: '1s' }} />

        <div className="relative z-10 flex flex-col items-center space-y-8">
          <div className="relative group">
            <div className="absolute inset-0 bg-purple-500 rounded-[2.5rem] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-700 animate-pulse" />
            <div className="bg-white/80 backdrop-blur-2xl p-10 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white/50 relative overflow-hidden">
              <img 
                src="/images/logo.png" 
                className="w-24 h-24 object-contain relative z-10 grayscale hover:grayscale-0 transition-all duration-700" 
                alt="Nagor Logo" 
                onError={(e) => {
                  // Fallback if logo is missing
                  e.currentTarget.src = 'https://ui-avatars.com/api/?name=Nagor&background=a855f7&color=fff&size=200';
                }}
              />
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-30" />
            </div>
          </div>

          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" />
            </div>
            
            <div className="text-center">
              <h2 className="text-[10px] font-black text-stone-400 uppercase tracking-[0.4em] mb-1">Nexus Security Protocol</h2>
              <p className="text-base font-bold text-stone-800 tracking-tight">Synchronizing System Data...</p>
            </div>
          </div>
        </div>

        {/* Footer Build Tag */}
        <div className="absolute bottom-8 text-[10px] font-bold text-stone-300 uppercase tracking-widest border border-stone-100 px-4 py-1.5 rounded-full backdrop-blur-sm">
          Build v1.0.1 • Production Stable
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <ErrorBoundary>
        <ToastContainer />
        <HashRouter>
          <Routes>
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />


            <Route path="/" element={
              <RoleBasedRoute allowedRoles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.FINANCE, UserRole.CASHIER, UserRole.VIEWER, UserRole.SALES]}>
                <MainLayout>
                  <Dashboard />
                </MainLayout>
              </RoleBasedRoute>
            } />

            <Route path="/inventory" element={
              <RoleBasedRoute allowedRoles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.FINANCE, UserRole.SALES]}>
                <MainLayout>
                  <Inventory />
                </MainLayout>
              </RoleBasedRoute>
            } />

            <Route path="/inventory/add" element={
              <RoleBasedRoute allowedRoles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.FINANCE, UserRole.SALES]}>
                <MainLayout>
                  <Inventory />
                </MainLayout>
              </RoleBasedRoute>
            } />

            <Route path="/bookings" element={
              <RoleBasedRoute allowedRoles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.FINANCE, UserRole.SALES]}>
                <MainLayout>
                  <Bookings />
                </MainLayout>
              </RoleBasedRoute>
            } />

            <Route path="/bookings/new" element={
              <RoleBasedRoute allowedRoles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.FINANCE, UserRole.SALES]}>
                <MainLayout>
                  <Bookings />
                </MainLayout>
              </RoleBasedRoute>
            } />

            <Route path="/customers" element={
              <RoleBasedRoute allowedRoles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.FINANCE, UserRole.SALES]}>
                <MainLayout>
                  <Customers />
                </MainLayout>
              </RoleBasedRoute>
            } />

            <Route path="/customers/add" element={
              <RoleBasedRoute allowedRoles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.FINANCE, UserRole.SALES]}>
                <MainLayout>
                  <Customers />
                </MainLayout>
              </RoleBasedRoute>
            } />

            <Route path="/finance" element={
              <RoleBasedRoute allowedRoles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.FINANCE]}>
                <MainLayout>
                  <Finance />
                </MainLayout>
              </RoleBasedRoute>
            } />

            <Route path="/finance/new" element={
              <RoleBasedRoute allowedRoles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.FINANCE]}>
                <MainLayout>
                  <Finance />
                </MainLayout>
              </RoleBasedRoute>
            } />

            <Route path="/hr" element={
              <RoleBasedRoute allowedRoles={[UserRole.ADMIN, UserRole.MANAGER]}>
                <MainLayout>
                  <HR />
                </MainLayout>
              </RoleBasedRoute>
            } />

            <Route path="/reports" element={
              <RoleBasedRoute allowedRoles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.FINANCE]}>
                <MainLayout>
                  <Reports />
                </MainLayout>
              </RoleBasedRoute>
            } />

            <Route path="/settings" element={
              <RoleBasedRoute allowedRoles={[UserRole.ADMIN]}>
                <MainLayout>
                  <Settings />
                </MainLayout>
              </RoleBasedRoute>
            } />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </HashRouter>
      </ErrorBoundary>
    </AuthContext.Provider>
  );
}