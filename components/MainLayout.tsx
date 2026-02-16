import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  CalendarDays,
  Users,
  Wallet,
  LogOut,
  Menu,
  X,
  Briefcase,
  BarChart2,
  Settings,
  AlertCircle,
  Plus,
  PlusCircle,
  ListChecks,
  Zap,
  ChevronRight,
  ShieldCheck,
  ZapOff,
  Crown,
  UserPlus,
  CreditCard,
  Calendar
} from 'lucide-react';
import { AuthContext } from '../App';
import { UserRole } from '../types';
import { getBookings, getItems, isBookingOverdue } from '../services/db';

interface LayoutProps {
  children?: React.ReactNode;
}

export const MainLayout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = React.useContext(AuthContext);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.FINANCE, UserRole.CASHIER, UserRole.VIEWER, UserRole.SALES] },
    { to: '/bookings', icon: CalendarDays, label: 'Bookings', roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.FINANCE, UserRole.SALES] },
    { to: '/inventory', icon: Package, label: 'Inventory', roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.FINANCE, UserRole.SALES] },
    { to: '/customers', icon: Users, label: 'Customers', roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.FINANCE, UserRole.SALES] },
    { to: '/reports', icon: BarChart2, label: 'Reports', roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.FINANCE] },
    { to: '/finance', icon: Wallet, label: 'Finance', roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.FINANCE] },
    { to: '/hr', icon: Briefcase, label: 'HR Management', roles: [UserRole.ADMIN, UserRole.MANAGER] },
    { to: '/settings', icon: Settings, label: 'Settings', roles: [UserRole.ADMIN] },
  ];

  const canAccess = (roles: UserRole[]) => user && roles.includes(user.role);

  const QuickAction = ({ icon: Icon, label, onClick, color }: any) => (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all active:scale-95 group w-full"
    >
      <div className={`p-2 rounded-lg ${color} bg-opacity-20 transition-colors group-hover:scale-110 duration-300`}>
        <Icon size={16} className={color.replace('bg-', 'text-')} />
      </div>
      <span className="text-[9px] font-bold text-purple-200 group-hover:text-white transition-colors uppercase tracking-tight line-clamp-1">{label}</span>
    </button>
  );

  // Offline Detection
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="flex h-screen bg-[#F8F9FA] overflow-hidden font-['Montserrat',sans-serif]">
      {/* Offline Warning Banner */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-rose-600 text-white text-[10px] font-bold uppercase tracking-widest text-center py-1 animate-in slide-in-from-top-full flex items-center justify-center gap-2">
          <ZapOff size={12} />
          <span>System Offline • Changes save locally but external assets may fail</span>
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-purple-900 text-white transform transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar Interior: Glass Gradient */}
        <div className="h-full flex flex-col bg-gradient-to-b from-purple-900 to-black relative">

          {/* Logo Section */}
          <div className="flex items-center justify-between px-8 py-10">
            <div className="flex items-center gap-3 transition-all duration-300">
              <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg shadow-purple-500/20 shrink-0 p-1.5">
                <img src="/images/logo.png" alt="Nagor Rentals" className="w-full h-full object-contain" />
              </div>
              <div className="animate-in fade-in slide-in-from-left-2">
                <h1 className="text-base font-bold text-white tracking-tighter leading-none">NAGOR</h1>
                <p className="text-[11px] font-bold text-purple-300 tracking-[0.2em] mt-1">RENTALS</p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 hover:bg-white/10 rounded-xl transition">
              <X size={20} />
            </button>
          </div>
          {/* Nav Section */}
          <div className="flex-1 px-4 overflow-y-auto no-scrollbar space-y-10 py-4">


            {/* Navigation Groups */}
            <div className="space-y-4">
              <div className="px-6 flex items-center justify-between">
                <p className="text-[10px] font-bold text-purple-400 uppercase tracking-[0.2em] opacity-80">Operations Hub</p>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-purple-500/20 to-transparent ml-4" />
              </div>
              <div className="space-y-2">
                {navItems.map((item) => (
                  canAccess(item.roles) && (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) =>
                        `group flex items-center px-6 py-4 text-sm font-bold rounded-[1.25rem] transition-all duration-500 relative overflow-hidden backdrop-blur-sm ${isActive
                          ? 'bg-white/10 text-white shadow-[0_10px_30px_rgba(0,0,0,0.2)] border border-white/20'
                          : 'text-purple-200/50 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5'
                        }`
                      }
                    >
                      {/* Active Background Glow */}
                      {location.pathname === item.to && (
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-transparent animate-pulse" />
                      )}

                      <item.icon className={`mr-4 h-5 w-5 transition-all duration-700 ${location.pathname === item.to ? 'text-white scale-110 drop-shadow-[0_0_10px_rgba(147,51,234,0.8)]' : 'text-purple-300/40 group-hover:text-purple-300 group-hover:scale-110'}`} />
                      <span className="relative z-10 transition-transform duration-500 group-hover:translate-x-1">{item.label}</span>

                      {location.pathname === item.to && (
                        <div className="absolute right-6 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_15px_#fff] animate-pulse"></div>
                      )}
                    </NavLink>
                  )
                ))}
              </div>
            </div>

          </div>

          {/* User Profile Area */}
          <div className="p-6 mt-auto">
            <div className="p-4 bg-white/5 rounded-[2rem] border border-white/5 hover:bg-white/10 transition flex items-center gap-4 group">
              <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center font-bold text-white shadow-xl group-hover:bg-purple-500 transition-colors">
                {user?.name.charAt(0)}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-bold text-white truncate">{user?.name}</p>
                <p className="text-[11px] font-bold uppercase tracking-widest text-purple-300">{user?.role}</p>
              </div>
              <button onClick={logout} className="p-2 text-purple-300/50 hover:text-rose-500 transition group-hover:rotate-12 duration-500">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Premium Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-stone-100 flex items-center justify-between px-8 z-20">
          <div className="flex items-center gap-6">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-3 bg-stone-50 hover:bg-stone-100 rounded-2xl text-stone-600 transition">
              <Menu size={22} />
            </button>
            <div className="hidden sm:block">
              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-0.5">Tactical Access</p>
              <h2 className="text-base font-bold text-stone-800 tracking-tight">
                {navItems.find(i => i.to === location.pathname)?.label || 'Nagor Core'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-stone-50 rounded-xl border border-stone-100 hidden md:flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-bold text-stone-500 uppercase tracking-widest">
                {new Date().toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>
            <div
              onClick={() => navigate('/settings')}
              className="w-10 h-10 rounded-2xl border border-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-800 cursor-pointer transition"
            >
              <Settings size={20} />
            </div>
          </div>
        </header>

        {/* Scrolling Workspace */}
        <main className="flex-1 overflow-y-auto p-8 no-scrollbar bg-[#F8F9FA]/50">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
