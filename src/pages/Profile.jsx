import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Calendar, Database, Wallet, ArrowRight, Edit2, Mail, TrendingUp, Building2, LayoutGrid, Eye, EyeOff, LogOut } from 'lucide-react';
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

    return {
      totalAssets,
      categoriesCount,
      platformsCount,
      instrumentsCount,
      topCategory: topCategory ? { name: topCategory[0], value: topCategory[1] } : null
    };
  }, [assets]);

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
        return userData.createdAt.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt);
      } catch (error) {
        return null;
      }
    }
    if (user?.metadata?.creationTime) {
      return new Date(user.metadata.creationTime);
    }
    return null;
  };

  const getDaysSinceJoin = () => {
    const joinDate = getJoinDate();
    if (!joinDate) return null;
    try {
      const now = new Date();
      const diffTime = Math.abs(now - joinDate);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch (error) {
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

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto pb-12">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-slate-500 dark:text-slate-400">טוען...</div>
        </div>
      </div>
    );
  }

  const daysSinceJoin = getDaysSinceJoin();
  const joinDate = getJoinDate();

  return (
    <div className="max-w-6xl mx-auto pb-12 space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
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

      {/* Profile Info Card - Clean and Organized */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-6 md:px-8 py-6 md:py-8">
          <div className="flex items-start gap-6">
            {/* Avatar - Left Side */}
            <div className="flex-shrink-0">
              {user?.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName || 'משתמש'} 
                  className="w-24 h-24 md:w-28 md:h-28 rounded-full ring-2 ring-slate-200 dark:ring-slate-700 shadow-sm"
                />
              ) : (
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/30 dark:to-emerald-800/30 flex items-center justify-center ring-2 ring-slate-200 dark:ring-slate-700 shadow-sm">
                  <User size={48} className="text-emerald-700 dark:text-emerald-400" />
                </div>
              )}
            </div>

            {/* User Info - Right Side */}
            <div className="flex-1 text-right space-y-3">
              <div>
                <h3 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-2 mr-12 md:mr-0 md:text-center">
                  {user?.displayName || user?.email || 'משתמש'}
                </h3>
                {user?.email && (
                  <div className="flex items-center justify-end gap-2 text-slate-600 dark:text-slate-400">
                    <Mail size={16} />
                    <span className="text-sm">{user.email}</span>
                  </div>
                )}
              </div>

              {/* Join Date Info - Desktop: Right side */}
              {joinDate && (
                <div className="hidden md:flex items-center justify-end gap-2 text-sm text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <Calendar size={16} className="text-emerald-600 dark:text-emerald-500" />
                  <span>הצטרפת ב-<span className="font-semibold text-slate-900 dark:text-white">{formatDate(joinDate)}</span></span>
                  {daysSinceJoin !== null && (
                    <span className="text-slate-500 dark:text-slate-500">• {daysSinceJoin} ימים</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Join Date Info - Mobile: Full width below image */}
          {joinDate && (
            <div className="md:hidden flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-400 pt-4 mt-4 border-t border-slate-200 dark:border-slate-700 w-full">
              <Calendar size={16} className="text-emerald-600 dark:text-emerald-500" />
              <span>הצטרפת ב-<span className="font-semibold text-slate-900 dark:text-white">{formatDate(joinDate)}</span></span>
              {daysSinceJoin !== null && (
                <span className="text-slate-500 dark:text-slate-500">• {daysSinceJoin} ימים</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-6 md:px-8 py-6 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">סטטיסטיקות</h3>
        </div>
        <div className="p-6 md:p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Primary stat with emerald accent */}
            <div className="p-5 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-xl">
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
            
            {/* Secondary stats */}
            <div className="p-5 bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-slate-200 dark:bg-slate-700 rounded-lg">
                  <Database size={18} className="text-slate-600 dark:text-slate-400" />
                </div>
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">כמות נכסים</div>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {stats.totalAssets}
              </div>
            </div>
            
            <div className="p-5 bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-slate-200 dark:bg-slate-700 rounded-lg">
                  <TrendingUp size={18} className="text-slate-600 dark:text-slate-400" />
                </div>
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">אפיקי השקעה</div>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {stats.categoriesCount}
              </div>
            </div>
            
            <div className="p-5 bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-slate-200 dark:bg-slate-700 rounded-lg">
                  <Building2 size={18} className="text-slate-600 dark:text-slate-400" />
                </div>
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">חשבונות</div>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {stats.platformsCount}
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
                    ₪{stats.topCategory.value.toLocaleString()}
                  </span>
                </div>
              </>
            )}
            {daysSinceJoin !== null && (
              <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-sm text-slate-600 dark:text-slate-400">ימים פעילים</span>
                <span className="text-lg font-semibold text-slate-900 dark:text-white">{daysSinceJoin}</span>
              </div>
            )}
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

