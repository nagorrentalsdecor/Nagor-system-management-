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
      try {
        await initializeData();
        await seedDatabase();

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
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-100 space-y-4">
        <div className="bg-white/50 backdrop-blur-xl p-8 rounded-full shadow-2xl mb-4 animate-pulse">
          <img src="/logo-placeholder.png" className="w-16 h-16 opacity-50" alt="" />
        </div>
        <Loader2 className="w-12 h-12 text-purple-600 animate-spin" />
        <h2 className="text-xl font-bold text-stone-500 tracking-widest uppercase animate-pulse">Initializing System...</h2>
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