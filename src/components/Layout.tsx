import React from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { motion } from 'framer-motion';
import { LayoutDashboard, CalendarCheck, FileText, Settings, LogOut, Fingerprint, Users, ClipboardList } from 'lucide-react';

export default function Layout() {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/attendance', icon: CalendarCheck, label: 'My Attendance' },
    ...(userData?.role === 'admin' || userData?.role === 'teacher' ? [
      { path: '/manage-attendance', icon: ClipboardList, label: 'Manage Attendance' }
    ] : []),
    { path: '/settings', icon: Settings, label: 'Settings' },
    ...(userData?.role === 'admin' ? [
      { path: '/admin/users', icon: Users, label: 'Manage Users' },
      { path: '/admin/reports', icon: FileText, label: 'Attendance History' },
      { path: '/admin/settings', icon: Settings, label: 'Admin Settings' }
    ] : [])
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-emerald-500/20 rounded-full blur-[128px] pointer-events-none"></div>
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-cyan-500/20 rounded-full blur-[128px] pointer-events-none"></div>
      
      {/* Sidebar */}
      <motion.aside 
        initial={{ x: -250 }}
        animate={{ x: 0 }}
        className="w-64 bg-zinc-900/50 backdrop-blur-xl border-r border-white/10 flex flex-col z-20"
      >
        <div className="p-6 flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <Fingerprint className="text-emerald-400" size={24} />
          </div>
          <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
            Fea
          </span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10 overflow-hidden">
              {userData?.photoURL ? (
                <img src={userData.photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-zinc-400">
                  {userData?.displayName ? userData.displayName.charAt(0).toUpperCase() : 'U'}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{userData?.displayName}</p>
              <p className="text-xs text-zinc-500 capitalize">{userData?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
          >
            <LogOut size={20} />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
