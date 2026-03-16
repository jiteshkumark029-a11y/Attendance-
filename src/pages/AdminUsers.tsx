import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Users, Search, Filter, Edit2, X, Save } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Edit State
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editRollNumber, setEditRollNumber] = useState('');
  const [editRole, setEditRole] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'users');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (user: any) => {
    setEditingUser(user);
    setEditName(user.displayName || '');
    setEditRollNumber(user.rollNumber || '');
    setEditRole(user.role || 'student');
  };

  const closeEditModal = () => {
    setEditingUser(null);
    setEditName('');
    setEditRollNumber('');
    setEditRole('');
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setSaving(true);
    try {
      const updateData = {
        displayName: editName,
        rollNumber: editRollNumber,
        role: editRole
      };
      
      await updateDoc(doc(db, 'users', editingUser.id), updateData);
      
      setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...updateData } : u));
      closeEditModal();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${editingUser.id}`);
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(user => 
    (user.displayName && String(user.displayName).toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.email && String(user.email).toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.rollNumber && String(user.rollNumber).toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div></div>;

  return (
    <div className="space-y-8 relative">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Manage Users</h1>
          <p className="text-zinc-400">View and manage all registered users.</p>
        </div>
        <div className="flex gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
            <Users className="text-emerald-400" size={28} />
          </div>
        </div>
      </header>

      <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/10 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
            <input 
              type="text" 
              placeholder="Search users by name, email, or roll number..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-950 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-950 text-zinc-400 text-sm uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Roll No</th>
                <th className="px-6 py-4 font-medium">Email</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium">Joined</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10 overflow-hidden">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-bold text-zinc-400">{user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}</span>
                        )}
                      </div>
                      <span className="font-medium">{user.displayName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-zinc-300">{user.rollNumber || '-'}</td>
                  <td className="px-6 py-4 text-zinc-400">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${
                      user.role === 'admin' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/20' :
                      user.role === 'teacher' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' :
                      'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-zinc-400">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => openEditModal(user)}
                      className="p-2 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors inline-flex items-center gap-2"
                    >
                      <Edit2 size={16} />
                      <span className="text-sm font-medium">Edit</span>
                    </button>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
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
              Edit User
            </h2>
            <form onSubmit={handleSaveUser} className="space-y-4">
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
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Role</label>
                <select 
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                </select>
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
                  disabled={saving}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Save size={18} />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
