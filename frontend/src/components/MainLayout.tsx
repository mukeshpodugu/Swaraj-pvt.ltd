import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  Banknote,
  PiggyBank,
  HeartHandshake,
  BrainCircuit,
  FileSpreadsheet,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Sun,
  Moon,
  ShieldCheck,
  User as UserIcon
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'AGENT'] },
    { name: 'Customers CRM', path: '/customers', icon: Users, roles: ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'AGENT'] },
    { name: 'Loans & EMIs', path: '/loans', icon: Banknote, roles: ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'AGENT'] },
    { name: 'Chit Funds', path: '/chits', icon: PiggyBank, roles: ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'AGENT'] },
    { name: 'LIC Insurance', path: '/lic', icon: HeartHandshake, roles: ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'AGENT'] },
    { name: 'AI Credit Analytics', path: '/ai-predictions', icon: BrainCircuit, roles: ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'AGENT'] },
    { name: 'Report Center', path: '/reports', icon: FileSpreadsheet, roles: ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'AGENT'] },
    { name: 'System Settings', path: '/settings', icon: Settings, roles: ['SUPER_ADMIN', 'ADMIN'] }
  ];

  const filteredNavItems = navItems.filter(item => 
    user && item.roles.includes(user.role)
  );

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const getBreadcrumbs = () => {
    const path = location.pathname.substring(1);
    if (!path) return ['Swaraj FinancePro'];
    return ['Swaraj FinancePro', path.charAt(0).toUpperCase() + path.slice(1)];
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground transition-colors duration-300">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-[#0b192c] text-slate-300 w-64 transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 lg:static transition-transform duration-300 ease-in-out border-r border-slate-800`}>
        
        {/* Branding Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/20">
          <Link to="/dashboard" className="flex flex-col items-center gap-2">
            <img src="/logo.jpg" alt="Swaraj Private Limited Logo" className="h-14 rounded-lg object-contain bg-white p-0.5" />
            <div className="text-center">
              <h2 className="font-extrabold text-white text-xs tracking-tight uppercase">Swaraj Pvt. Ltd.</h2>
              <span className="text-[8px] text-slate-500 block tracking-widest uppercase">Finance Platform</span>
            </div>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <item.icon size={18} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Profile Card Bottom Section */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-xl mb-3">
            <div className="bg-slate-800 text-slate-300 p-2 rounded-full">
              <UserIcon size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-semibold text-white truncate">{user?.fullName}</h4>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">{user?.role}</span>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-xs font-semibold bg-slate-800/40 hover:bg-destructive hover:text-white transition-all duration-200"
          >
            <LogOut size={14} />
            Log Out Session
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Navbar */}
        <header className="sticky top-0 z-40 bg-card/85 backdrop-blur-md border-b border-border h-16 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden text-muted-foreground p-1 hover:bg-accent rounded-lg"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            
            {/* Breadcrumbs */}
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-muted-foreground">
              {getBreadcrumbs().map((b, i) => (
                <React.Fragment key={b}>
                  {i > 0 && <span className="text-muted-foreground/45">/</span>}
                  <span className={i === getBreadcrumbs().length - 1 ? 'text-foreground font-semibold' : ''}>{b}</span>
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Dark Mode Switcher */}
            <button
              onClick={toggleDarkMode}
              className="p-2 text-muted-foreground hover:bg-accent rounded-full transition-colors"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Notification triggers */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-muted-foreground hover:bg-accent rounded-full transition-colors relative"
              >
                <Bell size={18} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full"></span>
              </button>
              
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 bg-card border border-border shadow-xl rounded-xl p-4 z-50 text-sm">
                  <div className="flex justify-between items-center mb-3 pb-2 border-b border-border">
                    <h4 className="font-bold">System Alerts</h4>
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">2 New</span>
                  </div>
                  <div className="space-y-3">
                    <div className="p-2 hover:bg-accent/40 rounded-lg cursor-pointer">
                      <p className="font-semibold text-xs">LIC policy premium due</p>
                      <span className="text-[10px] text-muted-foreground">LIC-778899 premium due in 15 days.</span>
                    </div>
                    <div className="p-2 hover:bg-accent/40 rounded-lg cursor-pointer">
                      <p className="font-semibold text-xs text-destructive">Loan payment overdue alert</p>
                      <span className="text-[10px] text-muted-foreground">Installment #3 for customer Amit Patel is pending.</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User portal indicator badge */}
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-semibold">{user?.fullName}</span>
              <span className="text-[10px] text-muted-foreground uppercase">{user?.role}</span>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
