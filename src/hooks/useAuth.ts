import { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { User } from '../types';

export function useAuth() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [dbUser, setDbUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          // Fetch or create user in Firestore
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const data = userSnap.data() as User;
            // Auto-upgrade specific email to admin
            if (firebaseUser.email === 'buivanbac@gmail.com' && data.role !== 'admin') {
              await setDoc(userRef, { role: 'admin' }, { merge: true });
              data.role = 'admin';
            }
            setDbUser({ uid: firebaseUser.uid, ...data });
          } else {
            const role = firebaseUser.email === 'buivanbac@gmail.com' ? 'admin' : 'user';
            const newUser: Partial<User> = {
              email: firebaseUser.email || '',
              role: role
            };
            await setDoc(userRef, newUser);
            setDbUser({ uid: firebaseUser.uid, ...newUser } as User);
          }
        } catch (error) {
          console.error("Error fetching or creating user in Firestore:", error);
        }
      } else {
        setDbUser(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, dbUser, loading, isAdmin: dbUser?.role === 'admin' };
}
