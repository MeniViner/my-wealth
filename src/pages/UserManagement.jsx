import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { Shield, Users, UserCheck, UserX, Search, Loader2, AlertCircle, Mail, Calendar } from 'lucide-react';
import { db, appId } from '../services/firebase';
import { useAdmin, setUserAsAdmin, removeAdminStatus } from '../hooks/useAdmin';
import { confirmAlert, successAlert, errorAlert } from '../utils/alerts';

const UserManagement = ({ user }) => {
  const { isAdmin, loading: adminLoading } = useAdmin(user);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [processing, setProcessing] = useState(null);

  // Fetch all users from Firestore
  useEffect(() => {
    if (!isAdmin || !db) {
      setLoading(false);
      return;
    }

    const fetchUsers = async () => {
      try {
        setLoading(true);
        
        // Get all user IDs from the users collection
        const usersRef = collection(db, 'artifacts', appId, 'users');
        const usersSnapshot = await getDocs(usersRef);
        
        const usersList = [];
        
        // For each user, get their data and check admin status
        for (const userDoc of usersSnapshot.docs) {
          const userId = userDoc.id;
          
          // Get user's assets count
          const assetsRef = collection(db, 'artifacts', appId, 'users', userId, 'assets');
          const assetsSnapshot = await getDocs(assetsRef);
          
          // Get admin status
          const adminRef = doc(db, 'artifacts', appId, 'admins', userId);
          const adminSnap = await getDoc(adminRef);
          const isUserAdmin = adminSnap.exists() && adminSnap.data().isAdmin === true;
          
          // Get user settings to find email if stored
          const settingsRef = doc(db, 'artifacts', appId, 'users', userId, 'settings', 'config');
          const settingsSnap = await getDoc(settingsRef);
          
          usersList.push({
            id: userId,
            email: userId, // We'll use userId as identifier since we don't store email in Firestore
            assetsCount: assetsSnapshot.size,
            isAdmin: isUserAdmin,
            createdAt: userDoc.data()?.createdAt || null
          });
        }
        
        // Sort by admin status first, then by assets count
        usersList.sort((a, b) => {
          if (a.isAdmin !== b.isAdmin) return b.isAdmin - a.isAdmin;
          return b.assetsCount - a.assetsCount;
        });
        
        setUsers(usersList);
      } catch (error) {
        console.error('Error fetching users:', error);
        errorAlert('שגיאה', 'אירעה שגיאה בטעינת המשתמשים');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [isAdmin]);

  // Filter users by search term
  const filteredUsers = users.filter(u => 
    u.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
      <header className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 rounded-2xl p-4 md:p-6 shadow-lg border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-4">
          <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-xl">
            <Shield className="text-purple-600 dark:text-purple-400" size={32} />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white">ניהול משתמשים</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">נהל הרשאות משתמשים ומנהלים</p>
          </div>
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
            placeholder="חפש משתמש לפי ID או אימייל..."
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
                  <td colSpan="4" className="px-4 md:px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    {searchTerm ? 'לא נמצאו משתמשים התואמים לחיפוש' : 'אין משתמשים במערכת'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((userItem) => (
                  <tr key={userItem.id} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                    <td className="px-4 md:px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white font-bold">
                          {userItem.id.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-slate-800 dark:text-slate-100">{userItem.id}</div>
                          {userItem.email && (
                            <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <Mail size={12} />
                              {userItem.email}
                            </div>
                          )}
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
                    <td className="px-4 md:px-6 py-4 text-center">
                      {userItem.id !== user.uid && (
                        <button
                          onClick={() => handleToggleAdmin(userItem.id, userItem.isAdmin)}
                          disabled={processing === userItem.id}
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                            userItem.isAdmin
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
                              : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/50'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {processing === userItem.id ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              מעבד...
                            </>
                          ) : userItem.isAdmin ? (
                            <>
                              <UserX size={16} />
                              הסר הרשאות
                            </>
                          ) : (
                            <>
                              <UserCheck size={16} />
                              הוסף מנהל
                            </>
                          )}
                        </button>
                      )}
                      {userItem.id === user.uid && (
                        <span className="text-sm text-slate-400 dark:text-slate-500">אתה</span>
                      )}
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

