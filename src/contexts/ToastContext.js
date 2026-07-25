import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import Toast from '../components/Toast';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toastConfig, setToastConfig] = useState({ message: '', visible: false });
  const timeoutRef = useRef(null);

  const showToast = useCallback((title, message) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    const fullMessage = message ? `${title}: ${message}` : title;
    setToastConfig({ message: fullMessage, visible: true });

    // Fallback if Toast component doesn't auto-hide properly, though it has internal timer
    timeoutRef.current = setTimeout(() => {
      setToastConfig((prev) => ({ ...prev, visible: false }));
    }, 3000);
  }, []);

  const hideToast = useCallback(() => {
    setToastConfig((prev) => ({ ...prev, visible: false }));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toast message={toastConfig.message} visible={toastConfig.visible} onHide={hideToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
