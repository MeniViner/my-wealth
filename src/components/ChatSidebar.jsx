import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, getDocs, writeBatch, updateDoc } from 'firebase/firestore';
import { Edit2, Search, MoreVertical, Pin, Trash2, X, MessageSquare, FileText, PenSquare, ExternalLink } from 'lucide-react';
import { db, appId } from '../services/firebase';
import { confirmAlert, successToast } from '../utils/alerts';

/**
 * ChatSidebar Component - History Drawer
 * 
 * Desktop: Always visible sidebar (25% width)
 * Mobile: Off-Canvas Drawer (80% width, z-index 50)
 * 
 * Features: 
 * - Big "+ New Chat" button at top
 * - Search functionality
 * - Chat/Report tabs
 * - Chat actions (Pin, Edit, Delete)
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
    const navigate = useNavigate();
    const [chats, setChats] = useState([]);
    const [reports, setReports] = useState([]);
    const [currentTab, setCurrentTab] = useState(activeTab);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingChatId, setEditingChatId] = useState(null);
    const [editChatName, setEditChatName] = useState('');
    const [menuOpenChatId, setMenuOpenChatId] = useState(null);
    const [searchOpen, setSearchOpen] = useState(false);

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

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-800 shadow-xl" dir="rtl">
            {/* Header with Close Button (Mobile only) */}
            <div className="lg:hidden flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mr-12 md:mr-0">היסטוריית שיחות</h3>
                <button
                    onClick={onToggle}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    aria-label="סגור"
                >
                    <X size={20} className="text-slate-600 dark:text-slate-300" />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-700">
                <button
                    onClick={() => setCurrentTab('chats')}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${currentTab === 'chats'
                            ? 'border-emerald-600 dark:border-emerald-400 text-emerald-600 dark:text-emerald-400'
                            : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                >
                    <div className="flex items-center justify-center gap-2">
                        <MessageSquare size={16} />
                        <span>צ'אטים</span>
                    </div>
                </button>
                <button
                    onClick={() => setCurrentTab('reports')}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${currentTab === 'reports'
                            ? 'border-emerald-600 dark:border-emerald-400 text-emerald-600 dark:text-emerald-400'
                            : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                >
                    <div className="flex items-center justify-center gap-2">
                        <FileText size={16} />
                        <span>דוחות</span>
                    </div>
                </button>
            </div>

            {/* Search Bar with New Chat Button */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 ">


                    {/* Search Input - Hidden by default, shown when searchOpen */}
                    {searchOpen ? (
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="חפש..."
                                className="w-full pr-10 pl-3 py-1.5 text-base border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                dir="rtl"
                                style={{ fontSize: '16px' }}
                                autoFocus
                            />
                            <button
                                onClick={() => {
                                    setSearchOpen(false);
                                    setSearchQuery('');
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-600 rounded transition-colors"
                                aria-label="סגור חיפוש"
                            >
                                <X size={16} className="text-slate-500 dark:text-slate-400" />
                            </button>
                        </div>
                    ) : (
                        /* Search Icon Button - Right side */
                        <button
                            onClick={() => setSearchOpen(true)}
                            className="ml-auto p-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0"
                            aria-label="חפש"
                            title="חפש"
                        >
                            <Search size={18} className="text-slate-600 dark:text-slate-300" />
                        </button>
                    )}

                    {/* New Chat Button - Small Pencil Icon */}
                    <button
                        onClick={handleCreateNewChat}
                        className="p-2.5 text-emerald-600 dark:text-emerald-700 hover:text-emerald-700 dark:hover:text-emerald-600 transition-colors flex-shrink-0"
                        aria-label="צ'אט חדש"
                        title="צ'אט חדש"
                    >
                        <PenSquare size={18} className="text-emerald-600 dark:text-emerald-700 " />
                    </button>
                </div>
            </div>

            {/* Content - Chat History */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {currentTab === 'chats' ? (
                    <div className="p-2">
                        {loading ? (
                            <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                                טוען...
                            </div>
                        ) : sortedChats.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">
                                {searchQuery ? 'לא נמצאו תוצאות' : 'אין צ\'אטים עדיין'}
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {sortedChats.map((chat) => (
                                    <div
                                        key={chat.id}
                                        className={`group relative p-3 rounded-lg cursor-pointer transition-all ${activeChatId === chat.id
                                                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-r-4 border-emerald-500 dark:border-emerald-600 shadow-sm'
                                                : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 border-r-4 border-transparent'
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
                                                    <div className="absolute left-0 top-full mt-1 w-48 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50">
                                                        <button
                                                            onClick={() => handlePinChat(chat.id)}
                                                            className="w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-right transition-colors"
                                                        >
                                                            <Pin size={14} />
                                                            {chat.pinned ? 'בטל הצמדה' : 'הצמד להתחלה'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleEditChat(chat)}
                                                            className="w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-right transition-colors"
                                                        >
                                                            <Edit2 size={14} />
                                                            ערוך שם
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteChat(chat.id)}
                                                            className="w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2 text-right transition-colors"
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
                            <div className="text-center py-8 px-4 space-y-4">
                                <div className="text-slate-400 dark:text-slate-500 text-sm">
                                    {searchQuery ? 'לא נמצאו תוצאות' : (
                                        <>
                                            <p className="mb-3">אין דוחות שמורים</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                                                דוח הוא ניתוח AI של התיק שלך עם המלצות מותאמות אישית
                                            </p>
                                            <button
                                                onClick={() => {
                                                    navigate('/rebalancing#reports');
                                                    if (onToggle) onToggle();
                                                }}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
                                            >
                                                <ExternalLink size={14} />
                                                מעבר ליצירת דוח חדש
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {filteredReports.map((report) => (
                                    <div
                                        key={report.id}
                                        onClick={() => onSelectReport(report)}
                                        className="p-3 rounded-lg cursor-pointer transition-all hover:bg-slate-100 dark:hover:bg-slate-700/50 border-r-4 border-transparent"
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

        </div>
    );
};

export default ChatSidebar;
