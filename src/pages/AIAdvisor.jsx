import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatSidebar from '../components/ChatSidebar';
import ChatWindow from '../components/ChatWindow';
import { useAiSettings } from '../hooks/useAiSettings';

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
const AIAdvisor = ({ assets, totalWealth, user, portfolioContext = "" }) => {
  const navigate = useNavigate();
  const [activeChatId, setActiveChatId] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);

  // Use shared settings hook
  const { aiConfig, modelConfig } = useAiSettings(user);

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

  const handleOpenSettings = () => {
    navigate('/advisor/settings');
  };

  return (
    <div
      className="h-full w-full flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden"
      dir="rtl"
      style={{ height: '100%' }}
    >
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
            groqConfig={{
              model: modelConfig.model,
              customApiKey: modelConfig.provider === 'gemini' ? modelConfig.geminiApiKey : modelConfig.groqApiKey
            }}
            onCreateNewChat={handleCreateNewChat}
            onToggleHistory={() => setHistoryDrawerOpen(!historyDrawerOpen)}
            historyDrawerOpen={historyDrawerOpen}
            selectedReport={selectedReport}
            onCloseReport={() => setSelectedReport(null)}
            onOpenSettings={handleOpenSettings}
          />
        </div>
      </div>
    </div>
  );
};

export default AIAdvisor;
