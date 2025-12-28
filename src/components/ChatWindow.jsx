import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, getDoc } from 'firebase/firestore';
import { Send, Loader2, Sparkles, AlertCircle, X } from 'lucide-react';
import { db, appId } from '../services/firebase';
import { callGeminiAIWithHistory } from '../services/gemini';
import MarkdownRenderer from './MarkdownRenderer';

/**
 * ChatWindow Component
 * Interactive chat interface with message bubbles
 * Minimalist design with Green theme
 * Supports RTL layout with user messages on right (emerald) and AI on left (white)
 */
const ChatWindow = ({ 
  user, 
  chatId, 
  portfolioContext = "",
  aiConfig = {},
  onCreateNewChat
}) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Fetch messages from Firestore
  useEffect(() => {
    if (!chatId || !user || !db) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(
        db, 
        'artifacts', 
        appId, 
        'users', 
        user.uid, 
        'chats', 
        chatId, 
        'messages'
      ),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(messagesData);
    }, (error) => {
      console.error('Error fetching messages:', error);
      setError('שגיאה בטעינת ההודעות');
    });

    return () => unsubscribe();
  }, [chatId, user]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat changes
  useEffect(() => {
    if (chatId) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [chatId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!inputValue.trim() || loading) return;

    // If no chat exists, create a new one first
    let currentChatId = chatId;
    if (!currentChatId && onCreateNewChat) {
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
        currentChatId = newChatRef.id;
        onCreateNewChat(currentChatId);
      } catch (error) {
        console.error('Error creating new chat:', error);
        setError('שגיאה ביצירת צ\'אט חדש');
        return;
      }
    }

    if (!currentChatId) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setError(null);

    // Add user message to Firestore
    let userMessageRef;
    try {
      userMessageRef = await addDoc(
        collection(
          db, 
          'artifacts', 
          appId, 
          'users', 
          user.uid, 
          'chats', 
          currentChatId, 
          'messages'
        ),
        {
          role: 'user',
          content: userMessage,
          timestamp: serverTimestamp()
        }
      );
    } catch (error) {
      console.error('Error saving user message:', error);
      setError('שגיאה בשמירת ההודעה');
      return;
    }

    setLoading(true);

    try {
      // Build message history for AI (excluding system message, it will be added in callGeminiAIWithHistory)
      const messageHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Add the new user message to history
      messageHistory.push({
        role: 'user',
        content: userMessage
      });

      // Apply history limit from user settings (default to 10)
      const historyLimit = aiConfig?.historyLimit || 10;
      const limitedHistory = messageHistory.slice(-historyLimit);

      // Only include portfolio context if enabled (default to true)
      const contextEnabled = aiConfig?.contextEnabled !== false;
      const finalContext = contextEnabled ? portfolioContext : "";

      // Call AI with history and portfolio context
      const aiResponse = await callGeminiAIWithHistory(limitedHistory, finalContext);

      // Check if response contains error
      if (aiResponse && aiResponse.includes('שגיאה')) {
        throw new Error(aiResponse);
      }

      // Add AI response to Firestore
      await addDoc(
        collection(
          db, 
          'artifacts', 
          appId, 
          'users', 
          user.uid, 
          'chats', 
          currentChatId, 
          'messages'
        ),
        {
          role: 'assistant',
          content: aiResponse,
          timestamp: serverTimestamp()
        }
      );

      // Update chat metadata with last message preview
      const chatRef = doc(
        db, 
        'artifacts', 
        appId, 
        'users', 
        user.uid, 
        'chats', 
        currentChatId
      );
      
      // Generate title from first message if title is still default
      const chatDoc = await getDoc(chatRef);
      const chatData = chatDoc.data();
      
      let updateData = {
        updatedAt: serverTimestamp(),
        lastMessagePreview: userMessage.length > 50 ? userMessage.substring(0, 50) + '...' : userMessage
      };

      // If title is still default, update it based on first message
      if (chatData?.title === 'שיחה חדשה' && messages.length === 0) {
        updateData.title = userMessage.length > 30 
          ? userMessage.substring(0, 30) + '...' 
          : userMessage;
      }

      await updateDoc(chatRef, updateData);

    } catch (error) {
      console.error('Error getting AI response:', error);
      setError(error.message || 'אירעה שגיאה בקבלת תשובה מה-AI');
      
      // Add error message to chat
      if (currentChatId) {
        await addDoc(
          collection(
            db, 
            'artifacts', 
            appId, 
            'users', 
            user.uid, 
            'chats', 
            currentChatId, 
            'messages'
          ),
          {
            role: 'assistant',
            content: `שגיאה: ${error.message || 'לא ניתן לקבל תשובה מה-AI כרגע. אנא נסה שוב.'}`,
            timestamp: serverTimestamp(),
            isError: true
          }
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  // Auto-resize textarea
  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  // Generate smart suggestions based on chat context
  const generateSuggestions = useCallback(() => {
    if (!chatId || messages.length === 0) {
      // Default suggestions for new chat
      return [
        'מה רמת הסיכון של התיק שלי?',
        'איך אני יכול לשפר את הפיזור שלי?',
        'מה ההמלצות שלך לאיזון התיק?'
      ];
    }

    // Extract keywords from conversation
    const allText = messages.map(m => m.content).join(' ').toLowerCase();
    
    // Smart suggestions based on context
    const contextSuggestions = [];
    
    if (allText.includes('סיכון') || allText.includes('risk')) {
      contextSuggestions.push('איך אני יכול להפחית את רמת הסיכון?');
      contextSuggestions.push('מה ההשקעות הכי בטוחות בתיק שלי?');
    } else if (allText.includes('פיזור') || allText.includes('diversif')) {
      contextSuggestions.push('איך אני יכול לשפר את הפיזור?');
      contextSuggestions.push('מה הקטגוריות שחסרות בתיק שלי?');
    } else if (allText.includes('איזון') || allText.includes('rebalanc')) {
      contextSuggestions.push('מתי כדאי לבצע איזון מחדש?');
      contextSuggestions.push('איך אני יכול לאזן את התיק?');
    } else if (allText.includes('תשואה') || allText.includes('return')) {
      contextSuggestions.push('מה התשואה הצפויה של התיק?');
      contextSuggestions.push('איך אני יכול לשפר את התשואה?');
    } else {
      contextSuggestions.push('תן לי המלצות ספציפיות לתיק שלי');
      contextSuggestions.push('מה הדברים החשובים ביותר שאני צריך לדעת?');
    }
    
    // Fill with default suggestions if needed
    const defaultSuggestions = [
      'מה רמת הסיכון של התיק שלי?',
      'איך אני יכול לשפר את הפיזור?',
      'מה ההמלצות שלך לאיזון התיק?',
      'תן לי ניתוח מעמיק של התיק',
      'מה ההשקעות הכי טובות בתיק שלי?'
    ];
    
    // Combine and return 3 unique suggestions
    const allSuggestions = [...contextSuggestions, ...defaultSuggestions];
    const uniqueSuggestions = [...new Set(allSuggestions)];
    return uniqueSuggestions.slice(0, 3);
  }, [chatId, messages]);

  // Update suggestions when messages change
  useEffect(() => {
    if (chatId && messages.length > 0) {
      // Only show suggestions after AI response
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant' && !lastMessage.isError) {
        setSuggestions(generateSuggestions());
      } else {
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
    }
  }, [messages, chatId, generateSuggestions]);

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion);
    // Focus the input
    setTimeout(() => {
      inputRef.current?.focus();
      // Auto-resize
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
        inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
      }
    }, 100);
  };

  // Show input box even when no chat is selected
  const showInput = true;

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900 relative" dir="rtl">
      {/* Context Indicator - Minimalist */}
      {portfolioContext && aiConfig?.contextEnabled !== false && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-full flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 shadow-sm">
          <Sparkles size={12} />
          <span className="font-medium">הקשר תיק השקעות פעיל</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 max-w-2xl w-full mx-4">
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl flex items-start gap-3 shadow-lg">
            <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-sm">שגיאה</p>
              <p className="text-xs mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600 flex-shrink-0"
              aria-label="סגור הודעת שגיאה"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Messages Area - Centered Column */}
      {chatId ? (
        <div className="flex-1 overflow-y-auto pb-4">
          <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-5 py-4 ${
                    message.role === 'user'
                      ? 'bg-emerald-50 dark:bg-emerald-900/30 text-slate-800 dark:text-slate-100'
                      : message.isError
                      ? 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none leading-relaxed text-slate-700">
                      <MarkdownRenderer content={message.content} />
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap break-words leading-relaxed text-[15px] text-slate-800 dark:text-slate-100">{message.content}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-slate-800 rounded-2xl px-5 py-4 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Loader2 size={16} className="animate-spin text-emerald-600 dark:text-emerald-400" />
                    <span className="text-sm">מחשב תשובה...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />

            {/* Smart Suggestions */}
            {suggestions.length > 0 && (
              <div className="pt-4 pb-2">
                <div className="flex flex-wrap gap-2 justify-end">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="px-4 py-2 text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:border-emerald-300 dark:hover:border-emerald-700 hover:text-emerald-700 dark:hover:text-emerald-400 transition-all cursor-pointer"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Area - Inside chat, compact */}
            <form onSubmit={handleSendMessage} className="pt-2">
              <div className="flex items-end gap-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all focus-within:border-emerald-500 dark:focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-500/20">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  className="flex-1 px-4 py-2.5 rounded-2xl border-0 focus:outline-none resize-none overflow-y-auto bg-transparent text-sm leading-relaxed text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  rows={1}
                  dir="rtl"
                  disabled={loading}
                  style={{ maxHeight: '120px' }}
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || loading}
                  className="m-1.5 bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700 transition flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                  title="שלח"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        /* Centered Input Box when no chat selected */
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-3xl">
            <form onSubmit={handleSendMessage} className="relative">
              <div className="flex items-end gap-2 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl transition-all focus-within:border-emerald-500 dark:focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/20">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder="שאל שאלה על תיק ההשקעות שלך..."
                  className="flex-1 px-4 md:px-5 py-3 md:py-4 rounded-3xl border-0 focus:outline-none resize-none overflow-y-auto bg-transparent text-[15px] leading-relaxed text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  rows={1}
                  dir="rtl"
                  disabled={loading}
                  style={{ maxHeight: '200px' }}
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || loading}
                  className="m-2 mb-2.5 bg-emerald-600 dark:bg-emerald-700 text-white p-2.5 rounded-xl hover:bg-emerald-700 dark:hover:bg-emerald-600 transition flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                  title="שלח"
                >
                  {loading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWindow;

