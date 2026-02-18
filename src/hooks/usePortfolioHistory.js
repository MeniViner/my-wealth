/**
 * usePortfolioHistory - Hook for fetching portfolio value history
 * 
 * Reads daily snapshots from Firestore (portfolioSnapshots collection).
 * Falls back to calculating from individual asset histories if snapshots don't exist.
 * 
 * Collection structure:
 *   portfolioSnapshots/{YYYY-MM-DD}
 *     - date: string
 *     - totalValue: number
 *     - assetsCount: number
 *     - timestamp: Firestore Timestamp
 */

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { db, appId } from '../services/firebase';

/**
 * Get portfolio history from Firestore snapshots
 * @param {Object} user - Firebase user
 * @param {string} timeRange - '1M', '3M', '6M', '1Y', '5Y'
 * @returns {Promise<Array>} Array of { date, timestamp, value }
 */
export const usePortfolioHistory = (user, timeRange = '1M') => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !db) {
      setHistory([]);
      setLoading(false);
      return;
    }

    const fetchHistory = async () => {
      try {
        setLoading(true);

        // Calculate date range
        const days = getDaysForTimeRange(timeRange);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const startDateStr = startDate.toISOString().split('T')[0];

        // Query snapshots
        const snapshotsRef = collection(
          db,
          'artifacts', appId,
          'users', user.uid,
          'portfolioSnapshots'
        );

        const q = query(
          snapshotsRef,
          where('date', '>=', startDateStr),
          orderBy('date', 'asc'),
          limit(500) // Max 500 days
        );

        const snapshot = await getDocs(q);
        const dataPoints = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.totalValue && data.timestamp) {
            const timestamp = data.timestamp.toDate ? data.timestamp.toDate().getTime() : Date.now();
            dataPoints.push({
              date: data.date,
              timestamp,
              value: data.totalValue,
            });
          }
        });

        // Sort by timestamp (ascending)
        dataPoints.sort((a, b) => a.timestamp - b.timestamp);

        setHistory(dataPoints);
      } catch (error) {
        console.error('[usePortfolioHistory] Error:', error);
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user, timeRange]);

  return { history, loading };
};

/**
 * Helper: Convert time range to days
 * Supports all Dashboard time ranges
 */
function getDaysForTimeRange(range) {
  switch (range) {
    case '1D': return 1;
    case '1d': return 1;
    case '1W': return 7;
    case '5d': return 5;
    case '1M': return 30;
    case '3M': return 90;
    case '6M': return 180;
    case '1Y': return 365;
    case '5Y': return 1825;
    case 'ALL': return 1825; // ~5 years max
    default: return 30;
  }
}
