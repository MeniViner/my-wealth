import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, getDocs, writeBatch, updateDoc } from 'firebase/firestore';
import { Menu, Edit2, Settings, Search, MoreVertical, Pin, Trash2, X, MessageSquare, FileText } from 'lucide-react';
import { db, appId } from '../services/firebase';
import { confirmAlert, successToast } from '../utils/alerts';

/**
 * ChatSidebar Component
 * Collapsible sidebar with hamburger menu
 * Features: Search, New Chat, Settings, Chat actions (Pin, Edit, Delete)
 */
const ChatSidebar = ({ 
  user, 
  activeChatId, 
  onSelectChat, 
  onCreateNewChat,
  onSelectReport,
  isOpen,
  onToggle,
  activeTab = 'chats'
}) => {
  const [chats, setChats] = useState([]);
  const [reports, setReports] = useState([]);
  const [currentTab, setCurrentTab] = useState(activeTab);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingChatId, setEditingChatId] = useState(null);
  const [editChatName, setEditChatName] = useState('');
  const [menuOpenChatId, setMenuOpenChatId] = useState(null);

  // Fetch chats from Firestore
  useEffect(() => {
    if (!user || !db) return;

    const q = query(
      collection(db, 'artifacts', appId, 'users', user.uid, 'chats'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setChats(chatsData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching chats:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Fetch reports from Firestore
  useEffect(() => {
    if (!user || !db) return;

    const q = query(
      collection(db, 'artifacts', appId, 'users', user.uid, 'reports'),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reportsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setReports(reportsData);
    }, (error) => {
      console.error('Error fetching reports:', error);
    });

    return () => unsubscribe();
  }, [user]);

  const handleCreateNewChat = async () => {
    if (!user || !db) return;

    try {
      const newChatRef = await addDoc(
        collection(db, 'artifacts', appId, 'users', user.uid, 'chats'),
        {
          title: 'שיחה חדשה',
          createdAt: serverTimestamp(),
          lastMessagePreview: '',
          updatedAt: serverTimestamp()
        }
      );
      
      onCreateNewChat(newChatRef.id);
      await successToast('צ\'אט חדש נוצר', 1500);
    } catch (error) {
      console.error('Error creating new chat:', error);
    }
  };

  const handleDeleteChat = async (chatId) => {
    const confirmed = await confirmAlert('מחיקת צ\'אט', 'למחוק צ\'אט זה? כל ההודעות ימחקו.', 'warning', true);
    
    if (confirmed && user && db) {
      try {
        // Delete all messages in the chat first
        const messagesRef = collection(
          db, 
          'artifacts', 
          appId, 
          'users', 
          user.uid, 
          'chats', 
          chatId, 
          'messages'
        );
        
        const messagesSnapshot = await getDocs(messagesRef);
        const batch = writeBatch(db);
        messagesSnapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        
        // Delete the chat document
        await deleteDoc(
          doc(db, 'artifacts', appId, 'users', user.uid, 'chats', chatId)
        );
        
        await batch.commit();
        
        if (activeChatId === chatId) {
          onCreateNewChat(null);
        }
        
        setMenuOpenChatId(null);
        await successToast('הצ\'אט נמחק', 1500);
      } catch (error) {
        console.error('Error deleting chat:', error);
      }
    }
  };

  const handleEditChat = (chat) => {
    setEditingChatId(chat.id);
    setEditChatName(chat.title || 'שיחה חדשה');
    setMenuOpenChatId(null);
  };

  const handleSaveEdit = async (chatId) => {
    if (!editChatName.trim() || !user || !db) return;

    try {
      const chatRef = doc(db, 'artifacts', appId, 'users', user.uid, 'chats', chatId);
      await updateDoc(chatRef, {
        title: editChatName.trim()
      });
      setEditingChatId(null);
      setEditChatName('');
      await successToast('השם עודכן', 1500);
    } catch (error) {
      console.error('Error updating chat name:', error);
    }
  };

  const handlePinChat = async (chatId) => {
    if (!user || !db) return;

    try {
      const chatRef = doc(db, 'artifacts', appId, 'users', user.uid, 'chats', chatId);
      const chat = chats.find(c => c.id === chatId);
      await updateDoc(chatRef, {
        pinned: !chat?.pinned
      });
      setMenuOpenChatId(null);
      await successToast(chat?.pinned ? 'הצמדה בוטלה' : 'הוצמד', 1500);
    } catch (error) {
      console.error('Error pinning chat:', error);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'היום';
    if (days === 1) return 'אתמול';
    if (days < 7) return `לפני ${days} ימים`;
    
    return date.toLocaleDateString('he-IL', { 
      day: 'numeric', 
      month: 'short' 
    });
  };

  // Filter chats/reports based on search
  const filteredChats = chats.filter(chat => 
    (chat.title || 'שיחה חדשה').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (chat.lastMessagePreview || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredReports = reports.filter(report => 
    (report.displayDate || new Date(report.date).toLocaleDateString('he-IL')).toLowerCase().includes(searchQuery.toLowerCase()) ||
    (report.tag || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort chats: pinned first, then by date
  const sortedChats = [...filteredChats].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });

  const sidebarWidth = isOpen ? 'w-80' : 'w-16';

  return (
    <>
      {/* Collapsible Sidebar */}
      <div className={`${sidebarWidth} h-full flex flex-col bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 transition-all duration-300 flex-shrink-0`} dir="rtl">
        {/* Top Icons - Always Visible */}
        <div className="p-3 space-y-2 border-b border-slate-200 dark:border-slate-700">
          {/* Hamburger Menu */}
          <button
            onClick={onToggle}
            className="w-full p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-3"
            title={isOpen ? 'סגור תפריט' : 'פתח תפריט'}
          >
            <Menu size={20} className="text-slate-600 dark:text-slate-300 flex-shrink-0" />
            {isOpen && <span className="text-sm font-medium text-slate-700 dark:text-slate-200">תפריט</span>}
          </button>

          {/* New Chat */}
          <button
            onClick={handleCreateNewChat}
            className="w-full p-3 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors flex items-center gap-3"
            title="צ'אט חדש"
          >
            <Edit2 size={20} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            {isOpen && <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">צ'אט חדש</span>}
          </button>
        </div>

        {/* Expanded Content */}
        {isOpen && (
          <>
            {/* Header with Search */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {currentTab === 'chats' ? 'צ\'אטים' : 'דוחות'}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentTab('chats')}
                    className={`p-1.5 rounded ${currentTab === 'chats' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                    title="צ'אטים"
                  >
                    <MessageSquare size={16} />
                  </button>
                  <button
                    onClick={() => setCurrentTab('reports')}
                    className={`p-1.5 rounded ${currentTab === 'reports' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                    title="דוחות"
                  >
                    <FileText size={16} />
                  </button>
                </div>
              </div>
              
              {/* Search */}
              <div className="relative">
                <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="חפש..."
                  className="w-full pr-10 pl-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  dir="rtl"
                />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {currentTab === 'chats' ? (
                <div className="p-2">
                  {loading ? (
                    <div className="text-center py-8 text-slate-400 dark:text-slate-500">
                      טוען...
                    </div>
                  ) : sortedChats.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
                      {searchQuery ? 'לא נמצאו תוצאות' : 'אין צ\'אטים עדיין'}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {sortedChats.map((chat) => (
                        <div
                          key={chat.id}
                          className={`group relative p-3 rounded-lg cursor-pointer transition ${
                            activeChatId === chat.id
                              ? 'bg-emerald-100 dark:bg-emerald-900/30 border-2 border-emerald-500 dark:border-emerald-600'
                              : 'bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 border-2 border-transparent'
                          }`}
                        >
                          {editingChatId === chat.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editChatName}
                                onChange={(e) => setEditChatName(e.target.value)}
                                onBlur={() => handleSaveEdit(chat.id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSaveEdit(chat.id);
                                  } else if (e.key === 'Escape') {
                                    setEditingChatId(null);
                                    setEditChatName('');
                                  }
                                }}
                                className="flex-1 px-2 py-1 text-sm border border-emerald-500 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                autoFocus
                                dir="rtl"
                              />
                            </div>
                          ) : (
                            <>
                              <div 
                                onClick={() => onSelectChat(chat.id)}
                                className="flex items-start justify-between gap-2"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    {chat.pinned && <Pin size={12} className="text-emerald-600 flex-shrink-0" />}
                                    <div className="font-medium text-slate-800 dark:text-slate-100 text-sm truncate">
                                      {chat.title || 'שיחה חדשה'}
                                    </div>
                                  </div>
                                  {chat.lastMessagePreview && (
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                                      {chat.lastMessagePreview}
                                    </div>
                                  )}
                                  <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                    {formatDate(chat.updatedAt || chat.createdAt)}
                                  </div>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMenuOpenChatId(menuOpenChatId === chat.id ? null : chat.id);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition"
                                  title="אפשרויות"
                                >
                                  <MoreVertical size={14} className="text-slate-600 dark:text-slate-300" />
                                </button>
                              </div>

                              {/* Dropdown Menu */}
                              {menuOpenChatId === chat.id && (
                                <div className="absolute left-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50">
                                  <button
                                    onClick={() => handlePinChat(chat.id)}
                                    className="w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-right"
                                  >
                                    <Pin size={14} />
                                    {chat.pinned ? 'בטל הצמדה' : 'הצמד להתחלה'}
                                  </button>
                                  <button
                                    onClick={() => handleEditChat(chat)}
                                    className="w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-right"
                                  >
                                    <Edit2 size={14} />
                                    ערוך שם
                                  </button>
                                  <button
                                    onClick={() => handleDeleteChat(chat.id)}
                                    className="w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2 text-right"
                                  >
                                    <Trash2 size={14} />
                                    מחק
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-2">
                  {filteredReports.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
                      {searchQuery ? 'לא נמצאו תוצאות' : 'אין דוחות שמורים'}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredReports.map((report) => (
                        <div
                          key={report.id}
                          onClick={() => onSelectReport(report)}
                          className="p-3 rounded-lg cursor-pointer transition bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 border-2 border-transparent"
                        >
                          <div className="font-medium text-slate-800 dark:text-slate-100 text-sm">
                            {report.displayDate || new Date(report.date).toLocaleDateString('he-IL')}
                          </div>
                          {report.tag && (
                            <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                              {report.tag}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Settings - Always at Bottom */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={() => window.location.href = '/settings#ai'}
            className="w-full p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-3"
            title="הגדרות"
          >
            <Settings size={20} className="text-slate-600 dark:text-slate-300 flex-shrink-0" />
            {isOpen && <span className="text-sm font-medium text-slate-700 dark:text-slate-200">הגדרות</span>}
          </button>
        </div>
      </div>

      {/* Overlay for mobile when sidebar is open */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 dark:bg-black/70 z-40"
          onClick={onToggle}
        />
      )}
    </>
  );
};

export default ChatSidebar;
