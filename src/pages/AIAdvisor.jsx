import { useState, useEffect } from 'react';
import ChatSidebar from '../components/ChatSidebar';
import ChatWindow from '../components/ChatWindow';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, appId } from '../services/firebase';
import { successToast } from '../utils/alerts';
import { Sparkles, Settings, X, Eye, EyeOff, ChevronDown, HelpCircle } from 'lucide-react';
import { GROQ_MODELS } from '../services/gemini';

/**
 * AI Advisor Page - Mobile-First Chat Layout
 * 
 * Layout Architecture:
 * - Container: 100dvh (handles mobile address bars)
 * - Desktop: Split screen (Sidebar 25% | Main 75%)
 * - Mobile: Single column (Conversation only), History as Off-Canvas Drawer
 * 
 * Z-Index Management:
 * - Main App Nav: z-50 (highest)
 * - Chat History Drawer: z-40
 * - Chat Overlay: z-30
 * - Chat Content: z-10
 */
const AIAdvisor = ({ assets, totalWealth, user, portfolioContext = "", aiConfig: initialAiConfig = {} }) => {
  const [activeChatId, setActiveChatId] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [aiConfig, setAiConfig] = useState({
    historyLimit: 10,
    contextEnabled: true
  });
  const [groqConfig, setGroqConfig] = useState({
    model: 'llama-3.3-70b-versatile',
    customApiKey: ''
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiKeyHelp, setShowApiKeyHelp] = useState(false);

  const handleCreateNewChat = (chatId) => {
    setActiveChatId(chatId);
    setSelectedReport(null);
    // Close drawer on mobile after creating new chat
    setHistoryDrawerOpen(false);
  };

  const handleSelectChat = (chatId) => {
    setActiveChatId(chatId);
    setSelectedReport(null);
    // Close drawer on mobile after selecting chat
    setHistoryDrawerOpen(false);
  };

  const handleSelectReport = (report) => {
    setSelectedReport(report);
    setActiveChatId(null);
    // Close drawer on mobile
    setHistoryDrawerOpen(false);
  };

  // Load AI Config from Firestore
  useEffect(() => {
    if (!user || !db) return;

    const aiConfigRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'aiConfig');

    const loadAiConfig = async () => {
      try {
        const docSnap = await getDoc(aiConfigRef);
        if (docSnap.exists()) {
          setAiConfig(docSnap.data());
        } else {
          // Create default config
          const defaultConfig = { historyLimit: 10, contextEnabled: true };
          await setDoc(aiConfigRef, defaultConfig);
          setAiConfig(defaultConfig);
        }
      } catch (error) {
        console.error('Error loading AI config:', error);
      }
    };

    loadAiConfig();

    // Listen for changes
    const unsubscribe = onSnapshot(aiConfigRef, (snapshot) => {
      if (snapshot.exists()) {
        setAiConfig(snapshot.data());
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Save AI Config to Firestore
  const saveAiConfig = async (newConfig) => {
    if (!user || !db) return;
    try {
      const aiConfigRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'aiConfig');
      await setDoc(aiConfigRef, newConfig);
      await successToast('ההגדרות נשמרו', 1500);
    } catch (error) {
      console.error('Error saving AI config:', error);
      await successToast('שגיאה בשמירת ההגדרות', 2000);
    }
  };

  // Load Groq Config from Firestore
  useEffect(() => {
    if (!user || !db) return;

    const groqConfigRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'groqConfig');

    const loadGroqConfig = async () => {
      try {
        const docSnap = await getDoc(groqConfigRef);
        if (docSnap.exists()) {
          setGroqConfig(docSnap.data());
        } else {
          // Create default config
          const defaultConfig = { model: 'llama-3.3-70b-versatile', customApiKey: '' };
          await setDoc(groqConfigRef, defaultConfig);
          setGroqConfig(defaultConfig);
        }
      } catch (error) {
        console.error('Error loading Groq config:', error);
      }
    };

    loadGroqConfig();

    // Listen for changes
    const unsubscribe = onSnapshot(groqConfigRef, (snapshot) => {
      if (snapshot.exists()) {
        setGroqConfig(snapshot.data());
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Save Groq Config to Firestore
  const saveGroqConfig = async (newConfig) => {
    if (!user || !db) return;
    try {
      const groqConfigRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'groqConfig');
      await setDoc(groqConfigRef, newConfig);
      await successToast('הגדרות Groq נשמרו', 1500);
    } catch (error) {
      console.error('Error saving Groq config:', error);
      await successToast('שגיאה בשמירת הגדרות Groq', 2000);
    }
  };

  return (
    <div
      className="h-full w-full flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden"
      dir="rtl"
      style={{ height: '100%' }}
    >
      {/* Settings Panel Overlay */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setShowSettings(false)}>
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full max-h-[90svh] md:max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sparkles size={18} className="text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-base font-semibold text-slate-700 dark:text-slate-100">הגדרות יועץ AI</h3>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* History Limit Slider */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-100">
                      זיכרון צ'אט (הודעות)
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5">
                      מספר ההודעות האחרונות שנשלחות ל-AI (Context Window)
                    </p>
                  </div>
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {aiConfig.historyLimit}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={aiConfig.historyLimit}
                  onChange={(e) => {
                    const newValue = parseInt(e.target.value);
                    const newConfig = { ...aiConfig, historyLimit: newValue };
                    setAiConfig(newConfig);
                    saveAiConfig(newConfig);
                  }}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
                <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500 mt-1">
                  <span>1</span>
                  <span>20</span>
                </div>
              </div>

              {/* Groq Configuration Section */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={16} className="text-emerald-600 dark:text-emerald-400" />
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-100">הגדרות Groq AI</h4>
                </div>

                {/* Model Selector */}
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-100 block mb-2">
                    בחירת מודל AI
                  </label>
                  <div className="relative">
                    <select
                      value={groqConfig.model}
                      onChange={(e) => {
                        const newConfig = { ...groqConfig, model: e.target.value };
                        setGroqConfig(newConfig);
                        saveGroqConfig(newConfig);
                      }}
                      className="w-full px-4 py-2.5 pr-10 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer"
                    >
                      {Object.entries(GROQ_MODELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                    מודל ברירת מחדל: Llama 3.3 70B
                  </p>
                </div>

                {/* Custom API Key */}
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-100 block mb-2">
                    מפתח API מותאם אישית (אופציונלי)
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? "text" : "password"}
                      value={groqConfig.customApiKey}
                      onChange={(e) => {
                        const newConfig = { ...groqConfig, customApiKey: e.target.value };
                        setGroqConfig(newConfig);
                      }}
                      onBlur={() => saveGroqConfig(groqConfig)}
                      placeholder="הכנס מפתח Groq API..."
                      className="w-full px-4 py-2.5 pr-10 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                    אם ריק, נשתמש במפתח ברירת המחדל מההגדרות
                  </p>
                </div>

                {/* API Key Help Guide */}
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
                  <button
                    type="button"
                    onClick={() => setShowApiKeyHelp(!showApiKeyHelp)}
                    className="w-full flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-200"
                  >
                    <div className="flex items-center gap-2">
                      <HelpCircle size={16} className="text-emerald-600 dark:text-emerald-400" />
                      <span>איך להשיג מפתח API?</span>
                    </div>
                    <ChevronDown
                      size={16}
                      className={`text-slate-400 transition-transform ${showApiKeyHelp ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {showApiKeyHelp && (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600 space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      <p className="font-medium">שלבים לקבלת מפתח API של Groq:</p>
                      <ol className="list-decimal list-inside space-y-1 mr-2">
                        <li>כנס ל-<a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 underline">console.groq.com/keys</a></li>
                        <li>התחבר או הירשם לחשבון Groq (חינם)</li>
                        <li>לחץ על "Create API Key" (צור מפתח)</li>
                        <li>תן שם למפתח (לדוגמה: "MyWealth App")</li>
                        <li>העתק את המפתח שנוצר</li>
                        <li>הדבק אותו בשדה למעלה</li>
                      </ol>
                      <p className="text-amber-600 dark:text-amber-400 mt-2">
                        ⚠️ אל תשתף את המפתח עם אחרים!
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* החלף הפעלת הקשר */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-100">
                    כלול נתוני תיק השקעות
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5">
                    כאשר מופעל, נתוני התיק נשלחים אוטומטית ל-AI כהקשר
                  </p>
                </div>
                <button
                  onClick={() => {
                    const newConfig = { ...aiConfig, contextEnabled: !aiConfig.contextEnabled };
                    setAiConfig(newConfig);
                    saveAiConfig(newConfig);
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${aiConfig.contextEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  role="switch"
                  aria-checked={aiConfig.contextEnabled}
                  aria-label="כלול נתוני תיק השקעות"
                >
                  <span
                    className={`absolute h-4 w-4 rounded-full bg-white transition-all ${aiConfig.contextEnabled ? 'left-1' : 'right-1'
                      }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area - Desktop: Split, Mobile: Single Column */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Desktop Sidebar - Always visible on desktop */}
        <div className="hidden lg:flex lg:w-1/4 flex-shrink-0 border-l border-slate-200 dark:border-slate-700">
          <ChatSidebar
            user={user}
            activeChatId={activeChatId}
            onSelectChat={handleSelectChat}
            onCreateNewChat={handleCreateNewChat}
            onSelectReport={handleSelectReport}
            isOpen={true}
            onToggle={() => { }}
          />
        </div>

        {/* Mobile History Drawer - Off-Canvas Overlay */}
        {historyDrawerOpen && (
          <>
            {/* Overlay - Below Main Nav (z-50) but above Chat Content */}
            <div
              className="lg:hidden fixed inset-0 bg-black/50 z-[35]"
              onClick={() => setHistoryDrawerOpen(false)}
            />
            {/* Drawer - Below Main Nav (z-50) but above Overlay */}
            <div className="lg:hidden fixed right-0 top-0 h-[100svh] w-[80%] max-w-sm z-[40]">
              <ChatSidebar
                user={user}
                activeChatId={activeChatId}
                onSelectChat={handleSelectChat}
                onCreateNewChat={handleCreateNewChat}
                onSelectReport={handleSelectReport}
                isOpen={true}
                onToggle={() => setHistoryDrawerOpen(false)}
              />
            </div>
          </>
        )}

        {/* Chat Window - Main Area */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          <ChatWindow
            user={user}
            chatId={activeChatId}
            portfolioContext={portfolioContext}
            aiConfig={aiConfig}
            groqConfig={groqConfig}
            onCreateNewChat={handleCreateNewChat}
            onToggleHistory={() => setHistoryDrawerOpen(!historyDrawerOpen)}
            historyDrawerOpen={historyDrawerOpen}
            selectedReport={selectedReport}
            onCloseReport={() => setSelectedReport(null)}
            onOpenSettings={() => setShowSettings(true)}
          />
        </div>
      </div>
    </div>
  );
};

export default AIAdvisor;
