import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import SplashScreen from './pages/SplashScreen';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import MyAttendance from './pages/MyAttendance';
import AdminUsers from './pages/AdminUsers';
import AdminReports from './pages/AdminReports';
import AdminSettings from './pages/AdminSettings';
import ManageAttendance from './pages/ManageAttendance';
import Settings from './pages/Settings';
import PinLock from './components/PinLock';

const ProtectedRoute = ({ children, requireAdmin = false, requireTeacher = false }: { children: React.ReactNode, requireAdmin?: boolean, requireTeacher?: boolean }) => {
  const { currentUser, userData, isAuthReady, isPinUnlocked } = useAuth();

  if (!isAuthReady) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div></div>;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!isPinUnlocked) {
    return <PinLock />;
  }

  if (requireAdmin && userData?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireTeacher && userData?.role !== 'admin' && userData?.role !== 'teacher') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<SplashScreen />} />
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="attendance" element={<MyAttendance />} />
            <Route path="manage-attendance" element={<ProtectedRoute requireTeacher><ManageAttendance /></ProtectedRoute>} />
            <Route path="settings" element={<Settings />} />
            
            {/* Admin Routes */}
            <Route path="admin/users" element={<ProtectedRoute requireAdmin><AdminUsers /></ProtectedRoute>} />
            <Route path="admin/reports" element={<ProtectedRoute requireAdmin><AdminReports /></ProtectedRoute>} />
            <Route path="admin/settings" element={<ProtectedRoute requireAdmin><AdminSettings /></ProtectedRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
