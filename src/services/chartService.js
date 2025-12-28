import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db, appId } from './firebase';

/**
 * Service for managing chart/widget configurations in Firestore
 */

/**
 * Save a new chart configuration to Firestore
 * @param {Object} user - Firebase user object
 * @param {Object} config - Chart configuration object
 * @returns {Promise<string>} Document ID
 */
export const saveChartConfig = async (user, config) => {
  if (!user || !db) {
    throw new Error('User or database not available');
  }

  const { id, ...configData } = config;
  const configsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'dashboard_widgets');
  
  if (id) {
    // Update existing config
    await updateDoc(
      doc(db, 'artifacts', appId, 'users', user.uid, 'dashboard_widgets', id),
      {
        ...configData,
        updatedAt: new Date()
      }
    );
    return id;
  } else {
    // Create new config
    const docRef = await addDoc(configsRef, {
      ...configData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return docRef.id;
  }
};

/**
 * Delete a chart configuration
 * @param {Object} user - Firebase user object
 * @param {string} configId - Configuration document ID
 */
export const deleteChartConfig = async (user, configId) => {
  if (!user || !db) return;
  
  await deleteDoc(
    doc(db, 'artifacts', appId, 'users', user.uid, 'dashboard_widgets', configId)
  );
};

/**
 * Fetch all chart configurations for a user
 * @param {Object} user - Firebase user object
 * @returns {Promise<Array>} Array of chart configurations
 */
export const fetchChartConfigs = async (user) => {
  if (!user || !db) return [];
  
  const configsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'dashboard_widgets');
  const q = query(configsRef, orderBy('order', 'asc'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

/**
 * Subscribe to chart configurations changes (real-time)
 * @param {Object} user - Firebase user object
 * @param {Function} callback - Callback function to receive updates
 * @returns {Function} Unsubscribe function
 */
export const subscribeToChartConfigs = (user, callback) => {
  if (!user || !db) {
    callback([]);
    return () => {};
  }

  const configsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'dashboard_widgets');
  const q = query(configsRef, orderBy('order', 'asc'));
  
  return onSnapshot(q, (snapshot) => {
    const configs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(configs);
  });
};

/**
 * Update order of multiple chart configurations
 * @param {Object} user - Firebase user object
 * @param {Array} configs - Array of configs with updated order values
 */
export const updateChartOrders = async (user, configs) => {
  if (!user || !db) return;
  
  const updatePromises = configs.map(config => {
    const configRef = doc(db, 'artifacts', appId, 'users', user.uid, 'dashboard_widgets', config.id);
    return updateDoc(configRef, {
      order: config.order,
      updatedAt: new Date()
    });
  });
  
  await Promise.all(updatePromises);
};

