import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface UserData {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'teacher' | 'student';
  photoURL: string;
  createdAt: string;
  pinCode?: string;
  rollNumber?: string;
}

interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  loading: boolean;
  isAuthReady: boolean;
  isPinUnlocked: boolean;
  unlockPin: (pin: string) => boolean;
  setUserData: React.Dispatch<React.SetStateAction<UserData | null>>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userData: null,
  loading: true,
  isAuthReady: false,
  isPinUnlocked: false,
  unlockPin: () => false,
  setUserData: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isPinUnlocked, setIsPinUnlocked] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            let data = userDoc.data() as UserData;
            // Ensure the owner is always admin
            if (user.email === 'jiteshkumark029@gmail.com' && data.role !== 'admin') {
              data.role = 'admin';
              await setDoc(doc(db, 'users', user.uid), { role: 'admin' }, { merge: true });
            }
            setUserData(data);
            if (!data.pinCode) {
              setIsPinUnlocked(true);
            } else {
              setIsPinUnlocked(false); // Always lock on app start if PIN is set
            }
          } else {
            const role = user.email === 'jiteshkumark029@gmail.com' ? 'admin' : 'student';
            const newUserData: UserData = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || 'User',
              role,
              photoURL: user.photoURL || '',
              createdAt: new Date().toISOString(),
            };
            await setDoc(doc(db, 'users', user.uid), newUserData);
            setUserData(newUserData);
            setIsPinUnlocked(true);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUserData({
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || 'User',
            role: user.email === 'jiteshkumark029@gmail.com' ? 'admin' : 'student',
            photoURL: user.photoURL || '',
            createdAt: new Date().toISOString(),
          });
          setIsPinUnlocked(true);
        }
      } else {
        setUserData(null);
        setIsPinUnlocked(false);
      }
      setLoading(false);
      setIsAuthReady(true);
    });

    return unsubscribe;
  }, []);

  const unlockPin = (pin: string) => {
    if (userData?.pinCode === pin) {
      setIsPinUnlocked(true);
      return true;
    }
    return false;
  };

  return (
    <AuthContext.Provider value={{ currentUser, userData, loading, isAuthReady, isPinUnlocked, unlockPin, setUserData }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
