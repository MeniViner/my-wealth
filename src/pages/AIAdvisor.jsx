import { useState } from 'react';
import { Sparkles, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ChatSidebar from '../components/ChatSidebar';
import ChatWindow from '../components/ChatWindow';
import Modal from '../components/Modal';
import MarkdownRenderer from '../components/MarkdownRenderer';

/**
 * AI Advisor Page - Full Chat & Report Hub
 * 
 * Features:
 * 1. Interactive Chat: ChatGPT-like interface with chat history
 * 2. Reports Archive: View saved formal reports
 * 
 * Layout:
 * - Minimalist design with Green theme
 * - Center stage chat window
 * - Floating input box
 * - RTL support throughout
 */
const AIAdvisor = ({ assets, totalWealth, user, portfolioContext = "", aiConfig = {} }) => {
  const [activeChatId, setActiveChatId] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleCreateNewChat = (chatId) => {
    setActiveChatId(chatId);
    setSelectedReport(null);
  };

  const handleSelectChat = (chatId) => {
    setActiveChatId(chatId);
    setSelectedReport(null);
  };

  const handleSelectReport = (report) => {
    setSelectedReport(report);
    setShowReportModal(true);
    setActiveChatId(null);
  };

  const handleCloseReportModal = () => {
    setShowReportModal(false);
    setSelectedReport(null);
  };

  const handleSettingsClick = () => {
    navigate('/settings#ai');
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col bg-slate-50 dark:bg-slate-900" dir="rtl">
      {/* Minimalist Header - Glassmorphism Style */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200/50 dark:border-slate-700/50 px-4 md:px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Sparkles className="text-emerald-600 dark:text-emerald-400" size={24} />
          <h2 className="text-base md:text-lg font-medium text-slate-800 dark:text-white">
            יועץ השקעות (AI)
          </h2>
        </div>
      </header>

      {/* Main Content Area - Center Stage */}
      <div className="flex-1 flex gap-0 min-h-0 relative">
        {/* Sidebar - Collapsible */}
        <div className={`${sidebarOpen ? 'fixed lg:relative' : 'relative'} z-50 lg:z-auto h-full`}>
          <ChatSidebar
            user={user}
            activeChatId={activeChatId}
            onSelectChat={handleSelectChat}
            onCreateNewChat={handleCreateNewChat}
            onSelectReport={handleSelectReport}
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
          />
        </div>

        {/* Chat Window - Central, Full Width */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          <ChatWindow
            user={user}
            chatId={activeChatId}
            portfolioContext={portfolioContext}
            aiConfig={aiConfig}
            onCreateNewChat={handleCreateNewChat}
          />
        </div>
      </div>

      {/* Report Modal */}
      <Modal
        isOpen={showReportModal}
        onClose={handleCloseReportModal}
        title={selectedReport?.displayDate || (selectedReport?.date ? new Date(selectedReport.date).toLocaleDateString('he-IL') : 'דוח')}
      >
        {selectedReport && (
          <div className="space-y-4">
            {selectedReport.tag && (
              <div className="mb-4 pb-4 border-b border-slate-200">
                <span className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-sm font-medium border border-emerald-200">
                  {selectedReport.tag}
                </span>
              </div>
            )}
            <div className="prose prose-lg max-w-none">
              <MarkdownRenderer content={selectedReport.content} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AIAdvisor;
