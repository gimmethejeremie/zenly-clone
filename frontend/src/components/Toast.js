import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// Toast Context
const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Toast Item Component
const ToastItem = ({ toast, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, toast.duration || 4000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle size={22} />;
      case 'error':
        return <XCircle size={22} />;
      case 'warning':
        return <AlertTriangle size={22} />;
      default:
        return <Info size={22} />;
    }
  };

  const getColors = () => {
    switch (toast.type) {
      case 'success':
        return {
          bg: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
          iconBg: 'rgba(255,255,255,0.2)'
        };
      case 'error':
        return {
          bg: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
          iconBg: 'rgba(255,255,255,0.2)'
        };
      case 'warning':
        return {
          bg: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
          iconBg: 'rgba(255,255,255,0.2)'
        };
      default:
        return {
          bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          iconBg: 'rgba(255,255,255,0.2)'
        };
    }
  };

  const colors = getColors();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 18px',
        background: colors.bg,
        borderRadius: '12px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        color: 'white',
        minWidth: '280px',
        maxWidth: '400px',
        animation: 'slideIn 0.3s ease-out',
        position: 'relative'
      }}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          backgroundColor: colors.iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        {getIcon()}
      </div>
      
      <div style={{ flex: 1 }}>
        {toast.title && (
          <div style={{ fontWeight: '600', fontSize: '15px', marginBottom: '2px' }}>
            {toast.title}
          </div>
        )}
        <div style={{ fontSize: '14px', opacity: 0.95, lineHeight: 1.4 }}>
          {toast.message}
        </div>
      </div>
      
      <button
        onClick={() => onRemove(toast.id)}
        style={{
          background: 'rgba(255,255,255,0.2)',
          border: 'none',
          borderRadius: '50%',
          width: '28px',
          height: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'white',
          flexShrink: 0,
          transition: 'background 0.2s'
        }}
        onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
        onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
      >
        <X size={16} />
      </button>
    </div>
  );
};

// Toast Provider Component
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', options = {}) => {
    const id = Date.now() + Math.random();
    const toast = {
      id,
      message,
      type,
      title: options.title,
      duration: options.duration || 4000
    };
    setToasts(prev => [...prev, toast]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((message, options = {}) => {
    return addToast(message, 'info', options);
  }, [addToast]);

  toast.success = useCallback((message, options = {}) => {
    return addToast(message, 'success', options);
  }, [addToast]);

  toast.error = useCallback((message, options = {}) => {
    return addToast(message, 'error', options);
  }, [addToast]);

  toast.warning = useCallback((message, options = {}) => {
    return addToast(message, 'warning', options);
  }, [addToast]);

  toast.info = useCallback((message, options = {}) => {
    return addToast(message, 'info', options);
  }, [addToast]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      
      {/* Toast Container */}
      <div
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}
      >
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
