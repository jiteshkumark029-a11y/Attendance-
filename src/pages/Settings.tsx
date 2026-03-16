import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings as SettingsIcon, Save, Lock, User, ShieldCheck, ShieldAlert, KeyRound, Trash2, X } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export default function Settings() {
  const { userData, setUserData } = useAuth();
  
  // Profile State
  const [displayName, setDisplayName] = useState(userData?.displayName || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // PIN State
  const [pinMode, setPinMode] = useState<'none' | 'set' | 'change' | 'remove'>('none');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [pinSuccess, setPinSuccess] = useState('');
  const [pinError, setPinError] = useState('');

  const hasPin = !!userData?.pinCode;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) return;

    setProfileLoading(true);
    setProfileError('');
    setProfileSuccess('');

    try {
      await updateDoc(doc(db, 'users', userData.uid), { displayName });
      setUserData({ ...userData, displayName });
      setProfileSuccess('Profile updated successfully!');
    } catch (err: any) {
      setProfileError(err.message);
      try {
        handleFirestoreError(err, OperationType.UPDATE, `users/${userData.uid}`);
      } catch (e) {}
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePinAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) return;

    setPinLoading(true);
    setPinError('');
    setPinSuccess('');

    try {
      if (pinMode === 'change' || pinMode === 'remove') {
        if (currentPin !== userData.pinCode) {
          throw new Error('Current PIN is incorrect.');
        }
      }

      let updatedPin = userData.pinCode;

      if (pinMode === 'set' || pinMode === 'change') {
        if (newPin.length !== 4) throw new Error('New PIN must be exactly 4 digits.');
        if (newPin !== confirmPin) throw new Error('New PINs do not match.');
        updatedPin = newPin;
      } else if (pinMode === 'remove') {
        updatedPin = '';
      }

      await updateDoc(doc(db, 'users', userData.uid), { pinCode: updatedPin });
      setUserData({ ...userData, pinCode: updatedPin });
      
      if (updatedPin) {
        setPinSuccess(pinMode === 'set' ? 'PIN set successfully!' : 'PIN changed successfully!');
      } else {
        setPinSuccess('PIN removed successfully!');
      }
      
      // Reset form
      setPinMode('none');
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
    } catch (err: any) {
      setPinError(err.message);
    } finally {
      setPinLoading(false);
    }
  };

  const cancelPinAction = () => {
    setPinMode('none');
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setPinError('');
    setPinSuccess('');
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto pb-12">
      <header className="flex items-center gap-4">
        <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
          <SettingsIcon className="text-emerald-400" size={28} />
        </div>
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Settings</h1>
          <p className="text-zinc-400">Manage your profile and security preferences.</p>
        </div>
      </header>

      {/* Profile Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl"
      >
        <h3 className="text-xl font-semibold flex items-center gap-2 border-b border-white/10 pb-4 mb-6">
          <User size={20} className="text-emerald-400" />
          Profile Information
        </h3>

        {profileSuccess && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm">
            {profileSuccess}
          </div>
        )}
        {profileError && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {profileError}
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Display Name</label>
            <input 
              type="text" 
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-zinc-950 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              placeholder="Your Name"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Email Address</label>
            <input 
              type="email" 
              value={userData?.email || ''}
              disabled
              className="w-full bg-zinc-950/50 border border-white/5 rounded-xl py-3 px-4 text-zinc-500 cursor-not-allowed"
            />
            <p className="text-xs text-zinc-500 mt-2">Email address cannot be changed.</p>
          </div>

          <div className="pt-2">
            <button 
              type="submit" 
              disabled={profileLoading}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              <Save size={18} />
              {profileLoading ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </motion.div>

      {/* Security Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl"
      >
        <h3 className="text-xl font-semibold flex items-center gap-2 border-b border-white/10 pb-4 mb-6">
          <Lock size={20} className="text-emerald-400" />
          Security (App Lock)
        </h3>

        {pinSuccess && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm">
            {pinSuccess}
          </div>
        )}
        {pinError && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {pinError}
          </div>
        )}

        <div className="flex items-center justify-between p-4 bg-zinc-950 border border-white/5 rounded-2xl mb-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${hasPin ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>
              {hasPin ? <ShieldCheck size={24} /> : <ShieldAlert size={24} />}
            </div>
            <div>
              <p className="font-medium text-white">App Lock is {hasPin ? 'Enabled' : 'Disabled'}</p>
              <p className="text-sm text-zinc-500">
                {hasPin ? 'Your app is protected with a 4-digit PIN.' : 'Set a PIN to secure your app.'}
              </p>
            </div>
          </div>
        </div>

        {pinMode === 'none' ? (
          <div className="flex gap-3">
            {!hasPin ? (
              <button
                onClick={() => setPinMode('set')}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-3 px-6 rounded-xl transition-colors flex items-center gap-2"
              >
                <KeyRound size={18} />
                Set PIN
              </button>
            ) : (
              <>
                <button
                  onClick={() => setPinMode('change')}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3 px-6 rounded-xl transition-colors flex items-center gap-2 border border-white/10"
                >
                  <KeyRound size={18} />
                  Change PIN
                </button>
                <button
                  onClick={() => setPinMode('remove')}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium py-3 px-6 rounded-xl transition-colors flex items-center gap-2 border border-red-500/20"
                >
                  <Trash2 size={18} />
                  Remove PIN
                </button>
              </>
            )}
          </div>
        ) : (
          <form onSubmit={handlePinAction} className="space-y-4 bg-zinc-950/50 p-6 rounded-2xl border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-emerald-400">
                {pinMode === 'set' && 'Set New PIN'}
                {pinMode === 'change' && 'Change PIN'}
                {pinMode === 'remove' && 'Remove PIN'}
              </h4>
              <button 
                type="button" 
                onClick={cancelPinAction}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {(pinMode === 'change' || pinMode === 'remove') && (
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Current PIN</label>
                <input 
                  type="password" 
                  maxLength={4}
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-emerald-500 transition-all"
                  placeholder="Enter current 4-digit PIN"
                  required
                />
              </div>
            )}

            {(pinMode === 'set' || pinMode === 'change') && (
              <>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">New PIN</label>
                  <input 
                    type="password" 
                    maxLength={4}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-emerald-500 transition-all"
                    placeholder="Enter new 4-digit PIN"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Confirm New PIN</label>
                  <input 
                    type="password" 
                    maxLength={4}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-emerald-500 transition-all"
                    placeholder="Confirm new 4-digit PIN"
                    required
                  />
                </div>
              </>
            )}

            <div className="pt-4 flex gap-3">
              <button 
                type="button"
                onClick={cancelPinAction}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={pinLoading}
                className={`flex-1 py-3 text-white rounded-xl font-medium transition-colors disabled:opacity-50 ${
                  pinMode === 'remove' ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'
                }`}
              >
                {pinLoading ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
