import { X } from 'lucide-react';

/**
 * Modal component for displaying content in an overlay
 */
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-0 md:p-4 backdrop-blur-sm animate-fade-in transition-all duration-300"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 w-full md:w-auto md:max-w-2xl max-h-[90vh] md:max-h-[90svh] overflow-y-auto rounded-t-2xl md:rounded-2xl shadow-2xl animate-slide-up md:animate-scale-in flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag Handle (Mobile only) */}
        <div className="w-full flex justify-center pt-3 pb-1 md:hidden" onClick={onClose}>
          <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full" />
        </div>

        <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 sticky top-0 z-10 rounded-t-2xl">
          <h3 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white truncate pr-2">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-4 md:p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;

