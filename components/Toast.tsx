import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { Toast as ToastType, toastService } from '../services/toast';

const Toast: React.FC<{ toast: ToastType }> = ({ toast }) => {
  const getColors = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-purple-100 border-purple-300 text-purple-900';
      case 'error':
        return 'bg-purple-900 border-purple-800 text-white';
      case 'warning':
        return 'bg-purple-500 border-purple-600 text-white';
      case 'info':
      default:
        return 'bg-purple-50 border-purple-200 text-purple-800';
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 flex-shrink-0" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 flex-shrink-0" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 flex-shrink-0" />;
    }
  };

  return (
    <div className={`${getColors()} border rounded-lg p-4 flex items-start gap-3 animate-in slide-in-from-right duration-300 shadow-lg`}>
      <div className="mt-0.5">{getIcon()}</div>
      <div className="flex-1">
        <p className="font-medium text-sm">{toast.message}</p>
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="text-xs font-semibold mt-2 underline hover:no-underline"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        onClick={() => toastService.dismiss(toast.id)}
        className="text-current opacity-70 hover:opacity-100 transition"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastType[]>([]);

  useEffect(() => {
    return toastService.subscribe(setToasts);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-[9999] space-y-2 max-w-md pointer-events-none">
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast toast={toast} />
        </div>
      ))}
    </div>
  );
};
