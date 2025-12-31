import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Calendar, Database, Wallet, ArrowRight, Edit2, Mail, TrendingUp, Building2, LayoutGrid, Eye, EyeOff, LogOut, Award, Tag } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db, appId } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import { confirmAlert } from '../utils/alerts';

const Profile = ({ user, assets, totalWealth, systemData }) => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Load wealth visibility from localStorage
  const [isWealthVisible, setIsWealthVisible] = useState(() => {
    const saved = localStorage.getItem('wealthVisibility');
    return saved !== null ? saved === 'true' : true;
  });
  
  // Save wealth visibility to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('wealthVisibility', isWealthVisible.toString());
    // Dispatch custom event to sync with other components
    window.dispatchEvent(new Event('wealthVisibilityChange'));
  }, [isWealthVisible]);
  
  // Listen for changes from other components
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('wealthVisibility');
      if (saved !== null) {
        setIsWealthVisible(saved === 'true');
      }
    };
    
    // Listen to custom event
    window.addEventListener('wealthVisibilityChange', handleStorageChange);
    // Listen to storage event (for cross-tab sync)
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('wealthVisibilityChange', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    const loadUserData = async () => {
      if (!user || !db) return;
      
      try {
        const userRef = doc(db, 'artifacts', appId, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          setUserData(userSnap.data());
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [user]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalAssets = assets.length;
    const categoriesCount = new Set(assets.map(a => a.category)).size;
    const platformsCount = new Set(assets.map(a => a.platform)).size;
    const instrumentsCount = new Set(assets.map(a => a.instrument)).size;
    
    // Calculate distribution by category
    const categoryDistribution = assets.reduce((acc, asset) => {
      acc[asset.category] = (acc[asset.category] || 0) + asset.value;
      return acc;
    }, {});

    // Find top category
    const topCategory = Object.entries(categoryDistribution).sort((a, b) => b[1] - a[1])[0];

    // Calculate total profit/loss percentage
    let totalProfitLossPercent = 0;
    if (assets.length > 0) {
      const totalCostBasis = assets.reduce((sum, asset) => {
        if (asset.assetMode === 'QUANTITY' && asset.quantity && asset.purchasePrice) {
          const costBasis = asset.quantity * (asset.purchasePrice || 0);
          return sum + (asset.currency === 'USD' ? costBasis * 3.65 : costBasis);
        } else if (asset.originalValue) {
          const originalValueInILS = asset.currency === 'USD' 
            ? asset.originalValue * 3.65 
            : asset.originalValue;
          return sum + originalValueInILS;
        }
        return sum;
      }, 0);
      
      if (totalCostBasis > 0) {
        totalProfitLossPercent = ((totalWealth - totalCostBasis) / totalCostBasis) * 100;
      }
    }

    // Calculate average value per asset
    const avgValuePerAsset = totalAssets > 0 ? totalWealth / totalAssets : 0;

    // Find largest asset
    const largestAsset = assets.length > 0 
      ? assets.reduce((max, asset) => asset.value > max.value ? asset : max, assets[0])
      : null;

    // Count assets with profit
    const assetsWithProfit = assets.filter(asset => {
      if (asset.profitLoss !== null && asset.profitLoss > 0) return true;
      if (asset.profitLossPercent !== null && asset.profitLossPercent > 0) return true;
      return false;
    }).length;

    // Count unique tags
    const allTags = assets
      .filter(asset => asset.tags && Array.isArray(asset.tags))
      .flatMap(asset => asset.tags);
    const uniqueTagsCount = new Set(allTags).size;

    return {
      totalAssets,
      categoriesCount,
      platformsCount,
      instrumentsCount,
      topCategory: topCategory ? { name: topCategory[0], value: topCategory[1] } : null,
      totalProfitLossPercent: Number(totalProfitLossPercent.toFixed(2)),
      avgValuePerAsset: Number(avgValuePerAsset.toFixed(0)),
      largestAsset: largestAsset ? { name: largestAsset.name, value: largestAsset.value } : null,
      assetsWithProfit,
      uniqueTagsCount
    };
  }, [assets, totalWealth]);

  const formatDate = (date) => {
    if (!date) return 'לא זמין';
    try {
      let d;
      if (date instanceof Date) {
        d = date;
      } else if (date.toDate) {
        d = date.toDate();
      } else {
        d = new Date(date);
      }
      return d.toLocaleDateString('he-IL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'לא זמין';
    }
  };

  const getJoinDate = () => {
    // Try userData first, then user metadata
    if (userData?.createdAt) {
      try {
        const date = userData.createdAt.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt);
        if (!isNaN(date.getTime())) {
          return date;
        }
      } catch (error) {
        console.error('Error parsing userData.createdAt:', error);
      }
    }
    if (user?.metadata?.creationTime) {
      try {
        const date = new Date(user.metadata.creationTime);
        if (!isNaN(date.getTime())) {
          return date;
        }
      } catch (error) {
        console.error('Error parsing user.metadata.creationTime:', error);
      }
    }
    // Fallback: use current date if no join date found (shouldn't happen, but prevents null)
    return null;
  };

  const getDaysSinceJoin = () => {
    const joinDate = getJoinDate();
    if (!joinDate) {
      // If no join date, try to calculate from first asset creation date
      if (assets.length > 0) {
        const assetDates = assets
          .map(asset => {
            if (asset.createdAt) {
              try {
                return asset.createdAt.toDate ? asset.createdAt.toDate() : new Date(asset.createdAt);
              } catch (e) {
                return null;
              }
            }
            return null;
          })
          .filter(Boolean)
          .filter(date => !isNaN(date.getTime()));
        
        if (assetDates.length > 0) {
          const earliestDate = new Date(Math.min(...assetDates.map(d => d.getTime())));
          const now = new Date();
          // Reset time to midnight for accurate day calculation
          const joinMidnight = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), earliestDate.getDate());
          const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const diffTime = nowMidnight - joinMidnight;
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          return diffDays >= 0 ? diffDays : 0; // Ensure non-negative
        }
      }
      return null;
    }
    try {
      const now = new Date();
      // Reset time to midnight for accurate day calculation
      const joinMidnight = new Date(joinDate.getFullYear(), joinDate.getMonth(), joinDate.getDate());
      const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const diffTime = nowMidnight - joinMidnight;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 ? diffDays : 0; // Ensure non-negative (shouldn't happen, but safety check)
    } catch (error) {
      console.error('Error calculating days since join:', error);
      return null;
    }
  };

  const handleSignOut = async () => {
    const confirmed = await confirmAlert(
      'התנתקות',
      'האם אתה בטוח שברצונך להתנתק?',
      'question'
    );
    if (confirmed) {
      try {
        await signOut();
      } catch (error) {
        console.error('Sign out error:', error);
      }
    }
  };

  // Calculate days since join - use useMemo to recalculate when dependencies change
  const daysSinceJoin = useMemo(() => {
    return getDaysSinceJoin();
  }, [userData, user, assets]);

  const joinDate = useMemo(() => {
    return getJoinDate();
  }, [userData, user]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto pb-12">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-slate-500 dark:text-slate-400">טוען...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-12 space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowRight size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">פרופיל אישי</h2>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-600 dark:text-red-400 hover:text-white hover:bg-red-600 dark:hover:bg-red-700 rounded-lg transition-all shadow-sm hover:shadow-md"
        >
          <LogOut size={18} className="flex-shrink-0" />
          <span>התנתק</span>
        </button>
      </header>

      {/* Profile Info Card - Enhanced UI with Dark Mode Support */}
      <div className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
        <div className="px-5 md:px-8 py-6 md:py-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {user?.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName || 'משתמש'} 
                  className="w-24 h-24 md:w-28 md:h-28 rounded-2xl ring-2 ring-emerald-400/60 dark:ring-emerald-500/50 shadow-lg shadow-emerald-500/15 dark:shadow-emerald-500/20 object-cover"
                />
              ) : (
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 dark:from-emerald-500 dark:to-teal-600 flex items-center justify-center ring-2 ring-emerald-300/70 dark:ring-emerald-400/60 shadow-lg shadow-emerald-500/15 dark:shadow-emerald-500/20">
                  <User size={48} className="text-white" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-right space-y-3 w-full">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {user?.displayName || user?.email || 'משתמש'}
                  </h3>
                  {user?.email && (
                    <div className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-200/80 bg-slate-100/80 dark:bg-white/5 px-3 py-1.5 rounded-full border border-slate-200 dark:border-white/10">
                      <Mail size={14} className="text-emerald-600 dark:text-emerald-300" />
                      <span className="text-sm">{user.email}</span>
                    </div>
                  )}
                </div>

                {daysSinceJoin !== null && (
                  <div className="flex items-center gap-2 justify-center md:justify-end flex-wrap">
                    <span className="px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-200 text-xs font-semibold border border-emerald-300 dark:border-emerald-400/30">
                      {daysSinceJoin} ימים פעילים
                    </span>
                    {joinDate && (
                      <span className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-white/10">
                        הצטרפת ב־{formatDate(joinDate)}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Meta row - Unique stats not shown elsewhere */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3 text-left md:text-right">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <TrendingUp size={16} className="text-emerald-600 dark:text-emerald-300" />
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-200/70">ממוצע לנכס</div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{isWealthVisible ? `₪${stats.avgValuePerAsset.toLocaleString()}` : '••••••'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <Award size={16} className="text-emerald-600 dark:text-emerald-300" />
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-200/70">נכס הגדול ביותר</div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white truncate" title={stats.largestAsset?.name}>
                      {stats.largestAsset ? (stats.largestAsset.name.length > 15 ? stats.largestAsset.name.substring(0, 15) + '...' : stats.largestAsset.name) : 'אין נתונים'}
                    </div>
                  </div>
                </div>
                <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <Tag size={16} className="text-emerald-600 dark:text-emerald-300" />
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-200/70">תגיות ייחודיות</div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{stats.uniqueTagsCount}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-6 md:px-8 py-6 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">סטטיסטיקות</h3>
        </div>
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:grid md:grid-cols-4 gap-4">
            {/* Primary stat with emerald accent - Full width on mobile, 1 column on desktop */}
            <div className="w-full md:col-span-1 p-5 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-emerald-600 dark:bg-emerald-500 rounded-lg">
                  <Wallet size={18} className="text-white" />
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">סה"כ הון עצמי</div>
                  <button
                    onClick={() => setIsWealthVisible(!isWealthVisible)}
                    className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/30 w-5 h-5 flex items-center justify-center flex-shrink-0"
                    title={isWealthVisible ? 'הסתר' : 'הצג'}
                  >
                    {isWealthVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {isWealthVisible ? `₪${totalWealth.toLocaleString()}` : '••••••'}
              </div>
            </div>
            
            {/* Secondary stats - Grid of 3 on mobile, 3 columns on desktop */}
            <div className="grid grid-cols-3 md:col-span-3 gap-2 md:gap-4">
              <div className="p-2 md:p-5 bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700 rounded-xl">
                <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
                  <div className="p-1 md:p-2 bg-slate-200 dark:bg-slate-700 rounded-lg">
                    <Database size={14} className="md:w-[18px] md:h-[18px] text-slate-600 dark:text-slate-400" />
                  </div>
                  <div className="text-[10px] md:text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">כמות נכסים</div>
                </div>
                <div className="text-lg md:text-2xl font-bold text-slate-900 dark:text-white">
                  {stats.totalAssets}
                </div>
              </div>
              
              <div className="p-2 md:p-5 bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700 rounded-xl">
                <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
                  <div className="p-1  md:p-2 bg-slate-200 dark:bg-slate-700 rounded-lg">
                    <TrendingUp size={14} className="md:w-[18px] md:h-[18px] text-slate-600 dark:text-slate-400" />
                  </div>
                  <div className="text-[10px] md:text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">אפיקי השקעה</div>
                </div>
                <div className="text-lg md:text-2xl font-bold text-slate-900 dark:text-white">
                  {stats.categoriesCount}
                </div>
              </div>
              
              <div className="p-2 md:p-5 bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700 rounded-xl">
                <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
                  <div className="p-1 md:p-2 bg-slate-200 dark:bg-slate-700 rounded-lg">
                    <Building2 size={14} className="md:w-[18px] md:h-[18px] text-slate-600 dark:text-slate-400" />
                  </div>
                  <div className="text-[10px] md:text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">חשבונות</div>
                </div>
                <div className="p-2 md:p-0 text-lg md:text-2xl font-bold text-slate-900 dark:text-white">
                  {stats.platformsCount}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Details */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-6 md:px-8 py-6 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">פרטים נוספים</h3>
        </div>
        <div className="p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-sm text-slate-600 dark:text-slate-400">מטבעות בסיס</span>
              <span className="text-lg font-semibold text-slate-900 dark:text-white">{stats.instrumentsCount}</span>
            </div>
            {stats.topCategory && (
              <>
                <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-sm text-slate-600 dark:text-slate-400">אפיק השקעה מוביל</span>
                  <span className="text-lg font-semibold text-slate-900 dark:text-white">{stats.topCategory.name}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-sm text-slate-600 dark:text-slate-400">שווי אפיק מוביל</span>
                  <span className="text-lg font-semibold text-slate-900 dark:text-white">
                    {isWealthVisible ? `₪${stats.topCategory.value.toLocaleString()}` : '••••••'}
                  </span>
                </div>
              </>
            )}
            <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-sm text-slate-600 dark:text-slate-400">רווח/הפסד כולל</span>
              <span className={`text-lg font-semibold ${stats.totalProfitLossPercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {stats.totalProfitLossPercent >= 0 ? '+' : ''}{stats.totalProfitLossPercent}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-6 md:px-8 py-6 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">פעולות מהירות</h3>
        </div>
        <div className="p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => navigate('/assets')}
              className="flex items-center justify-between p-5 bg-gradient-to-r from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-xl hover:from-emerald-100 hover:to-emerald-200 dark:hover:from-emerald-900/30 dark:hover:to-emerald-900/20 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-600 dark:bg-emerald-500 rounded-lg group-hover:bg-emerald-700 dark:group-hover:bg-emerald-600 transition-colors">
                  <Database size={20} className="text-white" />
                </div>
                <span className="text-base font-semibold text-slate-900 dark:text-white">ניהול נכסים</span>
              </div>
              <ArrowRight size={18} className="text-emerald-600 dark:text-emerald-500 group-hover:translate-x-[4px] transition-transform" />
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-slate-200 dark:bg-slate-700 rounded-lg group-hover:bg-slate-300 dark:group-hover:bg-slate-600 transition-colors">
                  <Edit2 size={20} className="text-slate-600 dark:text-slate-400" />
                </div>
                <span className="text-base font-semibold text-slate-900 dark:text-white">הגדרות</span>
              </div>
              <ArrowRight size={18} className="text-slate-400 group-hover:translate-x-[4px] transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;

