import { useState, useEffect } from 'react';
import { doc, onSnapshot, getDoc, setDoc } from 'firebase/firestore';
import { db, appId } from '../services/firebase';

/**
 * Custom hook for checking admin permissions
 * @param {User} user - Firebase user object
 * @returns {{ isAdmin: boolean, loading: boolean }}
 */
export const useAdmin = (user) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !db) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    let isMounted = true;
    let unsubscribe = null;

    // First, try a quick getDoc check (faster than onSnapshot for initial load)
    const checkAdminStatus = async () => {
      try {
        const adminRef = doc(db, 'artifacts', appId, 'admins', user.uid);
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        );
        
        const docSnap = await Promise.race([
          getDoc(adminRef),
          timeoutPromise
        ]);
        
        if (!isMounted) return;
        
        const isUserAdmin = docSnap.exists() && docSnap.data().isAdmin === true;
        setIsAdmin(isUserAdmin);
        setLoading(false);
        
        // console.log(`[Admin Check] User ${user.uid}: ${isUserAdmin ? 'IS ADMIN' : 'NOT ADMIN'}`);
        // if (docSnap.exists()) {
        //   console.log('[Admin Check] Admin document data:', docSnap.data());
        // }
        
        // Now set up real-time listener for changes (only if we got a response)
        unsubscribe = onSnapshot(adminRef, (snapshot) => {
          if (!isMounted) return;
          const isUserAdmin = snapshot.exists() && snapshot.data().isAdmin === true;
          setIsAdmin(isUserAdmin);
        }, (error) => {
          if (!isMounted) return;
          // If permission denied or document doesn't exist, user is not admin
          if (error.code !== 'permission-denied') {
            console.error('[Admin Check] Snapshot error:', error.code, error.message);
          }
          setIsAdmin(false);
        });
      } catch (error) {
        if (!isMounted) return;
        
        // If timeout or other error, assume not admin
        if (error.message === 'Timeout') {
          console.warn('[Admin Check] Timeout - assuming NOT ADMIN');
        } else {
          console.error('[Admin Check] Error:', error.code, error.message);
        }
        // console.log(`[Admin Check] User ${user.uid}: NOT ADMIN`);
        setIsAdmin(false);
        setLoading(false);
      }
    };

    checkAdminStatus();

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  return { isAdmin, loading };
};

/**
 * Check if a user is admin (one-time check, not reactive)
 * @param {User} user - Firebase user object
 * @returns {Promise<boolean>}
 */
export const checkIsAdmin = async (user) => {
  if (!user || !db) return false;
  
  try {
    const adminRef = doc(db, 'artifacts', appId, 'admins', user.uid);
    const docSnap = await getDoc(adminRef);
    return docSnap.exists() && docSnap.data().isAdmin === true;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

/**
 * Set user as admin (only admins can do this)
 * @param {string} userId - User ID to set as admin
 * @returns {Promise<boolean>}
 */
export const setUserAsAdmin = async (userId) => {
  if (!db) return false;
  
  try {
    const adminRef = doc(db, 'artifacts', appId, 'admins', userId);
    await setDoc(adminRef, {
      isAdmin: true,
      createdAt: new Date(),
      setBy: 'admin'
    });
    return true;
  } catch (error) {
    console.error('Error setting user as admin:', error);
    return false;
  }
};

/**
 * Remove admin status from user
 * @param {string} userId - User ID to remove admin from
 * @returns {Promise<boolean>}
 */
export const removeAdminStatus = async (userId) => {
  if (!db) return false;
  
  try {
    const adminRef = doc(db, 'artifacts', appId, 'admins', userId);
    await setDoc(adminRef, {
      isAdmin: false,
      updatedAt: new Date()
    });
    return true;
  } catch (error) {
    console.error('Error removing admin status:', error);
    return false;
  }
};

