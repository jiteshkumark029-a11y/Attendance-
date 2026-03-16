import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Save, Settings as SettingsIcon, Palette, Clock, Shield } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    themeColor: 'emerald',
    logoUrl: '',
    workHoursStart: '09:00',
    workHoursEnd: '17:00'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const docRef = doc(db, 'settings', 'global');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSettings(docSnap.data() as any);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'settings/global');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'global'), settings);
      alert('Settings saved successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/global');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div></div>;

  return (
    <div className="space-y-8 max-w-4xl">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">App Settings</h1>
          <p className="text-zinc-400">Configure global application preferences.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
        >
          <Save size={20} />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </header>

      <div className="grid gap-6">
        {/* Appearance */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl"
        >
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Palette className="text-emerald-400" size={24} />
            Appearance
          </h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Theme Color</label>
              <select 
                value={settings.themeColor}
                onChange={(e) => setSettings({...settings, themeColor: e.target.value})}
                className="w-full bg-zinc-950 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="emerald">Emerald (Default)</option>
                <option value="blue">Blue</option>
                <option value="purple">Purple</option>
                <option value="rose">Rose</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Logo URL</label>
              <input 
                type="text" 
                value={settings.logoUrl}
                onChange={(e) => setSettings({...settings, logoUrl: e.target.value})}
                placeholder="https://example.com/logo.png"
                className="w-full bg-zinc-950 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </motion.div>

        {/* Attendance Rules */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl"
        >
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Clock className="text-emerald-400" size={24} />
            Attendance Rules
          </h2>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Work Hours Start</label>
              <input 
                type="time" 
                value={settings.workHoursStart}
                onChange={(e) => setSettings({...settings, workHoursStart: e.target.value})}
                className="w-full bg-zinc-950 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Work Hours End</label>
              <input 
                type="time" 
                value={settings.workHoursEnd}
                onChange={(e) => setSettings({...settings, workHoursEnd: e.target.value})}
                className="w-full bg-zinc-950 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
