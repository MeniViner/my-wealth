import { X } from 'lucide-react';

/**
 * Modal component for displaying content in an overlay
 */
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" 
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
          <h3 className="text-2xl font-bold text-slate-800">{title}</h3>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-slate-100 rounded-full transition text-slate-500"
          >
            <X size={24} />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;

