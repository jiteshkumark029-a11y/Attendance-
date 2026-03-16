import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';

export default function PinLock() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const { unlockPin, userData } = useAuth();

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (unlockPin(pin)) {
      setError('');
    } else {
      setError('Incorrect PIN. Please try again.');
      setPin('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl text-center"
      >
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
            <Lock className="text-emerald-400" size={40} />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold mb-2">App Locked</h2>
        <p className="text-zinc-400 mb-8">
          Welcome back, {userData?.displayName}. Please enter your PIN to continue.
        </p>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handlePinSubmit} className="space-y-6">
          <div>
            <input 
              type="password" 
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              className="w-full bg-zinc-950 border border-white/10 rounded-xl py-4 text-center text-2xl tracking-[1em] text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              placeholder="••••"
              required
              autoFocus
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-3 rounded-xl transition-colors"
          >
            Unlock
          </button>
        </form>
      </motion.div>
    </div>
  );
}
