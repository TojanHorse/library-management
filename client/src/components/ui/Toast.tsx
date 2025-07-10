import React, { createContext, useContext, useState, ReactNode } from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  toast: {
    success: (title: string, description?: string) => void;
    error: (title: string, description?: string) => void;
    warning: (title: string, description?: string) => void;
    info: (title: string, description?: string) => void;
  };
  confirm: (title: string, description?: string) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    description?: string;
    resolve: (value: boolean) => void;
  } | null>(null);

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);

    // Auto remove after duration
    setTimeout(() => {
      removeToast(id);
    }, toast.duration || 5000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const toast = {
    success: (title: string, description?: string) => addToast({ type: 'success', title, description }),
    error: (title: string, description?: string) => addToast({ type: 'error', title, description }),
    warning: (title: string, description?: string) => addToast({ type: 'warning', title, description }),
    info: (title: string, description?: string) => addToast({ type: 'info', title, description }),
  };

  const confirm = (title: string, description?: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmDialog({ title, description, resolve });
    });
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, toast, confirm }}>
      {children}
      <ToastPrimitive.Provider>
        {toasts.map((toast) => (
          <ToastComponent key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
        <ToastPrimitive.Viewport className="fixed top-0 right-0 p-4 w-full max-w-sm z-50 flex flex-col gap-2" />
      </ToastPrimitive.Provider>
      
      {/* Confirmation Dialog */}
      <Modal
        isOpen={!!confirmDialog}
        onClose={() => {
          if (confirmDialog) {
            confirmDialog.resolve(false);
            setConfirmDialog(null);
          }
        }}
        title={confirmDialog?.title || ''}
      >
        {confirmDialog && (
          <div className="space-y-4">
            {confirmDialog.description && (
              <p className="text-gray-600 dark:text-gray-400">{confirmDialog.description}</p>
            )}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  confirmDialog.resolve(false);
                  setConfirmDialog(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  confirmDialog.resolve(true);
                  setConfirmDialog(null);
                }}
              >
                Confirm
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </ToastContext.Provider>
  );
}

function ToastComponent({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return null;
    }
  };

  const getBorderColor = () => {
    switch (toast.type) {
      case 'success':
        return 'border-green-500';
      case 'error':
        return 'border-red-500';
      case 'warning':
        return 'border-yellow-500';
      case 'info':
        return 'border-blue-500';
      default:
        return 'border-gray-300';
    }
  };

  return (
    <ToastPrimitive.Root className={`
      bg-white dark:bg-gray-800 border-l-4 ${getBorderColor()} rounded-lg shadow-lg p-4 
      data-[state=open]:animate-in data-[state=closed]:animate-out 
      data-[state=closed]:fade-out-80 data-[state=open]:fade-in-0
      data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-right-full
      data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]
      data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-transform
      data-[swipe=end]:animate-out data-[swipe=end]:slide-out-to-right-full
      group relative pointer-events-auto
    `}>
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1 min-w-0">
          <ToastPrimitive.Title className="text-sm font-medium text-gray-900 dark:text-white">
            {toast.title}
          </ToastPrimitive.Title>
          {toast.description && (
            <ToastPrimitive.Description className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {toast.description}
            </ToastPrimitive.Description>
          )}
        </div>
        <ToastPrimitive.Close
          className="opacity-70 hover:opacity-100 transition-opacity"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </ToastPrimitive.Close>
      </div>
    </ToastPrimitive.Root>
  );
}
