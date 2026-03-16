import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Fingerprint } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function SplashScreen() {
  const navigate = useNavigate();
  const { currentUser, isAuthReady } = useAuth();

  useEffect(() => {
    if (isAuthReady) {
      const timer = setTimeout(() => {
        if (currentUser) {
          navigate('/dashboard');
        } else {
          navigate('/login');
        }
      }, 800); // Reduced from 3000 to 800ms
      return () => clearTimeout(timer);
    }
  }, [navigate, currentUser, isAuthReady]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-black text-white">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex flex-col items-center"
      >
        <div className="p-6 bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 mb-8">
          <Fingerprint size={80} className="text-emerald-400" />
        </div>
        <motion.h1 
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-5xl font-bold tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400"
        >
          Fea Attendance
        </motion.h1>
        <motion.p 
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-lg text-gray-400 tracking-widest uppercase font-medium"
        >
          AI-Powered Smart Check-in
        </motion.p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="absolute bottom-20 flex flex-col items-center"
      >
        <div className="w-48 h-1 bg-white/20 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            className="h-full bg-emerald-400"
          />
        </div>
        <p className="mt-4 text-sm text-gray-500 font-mono">Initializing AI Core...</p>
      </motion.div>
    </div>
  );
}
