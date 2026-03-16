import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Download, FileText, Filter } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { safeFormat } from '../utils/dateUtils';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export default function AdminReports() {
  const [records, setRecords] = useState<any[]>([]);
  const [users, setUsers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch users for mapping IDs to names
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersMap: Record<string, any> = {};
      usersSnapshot.docs.forEach(doc => {
        usersMap[doc.id] = doc.data();
      });
      setUsers(usersMap);

      // Fetch attendance records
      const q = query(collection(db, 'attendance'), orderBy('date', 'desc'));
      const snapshot = await getDocs(q);
      setRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'attendance');
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Attendance History Report', 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${format(new Date(), 'PPpp')}`, 14, 30);

    const tableColumn = ["Date", "Roll No", "Student Name", "Check In", "Status"];
    const tableRows: any[] = [];

    records.forEach(record => {
      const user = users[record.userId] || {};
      const recordData = [
        safeFormat(record.date, 'MMM dd, yyyy'),
        user.rollNumber || '-',
        user.displayName || 'Unknown User',
        safeFormat(record.checkInTime, 'hh:mm a'),
        record.status ? record.status.charAt(0).toUpperCase() + record.status.slice(1) : 'Unknown'
      ];
      tableRows.push(recordData);
    });

    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [16, 185, 129] } // Emerald 500
    });

    doc.save(`attendance_history_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div></div>;

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Attendance History</h1>
          <p className="text-zinc-400">View and download all attendance records.</p>
        </div>
        <button 
          onClick={exportPDF}
          className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/20"
        >
          <Download size={20} />
          Export PDF
        </button>
      </header>

      <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-950 text-zinc-400 text-sm uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Roll No</th>
                <th className="px-6 py-4 font-medium">Student Name</th>
                <th className="px-6 py-4 font-medium">Check In</th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {records.map((record) => {
                const user = users[record.userId] || {};
                return (
                  <tr key={record.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-medium text-zinc-300">{safeFormat(record.date, 'MMM dd, yyyy')}</td>
                    <td className="px-6 py-4 text-zinc-400">{user.rollNumber || '-'}</td>
                    <td className="px-6 py-4 text-zinc-200 font-medium">{user.displayName || 'Unknown User'}</td>
                    <td className="px-6 py-4 text-zinc-400">
                      {safeFormat(record.checkInTime, 'hh:mm a', '-')}
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
                  </tr>
                );
              })}
              {records.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                    No attendance records found.
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
