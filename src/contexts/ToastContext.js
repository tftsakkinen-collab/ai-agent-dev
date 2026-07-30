import React, { createContext, useContext, useState } from 'react';
import Toast from '../components/Toast';

const ToastContext = createContext({
  showToast: () => {},
});

export function ToastProvider({ children }) {
  const [toast, setToast] = useState({ visible: false, message: '' });

  const showToast = (title, details) => {
    const msg = details ? `${title}: ${details}` : title;
    setToast({ visible: true, message: msg });
  };

  const hideToast = () => {
    setToast({ visible: false, message: '' });
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toast visible={toast.visible} message={toast.message} onHide={hideToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return { showToast: (msg) => alert(msg) };
  }
  return context;
}
