import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, setDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { UserCheck, Search, Calendar, CheckCircle2, XCircle, UserPlus, X, FileDown, Edit2, Save } from 'lucide-react';
import { format } from 'date-fns';
import { safeFormat } from '../utils/dateUtils';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ManageAttendance() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, any>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Add Student State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentRollNumber, setNewStudentRollNumber] = useState('');
  const [addingStudent, setAddingStudent] = useState(false);

  // Edit Student State
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editRollNumber, setEditRollNumber] = useState('');
  const [savingStudent, setSavingStudent] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all students
      const usersQuery = query(collection(db, 'users'), where('role', '==', 'student'));
      const usersSnapshot = await getDocs(usersQuery);
      const studentsList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      // Sort by roll number if available
      studentsList.sort((a, b) => {
        const rollA = a.rollNumber ? String(a.rollNumber) : '';
        const rollB = b.rollNumber ? String(b.rollNumber) : '';
        return rollA.localeCompare(rollB, undefined, { numeric: true });
      });
      setStudents(studentsList);

      // Fetch attendance for selected date
      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('date', '==', selectedDate)
      );
      const attendanceSnapshot = await getDocs(attendanceQuery);
      const records: Record<string, any> = {};
      attendanceSnapshot.docs.forEach(doc => {
        const data = doc.data();
        records[data.userId] = { id: doc.id, ...data };
      });
      setAttendanceRecords(records);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'users/attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName || !newStudentEmail) return;
    
    setAddingStudent(true);
    try {
      const studentId = `manual_${Date.now()}`;
      const newStudent = {
        uid: studentId,
        displayName: newStudentName,
        email: newStudentEmail,
        rollNumber: newStudentRollNumber,
        role: 'student',
        photoURL: '',
        createdAt: new Date().toISOString()
      };
      
      await setDoc(doc(db, 'users', studentId), newStudent);
      
      setStudents(prev => {
        const newList = [...prev, { id: studentId, ...newStudent }];
        return newList.sort((a, b) => {
          const rollA = a.rollNumber ? String(a.rollNumber) : '';
          const rollB = b.rollNumber ? String(b.rollNumber) : '';
          return rollA.localeCompare(rollB, undefined, { numeric: true });
        });
      });
      setShowAddModal(false);
      setNewStudentName('');
      setNewStudentEmail('');
      setNewStudentRollNumber('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'users');
    } finally {
      setAddingStudent(false);
    }
  };

  const openEditModal = (student: any) => {
    setEditingStudent(student);
    setEditName(student.displayName || '');
    setEditRollNumber(student.rollNumber || '');
  };

  const closeEditModal = () => {
    setEditingStudent(null);
    setEditName('');
    setEditRollNumber('');
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    setSavingStudent(true);
    try {
      const updateData = {
        displayName: editName,
        rollNumber: editRollNumber
      };
      
      await updateDoc(doc(db, 'users', editingStudent.id), updateData);
      
      setStudents(prev => {
        const newList = prev.map(s => s.id === editingStudent.id ? { ...s, ...updateData } : s);
        return newList.sort((a, b) => {
          const rollA = a.rollNumber ? String(a.rollNumber) : '';
          const rollB = b.rollNumber ? String(b.rollNumber) : '';
          return rollA.localeCompare(rollB, undefined, { numeric: true });
        });
      });
      closeEditModal();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${editingStudent.id}`);
    } finally {
      setSavingStudent(false);
    }
  };

  const markAttendance = async (studentId: string, status: 'present' | 'absent' | 'late') => {
    setProcessingId(studentId);
    try {
      const now = new Date();
      const recordData = {
        userId: studentId,
        date: selectedDate,
        checkInTime: now.toISOString(),
        status,
        location: { lat: 0, lng: 0 },
        faceVerified: false,
        qrVerified: false,
        markedByTeacher: true
      };

      const docRef = await addDoc(collection(db, 'attendance'), recordData);
      setAttendanceRecords(prev => ({
        ...prev,
        [studentId]: { id: docRef.id, ...recordData }
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'attendance');
    } finally {
      setProcessingId(null);
    }
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text(`Attendance Report - ${safeFormat(selectedDate, 'MMMM d, yyyy')}`, 14, 22);
    
    // Summary
    const presentCount = students.filter(s => attendanceRecords[s.id]?.status === 'present').length;
    const lateCount = students.filter(s => attendanceRecords[s.id]?.status === 'late').length;
    const absentCount = students.filter(s => attendanceRecords[s.id]?.status === 'absent').length;
    const notMarkedCount = students.length - (presentCount + lateCount + absentCount);

    doc.setFontSize(11);
    doc.text(`Total Students: ${students.length} | Present: ${presentCount} | Late: ${lateCount} | Absent: ${absentCount} | Not Marked: ${notMarkedCount}`, 14, 30);

    // Table Data
    const tableData = filteredStudents.map(student => {
      const record = attendanceRecords[student.id];
      const status = record && record.status ? record.status.charAt(0).toUpperCase() + record.status.slice(1) : 'Not Marked';
      const time = safeFormat(record?.checkInTime, 'hh:mm a', '-');
      return [student.rollNumber || '-', student.displayName, student.email, status, time];
    });

    autoTable(doc, {
      startY: 35,
      head: [['Roll No', 'Student Name', 'Email', 'Status', 'Time']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] }, // emerald-500
    });

    doc.save(`Attendance_Report_${selectedDate}.pdf`);
  };

  const filteredStudents = students.filter(student => 
    (student.displayName && String(student.displayName).toLowerCase().includes(searchTerm.toLowerCase())) ||
    (student.email && String(student.email).toLowerCase().includes(searchTerm.toLowerCase())) ||
    (student.rollNumber && String(student.rollNumber).toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8 relative">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Manage Attendance</h1>
          <p className="text-zinc-400">Add or update attendance for students.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <button 
            onClick={downloadPDF}
            className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2 border border-white/10"
          >
            <FileDown size={20} />
            <span className="hidden sm:inline">Download PDF</span>
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            <UserPlus size={20} />
            <span className="hidden sm:inline">Add Student</span>
          </button>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="pl-10 pr-4 py-3 bg-zinc-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
        </div>
      </header>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl p-6 shadow-2xl relative"
          >
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <UserPlus className="text-emerald-400" size={24} />
              Add New Student
            </h2>
            <form onSubmit={handleAddStudent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Full Name</label>
                <input 
                  type="text" 
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  placeholder="e.g. Rahul Kumar"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Roll Number</label>
                <input 
                  type="text" 
                  value={newStudentRollNumber}
                  onChange={(e) => setNewStudentRollNumber(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  placeholder="e.g. 101"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Email Address</label>
                <input 
                  type="email" 
                  value={newStudentEmail}
                  onChange={(e) => setNewStudentEmail(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  placeholder="student@example.com"
                  required
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={addingStudent}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  {addingStudent ? 'Adding...' : 'Add Student'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl p-6 shadow-2xl relative"
          >
            <button 
              onClick={closeEditModal}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Edit2 className="text-emerald-400" size={24} />
              Edit Student Details
            </h2>
            <form onSubmit={handleSaveStudent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Full Name</label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Roll Number</label>
                <input 
                  type="text" 
                  value={editRollNumber}
                  onChange={(e) => setEditRollNumber(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  placeholder="e.g. 101"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={closeEditModal}
                  className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={savingStudent}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Save size={18} />
                  {savingStudent ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
        <div className="mb-6 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
          <input
            type="text"
            placeholder="Search students by name, email, or roll number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-zinc-800/50 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-12 text-zinc-400">
            <UserCheck size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg">No students found.</p>
            {students.length === 0 && <p className="text-sm mt-2">Make sure there are users with the 'student' role.</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-zinc-400 text-sm">
                  <th className="pb-4 font-medium pl-4">Student</th>
                  <th className="pb-4 font-medium">Roll No</th>
                  <th className="pb-4 font-medium">Date</th>
                  <th className="pb-4 font-medium">Mark Attendance</th>
                  <th className="pb-4 font-medium text-right pr-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredStudents.map((student) => {
                  const record = attendanceRecords[student.id];
                  const isProcessing = processingId === student.id;

                  return (
                    <motion.tr 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      key={student.id} 
                      className="hover:bg-white/5 transition-colors group"
                    >
                      <td className="py-4 pl-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10 overflow-hidden shrink-0">
                            {student.photoURL ? (
                              <img src={student.photoURL} alt={student.displayName} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-sm font-bold text-zinc-400">
                                {student.displayName ? student.displayName.charAt(0).toUpperCase() : 'U'}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-zinc-200 flex items-center gap-2">
                              {student.displayName}
                              <button 
                                onClick={() => openEditModal(student)}
                                className="p-1 text-zinc-500 hover:text-emerald-400 transition-all"
                                title="Edit Student"
                              >
                                <Edit2 size={14} />
                              </button>
                            </div>
                            <div className="text-xs text-zinc-500">{student.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 text-zinc-300">{student.rollNumber || '-'}</td>
                      <td className="py-4 text-zinc-400 text-sm">{safeFormat(selectedDate, 'MMM d, yyyy')}</td>
                      <td className="py-4">
                        {!record ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => markAttendance(student.id, 'present')}
                              disabled={isProcessing}
                              className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium transition-colors border border-emerald-500/20 disabled:opacity-50"
                            >
                              Present
                            </button>
                            <button
                              onClick={() => markAttendance(student.id, 'late')}
                              disabled={isProcessing}
                              className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg text-sm font-medium transition-colors border border-amber-500/20 disabled:opacity-50"
                            >
                              Late
                            </button>
                            <button
                              onClick={() => markAttendance(student.id, 'absent')}
                              disabled={isProcessing}
                              className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm font-medium transition-colors border border-red-500/20 disabled:opacity-50"
                            >
                              Absent
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-500">
                            Marked at {safeFormat(record.checkInTime, 'hh:mm a')}
                          </span>
                        )}
                      </td>
                      <td className="py-4 text-right pr-4">
                        {record ? (
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium capitalize ${
                            record.status === 'present' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            record.status === 'late' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                            'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {record.status === 'present' ? <CheckCircle2 size={14} /> : 
                             record.status === 'late' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                            {record.status}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-zinc-800 text-zinc-400 border border-white/10">
                            Not Marked
                          </span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
