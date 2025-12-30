import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, doc, getDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { Shield, Users, UserCheck, UserX, Search, Loader2, AlertCircle, Mail, Calendar, RefreshCw, Trash2, Send } from 'lucide-react';
import { db, appId } from '../services/firebase';
import { useAdmin, setUserAsAdmin, removeAdminStatus } from '../hooks/useAdmin';
import { confirmAlert, successAlert, errorAlert } from '../utils/alerts';

const UserManagement = ({ user }) => {
  const { isAdmin, loading: adminLoading } = useAdmin(user);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [processing, setProcessing] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch all users from Firestore
  useEffect(() => {
    if (!isAdmin || !db) {
      setLoading(false);
      return;
    }

    const fetchUsers = async () => {
      try {
        setLoading(true);
        console.log('[UserManagement] Starting to fetch users...');
        
        const usersMap = new Map();
        
        // Method 1: Get all users from users collection (primary source)
        try {
          console.log('[UserManagement] Fetching from users collection...');
          const usersRef = collection(db, 'artifacts', appId, 'users');
          const usersSnapshot = await getDocs(usersRef);
          console.log(`[UserManagement] Found ${usersSnapshot.docs.length} users in users collection`);
          
          for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;
            const userData = userDoc.data();
            console.log(`[UserManagement] Processing user: ${userId}`, userData);
            
            if (!usersMap.has(userId)) {
              usersMap.set(userId, {
                id: userId,
                email: userData.email || userId,
                displayName: userData.displayName || null,
                assetsCount: 0,
                isAdmin: false,
                createdAt: userData.createdAt ? (userData.createdAt.toDate ? userData.createdAt : userData.createdAt) : null
              });
            } else {
              // Update existing user with data from users collection
              const existingUser = usersMap.get(userId);
              existingUser.email = userData.email || existingUser.email || userId;
              existingUser.displayName = userData.displayName || existingUser.displayName;
              if (userData.createdAt) {
                existingUser.createdAt = userData.createdAt;
              }
            }
          }
        } catch (error) {
          console.error('[UserManagement] Error fetching users collection:', error);
          errorAlert('שגיאה', `שגיאה בטעינת משתמשים: ${error.message}`);
        }
        
        // Method 2: Get all admins and update admin status
        try {
          console.log('[UserManagement] Fetching from admins collection...');
          const adminsRef = collection(db, 'artifacts', appId, 'admins');
          const adminsSnapshot = await getDocs(adminsRef);
          console.log(`[UserManagement] Found ${adminsSnapshot.docs.length} admins`);
          
          for (const adminDoc of adminsSnapshot.docs) {
            const userId = adminDoc.id;
            const adminData = adminDoc.data();
            
            if (!usersMap.has(userId)) {
              // Admin exists but no user document - create entry
              usersMap.set(userId, {
                id: userId,
                email: userId,
                displayName: null,
                assetsCount: 0,
                isAdmin: adminData.isAdmin === true,
                createdAt: adminData.createdAt ? (adminData.createdAt.toDate ? adminData.createdAt : adminData.createdAt) : null
              });
            } else {
              // Update existing user with admin status
              const existingUser = usersMap.get(userId);
              existingUser.isAdmin = adminData.isAdmin === true;
              if (adminData.createdAt && !existingUser.createdAt) {
                existingUser.createdAt = adminData.createdAt;
              }
            }
          }
        } catch (error) {
          console.error('[UserManagement] Error fetching admins:', error);
        }
        
        // Method 3: For each known user, get their assets count and verify admin status
        console.log(`[UserManagement] Processing ${usersMap.size} users...`);
        const usersList = [];
        for (const [userId, userData] of usersMap.entries()) {
          try {
            // Get user's assets count
            try {
              const assetsRef = collection(db, 'artifacts', appId, 'users', userId, 'assets');
              const assetsSnapshot = await getDocs(assetsRef);
              userData.assetsCount = assetsSnapshot.size;
            } catch (error) {
              console.warn(`[UserManagement] Error getting assets for ${userId}:`, error);
              userData.assetsCount = 0;
            }
            
            // Verify admin status if not already set
            if (userData.isAdmin === undefined || userData.isAdmin === false) {
              try {
                const adminRef = doc(db, 'artifacts', appId, 'admins', userId);
                const adminSnap = await getDoc(adminRef);
                userData.isAdmin = adminSnap.exists() && adminSnap.data().isAdmin === true;
              } catch (error) {
                console.warn(`[UserManagement] Error checking admin status for ${userId}:`, error);
                userData.isAdmin = false;
              }
            }
            
            usersList.push(userData);
          } catch (error) {
            console.error(`[UserManagement] Error processing user ${userId}:`, error);
            // Still add the user even if we can't get all their data
            usersList.push(userData);
          }
        }
        
        console.log(`[UserManagement] Total users found: ${usersList.length}`);
        
        // Sort by admin status first, then by assets count
        usersList.sort((a, b) => {
          if (a.isAdmin !== b.isAdmin) return b.isAdmin - a.isAdmin;
          return b.assetsCount - a.assetsCount;
        });
        
        setUsers(usersList);
        
        // Show warning if no users found
        if (usersList.length === 0) {
          console.warn('[UserManagement] No users found. Make sure:');
          console.warn('1. Users have logged in at least once (to create user documents)');
          console.warn('2. Firestore rules allow admins to read users collection');
          console.warn('3. Check browser console for any permission errors');
        }
      } catch (error) {
        console.error('[UserManagement] Error fetching users:', error);
        console.error('[UserManagement] Error details:', {
          code: error.code,
          message: error.message,
          stack: error.stack
        });
        
        let errorMessage = 'אירעה שגיאה בטעינת המשתמשים';
        if (error.code === 'permission-denied') {
          errorMessage = 'שגיאת הרשאות: ודא שהכללים ב-Firestore עודכנו. ראה DEPLOY_FIRESTORE_RULES.md';
        }
        errorAlert('שגיאה', errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [isAdmin, refreshKey]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Filter users by search term
  const filteredUsers = users.filter(u => 
    u.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (u.displayName && u.displayName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Delete user and all their data
  const handleDeleteUser = async (userId, userEmail) => {
    const confirmed = await confirmAlert(
      'מחיקת משתמש',
      `האם אתה בטוח שברצונך למחוק את המשתמש ${userEmail || userId}? פעולה זו תמחק את כל הנתונים שלו כולל נכסים, הגדרות, דוחות וצ'אטים. פעולה זו אינה הפיכה!`,
      'error'
    );
    
    if (!confirmed) return;

    setProcessing(userId);
    try {
      if (!db) {
        await errorAlert('שגיאה', 'מסד הנתונים לא זמין');
        return;
      }

      const batch = writeBatch(db);

      // Delete all user's subcollections
      const collectionsToDelete = ['assets', 'reports', 'dashboard_widgets', 'chats', 'settings'];
      
      for (const collectionName of collectionsToDelete) {
        try {
          const collectionRef = collection(db, 'artifacts', appId, 'users', userId, collectionName);
          const snapshot = await getDocs(collectionRef);
          snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
          });
          
          // For chats, also delete messages subcollection
          if (collectionName === 'chats') {
            for (const chatDoc of snapshot.docs) {
              const messagesRef = collection(db, 'artifacts', appId, 'users', userId, 'chats', chatDoc.id, 'messages');
              const messagesSnapshot = await getDocs(messagesRef);
              messagesSnapshot.docs.forEach((msgDoc) => {
                batch.delete(msgDoc.ref);
              });
            }
          }
        } catch (error) {
          console.warn(`Error deleting ${collectionName}:`, error);
        }
      }

      // Delete user document
      const userRef = doc(db, 'artifacts', appId, 'users', userId);
      batch.delete(userRef);

      // Delete admin status if exists
      const adminRef = doc(db, 'artifacts', appId, 'admins', userId);
      const adminSnap = await getDoc(adminRef);
      if (adminSnap.exists()) {
        batch.delete(adminRef);
      }

      await batch.commit();
      
      // Remove from local state
      setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
      
      await successAlert('הצלחה', 'המשתמש וכל נתוניו נמחקו בהצלחה');
    } catch (error) {
      console.error('Error deleting user:', error);
      await errorAlert('שגיאה', 'אירעה שגיאה במחיקת המשתמש: ' + error.message);
    } finally {
      setProcessing(null);
    }
  };

  // Send email to user
  const handleSendEmail = (userEmail) => {
    if (userEmail && userEmail !== user.uid) {
      window.location.href = `mailto:${userEmail}`;
    } else {
      errorAlert('שגיאה', 'לא ניתן לשלוח מייל - אין כתובת מייל זמינה');
    }
  };

  const handleToggleAdmin = async (userId, currentStatus) => {
    const action = currentStatus ? 'להסיר הרשאות מנהל' : 'להוסיף הרשאות מנהל';
    const confirmed = await confirmAlert(
      'שינוי הרשאות',
      `האם אתה בטוח שברצונך ${action} למשתמש זה?`,
      'warning'
    );
    
    if (!confirmed) return;

    setProcessing(userId);
    try {
      if (currentStatus) {
        await removeAdminStatus(userId);
        await successAlert('הצלחה', 'הרשאות המנהל הוסרו בהצלחה');
      } else {
        await setUserAsAdmin(userId);
        await successAlert('הצלחה', 'הרשאות המנהל נוספו בהצלחה');
      }
      
      // Refresh users list
      const adminRef = doc(db, 'artifacts', appId, 'admins', userId);
      const adminSnap = await getDoc(adminRef);
      const isUserAdmin = adminSnap.exists() && adminSnap.data().isAdmin === true;
      
      setUsers(prevUsers => 
        prevUsers.map(u => 
          u.id === userId ? { ...u, isAdmin: isUserAdmin } : u
        )
      );
    } catch (error) {
      console.error('Error toggling admin status:', error);
      await errorAlert('שגיאה', 'אירעה שגיאה בשינוי ההרשאות');
    } finally {
      setProcessing(null);
    }
  };

  // Show access denied if not admin
  if (!adminLoading && !isAdmin) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 dark:text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-800 dark:text-red-300 mb-2">גישה נדחתה</h2>
          <p className="text-red-600 dark:text-red-400">אין לך הרשאות גישה לדף זה. רק מנהלים יכולים לגשת לניהול משתמשים.</p>
        </div>
      </div>
    );
  }

  if (adminLoading || loading) {
    return (
      <div className="max-w-7xl mx-auto py-12">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-slate-600">טוען...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 rounded-2xl p-4 md:p-6 shadow-lg border border-slate-200 dark:border-slate-700 mr-12 md:mr-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-xl">
              <Shield className="text-purple-600 dark:text-purple-400" size={32} />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white">ניהול משתמשים</h2>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">נהל הרשאות משתמשים ומנהלים</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            רענון
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 md:p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">סה"כ משתמשים</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{users.length}</p>
            </div>
            <Users className="w-10 h-10 text-blue-500 dark:text-blue-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 md:p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">מנהלים</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
                {users.filter(u => u.isAdmin).length}
              </p>
            </div>
            <Shield className="w-10 h-10 text-purple-500 dark:text-purple-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 md:p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">משתמשים רגילים</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
                {users.filter(u => !u.isAdmin).length}
              </p>
            </div>
            <Users className="w-10 h-10 text-emerald-500 dark:text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500" size={20} />
          <input
            type="text"
            placeholder="חפש משתמש לפי שם, אימייל או ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 md:px-6 py-4 text-right text-sm font-semibold text-slate-700 dark:text-slate-200">משתמש</th>
                <th className="px-4 md:px-6 py-4 text-right text-sm font-semibold text-slate-700 dark:text-slate-200">נכסים</th>
                <th className="px-4 md:px-6 py-4 text-right text-sm font-semibold text-slate-700 dark:text-slate-200">סטטוס</th>
                <th className="px-4 md:px-6 py-4 text-center text-sm font-semibold text-slate-700 dark:text-slate-200">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-4 md:px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Users className="w-12 h-12 text-slate-400 dark:text-slate-500" />
                      <div className="text-slate-500 dark:text-slate-400">
                        {searchTerm ? (
                          <span>לא נמצאו משתמשים התואמים לחיפוש</span>
                        ) : (
                          <>
                            <p className="font-medium mb-2">אין משתמשים במערכת</p>
                            <p className="text-sm mb-3">משתמשים יופיעו כאן לאחר שיתחברו לראשונה לאפליקציה</p>
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm text-blue-800 dark:text-blue-300 max-w-lg mx-auto text-right">
                              <p className="font-medium mb-2">💡 טיפים לפתרון:</p>
                              <ol className="list-decimal list-inside space-y-2 text-right">
                                <li>
                                  <strong>העלה את הכללים ל-Firebase Console:</strong>
                                  <ul className="list-disc list-inside mr-4 mt-1 text-xs">
                                    <li>פתח Firebase Console → Firestore Database → Rules</li>
                                    <li>העתק את התוכן מ-<code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">firestore.rules</code></li>
                                    <li>הדבק ולחץ Publish</li>
                                    <li>ראה QUICK_DEPLOY_RULES.md להוראות מפורטות</li>
                                  </ul>
                                </li>
                                <li>משתמשים שלא התחברו לאחרונה לא יופיעו עד שיתחברו שוב</li>
                                <li>בדוק את הקונסול (F12) לראות כמה משתמשים נמצאו</li>
                                <li>אם יש שגיאת הרשאות, ודא שהכללים עודכנו ונשמרו</li>
                              </ol>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((userItem) => (
                  <tr key={userItem.id} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                    <td className="px-4 md:px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white font-bold">
                          {(userItem.displayName || userItem.email || userItem.id).charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          {userItem.displayName && (
                            <div className="font-medium text-slate-800 dark:text-slate-100 truncate">
                              {userItem.displayName}
                            </div>
                          )}
                          {userItem.email && userItem.email !== userItem.id && (
                            <div className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-1 mt-0.5">
                              <Mail size={12} />
                              <span className="truncate">{userItem.email}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                              ID: {userItem.id}
                            </div>
                            {userItem.createdAt && (
                              <div className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                <Calendar size={10} />
                                {userItem.createdAt.toDate ? 
                                  userItem.createdAt.toDate().toLocaleDateString('he-IL') :
                                  (userItem.createdAt instanceof Date ? 
                                    userItem.createdAt.toLocaleDateString('he-IL') :
                                    new Date(userItem.createdAt).toLocaleDateString('he-IL'))
                                }
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-4">
                      <span className="text-slate-700 dark:text-slate-200 font-medium">{userItem.assetsCount}</span>
                    </td>
                    <td className="px-4 md:px-6 py-4">
                      {userItem.isAdmin ? (
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium">
                          <Shield size={14} />
                          מנהל
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium">
                          <Users size={14} />
                          משתמש
                        </span>
                      )}
                    </td>
                    <td className="px-4 md:px-6 py-4">
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        {userItem.id !== user.uid ? (
                          <>
                            <button
                              onClick={() => handleToggleAdmin(userItem.id, userItem.isAdmin)}
                              disabled={processing === userItem.id}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                                userItem.isAdmin
                                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
                                  : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/50'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              {processing === userItem.id ? (
                                <>
                                  <Loader2 size={14} className="animate-spin" />
                                  <span className="hidden sm:inline">מעבד...</span>
                                </>
                              ) : userItem.isAdmin ? (
                                <>
                                  <UserX size={14} />
                                  <span className="hidden sm:inline">הסר הרשאות</span>
                                </>
                              ) : (
                                <>
                                  <UserCheck size={14} />
                                  <span className="hidden sm:inline">הוסף מנהל</span>
                                </>
                              )}
                            </button>
                            
                            {userItem.email && userItem.email !== userItem.id && (
                              <button
                                onClick={() => handleSendEmail(userItem.email)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition"
                                title={`שלח מייל ל-${userItem.email}`}
                              >
                                <Send size={14} />
                                <span className="hidden sm:inline">שלח מייל</span>
                              </button>
                            )}
                            
                            <button
                              onClick={() => handleDeleteUser(userItem.id, userItem.email || userItem.displayName || userItem.id)}
                              disabled={processing === userItem.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                              title="מחק משתמש"
                            >
                              {processing === userItem.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <>
                                  <Trash2 size={14} />
                                  <span className="hidden sm:inline">מחק</span>
                                </>
                              )}
                            </button>
                          </>
                        ) : (
                          <span className="text-sm text-slate-400 dark:text-slate-500 italic">אתה</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;

