import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  showCloseButton?: boolean;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md', showCloseButton = true }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
  };

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEsc);

    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 bg-gray-900 bg-opacity-75 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out"
      onClick={onClose}
    >
      <div 
        className={`bg-gray-800 rounded-lg shadow-xl p-6 m-4 w-full ${sizeClasses[size]} transform scale-95 opacity-0 animate-modalShow`} // Removed transition-all, rely on animate-modalShow
        onClick={(e) => e.stopPropagation()} // Prevent click inside modal from closing it
      >
        <div className="flex items-start justify-between p-4 border-b border-gray-600 rounded-t">
          <h3 className="text-xl font-semibold text-white font-orbitron">{title}</h3>
          {showCloseButton && (
            <button
              onClick={onClose}
              type="button"
              className="text-gray-400 bg-transparent hover:bg-gray-600 hover:text-white rounded-lg text-sm p-1.5 ml-auto inline-flex items-center"
              aria-label="Fermer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div className="p-6 space-y-4">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
