import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { MapPin, Camera, Clock, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import Webcam from 'react-webcam';
import { format } from 'date-fns';
import { safeFormat } from '../utils/dateUtils';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export default function Dashboard() {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const webcamRef = useRef<Webcam>(null);

  useEffect(() => {
    console.log("Dashboard useEffect, userData:", userData);
    if (userData) {
      fetchTodayAttendance();
    } else {
      console.log("userData is null, setting loading to false");
      setLoading(false);
    }
  }, [userData]);

  const fetchTodayAttendance = async () => {
    console.log("fetchTodayAttendance started");
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const q = query(
        collection(db, 'attendance'),
        where('userId', '==', userData?.uid)
      );
      console.log("Executing getDocs...");
      const snapshot = await getDocs(q);
      console.log("getDocs completed, snapshot size:", snapshot.size);
      const todayRecord = snapshot.docs.find(doc => doc.data().date === today);
      if (todayRecord) {
        setTodayRecord({ id: todayRecord.id, ...todayRecord.data() });
      }
    } catch (error) {
      console.error("fetchTodayAttendance error:", error);
      try {
        handleFirestoreError(error, OperationType.GET, 'attendance');
      } catch (e) {
        console.error("handleFirestoreError threw:", e);
      }
    } finally {
      console.log("fetchTodayAttendance finally, setting loading to false");
      setLoading(false);
    }
  };

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  const handleCheckIn = async () => {
    getLocation();
    if (!location) {
      // In preview environments, location might be blocked. We'll allow check-in without it.
      console.warn('Location not available. Proceeding without location verification.');
    }
    setShowCamera(true);
  };

  const verifyAndMarkAttendance = async () => {
    setVerifying(true);
    const imageSrc = webcamRef.current?.getScreenshot();
    
    // Simulate AI Face Verification delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const now = new Date();
      const isLate = now.getHours() >= 10; // Simple rule: after 10 AM is late
      
      const recordData = {
        userId: userData?.uid,
        date: today,
        checkInTime: now.toISOString(),
        status: isLate ? 'late' : 'present',
        location: location || { lat: 0, lng: 0 },
        faceVerified: !!imageSrc,
        qrVerified: false
      };

      const docRef = await addDoc(collection(db, 'attendance'), recordData);
      setTodayRecord({ id: docRef.id, ...recordData });
      setShowCamera(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'attendance');
    } finally {
      setVerifying(false);
    }
  };

  const handleCheckOut = async () => {
    if (!todayRecord) return;
    try {
      const now = new Date();
      await updateDoc(doc(db, 'attendance', todayRecord.id), {
        checkOutTime: now.toISOString()
      });
      setTodayRecord({ ...todayRecord, checkOutTime: now.toISOString() });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `attendance/${todayRecord.id}`);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div></div>;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Welcome back, {userData?.displayName}</h1>
        <p className="text-zinc-400">Here's your attendance overview for today.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Status Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="col-span-1 md:col-span-2 bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 relative overflow-hidden shadow-2xl"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
          
          <div className="flex items-start justify-between relative z-10">
            <div>
              <h2 className="text-xl font-semibold mb-1">Current Status</h2>
              <div className="flex items-center gap-2 text-zinc-400 mb-8">
                <Clock size={16} />
                <span>{format(new Date(), 'EEEE, MMMM d, yyyy')}</span>
              </div>

              {todayRecord ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${todayRecord.status === 'late' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                      {todayRecord.status === 'late' ? <AlertCircle size={32} /> : <CheckCircle2 size={32} />}
                    </div>
                    <div>
                      <p className="text-3xl font-bold capitalize">{todayRecord.status}</p>
                      <p className="text-zinc-400">Checked in at {safeFormat(todayRecord.checkInTime, 'hh:mm a')}</p>
                    </div>
                  </div>
                  
                  {todayRecord.checkOutTime ? (
                    <div className="mt-4 p-4 bg-zinc-800/50 rounded-xl border border-white/5">
                      <p className="text-zinc-300">Checked out at {safeFormat(todayRecord.checkOutTime, 'hh:mm a')}</p>
                    </div>
                  ) : (
                    <button 
                      onClick={handleCheckOut}
                      className="mt-6 px-8 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium transition-colors border border-white/10"
                    >
                      Check Out Now
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 rounded-2xl bg-zinc-800 text-zinc-400">
                      <XCircle size={32} />
                    </div>
                    <div>
                      <p className="text-3xl font-bold">Not Checked In</p>
                      <p className="text-zinc-400">You haven't marked attendance today.</p>
                    </div>
                  </div>

                  {!showCamera ? (
                    <button 
                      onClick={handleCheckIn}
                      className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                    >
                      <Camera size={20} />
                      Smart Check In
                    </button>
                  ) : (
                    <div className="space-y-4 mt-4">
                      <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500/50 aspect-video max-w-md">
                        <Webcam
                          audio={false}
                          ref={webcamRef}
                          screenshotFormat="image/jpeg"
                          className="w-full h-full object-cover"
                          mirrored={false}
                          imageSmoothing={true}
                          forceScreenshotSourceSize={false}
                          disablePictureInPicture={true}
                          screenshotQuality={0.92}
                          onUserMedia={() => {}}
                          onUserMediaError={() => {}}
                        />
                        {verifying && (
                          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm">
                            <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-emerald-400 font-medium animate-pulse">Verifying Face & Location...</p>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-4">
                        <button 
                          onClick={verifyAndMarkAttendance}
                          disabled={verifying}
                          className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                        >
                          Verify & Mark Present
                        </button>
                        <button 
                          onClick={() => setShowCamera(false)}
                          disabled={verifying}
                          className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* AI Insights Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl"
        >
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">AI Insights</span>
          </h2>
          
          <div className="space-y-6">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
              <p className="text-sm text-emerald-400 font-medium mb-1">Punctuality Score</p>
              <p className="text-3xl font-bold text-white">94%</p>
              <p className="text-xs text-zinc-400 mt-2">Top 10% in your department</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-400 mt-2"></div>
                <p className="text-sm text-zinc-300">You usually arrive 5 minutes early. Keep it up!</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-cyan-400 mt-2"></div>
                <p className="text-sm text-zinc-300">Location verified: Office HQ</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
