import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { safeFormat } from '../utils/dateUtils';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export default function MyAttendance() {
  const { userData } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userData) {
      fetchRecords();
    }
  }, [userData]);

  const fetchRecords = async () => {
    try {
      const q = query(
        collection(db, 'attendance'),
        where('userId', '==', userData?.uid)
      );
      const snapshot = await getDocs(q);
      const fetchedRecords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort locally by date descending
      fetchedRecords.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecords(fetchedRecords);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'attendance');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div></div>;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-bold tracking-tight mb-2">My Attendance</h1>
        <p className="text-zinc-400">View your attendance history and performance.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex items-center gap-4 shadow-xl"
        >
          <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-2xl">
            <CheckCircle2 size={32} />
          </div>
          <div>
            <p className="text-sm text-zinc-400 font-medium">Total Present</p>
            <p className="text-3xl font-bold">{records.filter(r => r.status === 'present').length}</p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex items-center gap-4 shadow-xl"
        >
          <div className="p-4 bg-amber-500/10 text-amber-400 rounded-2xl">
            <AlertCircle size={32} />
          </div>
          <div>
            <p className="text-sm text-zinc-400 font-medium">Total Late</p>
            <p className="text-3xl font-bold">{records.filter(r => r.status === 'late').length}</p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex items-center gap-4 shadow-xl"
        >
          <div className="p-4 bg-red-500/10 text-red-400 rounded-2xl">
            <XCircle size={32} />
          </div>
          <div>
            <p className="text-sm text-zinc-400 font-medium">Total Absent</p>
            <p className="text-3xl font-bold">{records.filter(r => r.status === 'absent').length}</p>
          </div>
        </motion.div>
      </div>

      <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Calendar className="text-emerald-400" size={24} />
            Attendance History
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-950 text-zinc-400 text-sm uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Check In</th>
                <th className="px-6 py-4 font-medium">Check Out</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-medium text-zinc-300">
                    {safeFormat(record.date, 'MMM dd, yyyy')}
                  </td>
                  <td className="px-6 py-4 text-zinc-400">
                    {safeFormat(record.checkInTime, 'hh:mm a', '-')}
                  </td>
                  <td className="px-6 py-4 text-zinc-400">
                    {safeFormat(record.checkOutTime, 'hh:mm a', '-')}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${
                      record.status === 'present' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' :
                      record.status === 'late' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20' :
                      record.status === 'absent' ? 'bg-red-500/20 text-red-400 border border-red-500/20' :
                      'bg-blue-500/20 text-blue-400 border border-blue-500/20'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-zinc-400">
                    {record.location ? (
                      <div className="flex items-center gap-1">
                        <MapPin size={14} className="text-emerald-400" />
                        <span className="text-sm">Verified</span>
                      </div>
                    ) : '-'}
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                    <p className="text-lg mb-2">No attendance records found.</p>
                    {userData?.role === 'admin' && (
                      <p className="text-sm text-zinc-400 max-w-md mx-auto">
                        As an admin, your attendance is not tracked by default. To test this feature, you can change your role to 'Student' in the Manage Users page.
                      </p>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
