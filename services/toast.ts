// Toast notification service
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number; // milliseconds, 0 = no auto-dismiss
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Global toast queue
let toastQueue: Toast[] = [];
let toastListeners: ((toasts: Toast[]) => void)[] = [];

const generateId = () => Math.random().toString(36).substr(2, 9);

export const toastService = {
  // Subscribe to toast updates
  subscribe: (listener: (toasts: Toast[]) => void) => {
    toastListeners.push(listener);
    // Return unsubscribe function
    return () => {
      toastListeners = toastListeners.filter(l => l !== listener);
    };
  },

  // Get current toasts
  getToasts: () => toastQueue,

  // Show toast
  show: (message: string, type: ToastType = 'info', duration: number = 3000) => {
    const id = generateId();
    const toast: Toast = { id, message, type, duration };
    
    toastQueue = [...toastQueue, toast];
    toastListeners.forEach(listener => listener(toastQueue));

    // Auto-dismiss if duration is set
    if (duration > 0) {
      setTimeout(() => {
        toastService.dismiss(id);
      }, duration);
    }

    return id;
  },

  // Show success toast
  success: (message: string, duration?: number) => {
    return toastService.show(message, 'success', duration ?? 3000);
  },

  // Show error toast
  error: (message: string, duration?: number) => {
    return toastService.show(message, 'error', duration ?? 4000);
  },

  // Show warning toast
  warning: (message: string, duration?: number) => {
    return toastService.show(message, 'warning', duration ?? 3500);
  },

  // Show info toast
  info: (message: string, duration?: number) => {
    return toastService.show(message, 'info', duration ?? 3000);
  },

  // Dismiss a specific toast
  dismiss: (id: string) => {
    toastQueue = toastQueue.filter(t => t.id !== id);
    toastListeners.forEach(listener => listener(toastQueue));
  },

  // Dismiss all toasts
  dismissAll: () => {
    toastQueue = [];
    toastListeners.forEach(listener => listener(toastQueue));
  }
};
