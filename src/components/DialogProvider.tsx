'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface DialogState {
  title?: string;
  message: string;
  type: 'confirm' | 'alert' | 'error' | 'warning';
  confirmLabel?: string;
  cancelLabel?: string;
  resolve: (value: any) => void;
}

interface DialogContextType {
  confirm: (message: string, options?: { title?: string; type?: 'confirm' | 'warning' | 'error'; confirmLabel?: string; cancelLabel?: string }) => Promise<boolean>;
  alert: (message: string, options?: { title?: string; type?: 'alert' | 'error' | 'warning'; confirmLabel?: string }) => Promise<void>;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const confirm = (
    message: string,
    options?: { title?: string; type?: 'confirm' | 'warning' | 'error'; confirmLabel?: string; cancelLabel?: string }
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialog({
        message,
        title: options?.title || 'Confirmação',
        type: options?.type || 'confirm',
        confirmLabel: options?.confirmLabel || 'Confirmar',
        cancelLabel: options?.cancelLabel || 'Cancelar',
        resolve,
      });
    });
  };

  const alert = (
    message: string,
    options?: { title?: string; type?: 'alert' | 'error' | 'warning'; confirmLabel?: string }
  ): Promise<void> => {
    return new Promise((resolve) => {
      setDialog({
        message,
        title: options?.title || 'Aviso',
        type: options?.type || 'alert',
        confirmLabel: options?.confirmLabel || 'OK',
        resolve: () => {
          resolve();
        },
      });
    });
  };

  const handleConfirm = () => {
    if (dialog) {
      dialog.resolve(dialog.type === 'confirm' || dialog.type === 'warning' || dialog.type === 'error' ? true : undefined);
      setDialog(null);
    }
  };

  const handleCancel = () => {
    if (dialog) {
      dialog.resolve(false);
      setDialog(null);
    }
  };

  // Get icon and colors based on type
  const getIconAndColor = () => {
    if (!dialog) return { icon: 'info', iconClass: 'text-secondary', btnClass: 'bg-secondary text-on-secondary' };
    switch (dialog.type) {
      case 'error':
        return {
          icon: 'error',
          iconClass: 'text-error',
          btnClass: 'bg-error text-on-error hover:opacity-90 active:scale-95',
        };
      case 'warning':
        return {
          icon: 'warning',
          iconClass: 'text-orange-500',
          btnClass: 'bg-orange-500 text-white hover:bg-orange-600 active:scale-95',
        };
      case 'confirm':
        return {
          icon: 'help',
          iconClass: 'text-secondary',
          btnClass: 'bg-secondary text-on-secondary hover:opacity-90 active:scale-95',
        };
      default:
        return {
          icon: 'info',
          iconClass: 'text-secondary',
          btnClass: 'bg-secondary text-on-secondary hover:opacity-90 active:scale-95',
        };
    }
  };

  const { icon, iconClass, btnClass } = getIconAndColor();

  return (
    <DialogContext.Provider value={{ confirm, alert }}>
      {children}
      {mounted && dialog && createPortal(
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-[200] flex items-center justify-center p-md animate-fade-in select-none">
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-2xl w-full max-w-[400px] p-lg space-y-md transform scale-100 transition-all">
            <h3 className={`text-headline-sm font-bold flex items-center gap-xs whitespace-normal ${iconClass}`}>
              <span className="material-symbols-outlined">{icon}</span>
              {dialog.title}
            </h3>
            
            <p className="text-body-sm text-on-surface-variant whitespace-normal leading-relaxed">
              {dialog.message}
            </p>
            
            <div className="flex justify-end gap-sm pt-sm border-t border-outline-variant/20">
              {(dialog.type === 'confirm' || dialog.type === 'warning' || dialog.type === 'error') && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-md py-base hover:bg-surface-container-low rounded-lg text-xs font-bold text-on-surface-variant cursor-pointer transition-colors"
                >
                  {dialog.cancelLabel}
                </button>
              )}
              <button
                type="button"
                onClick={handleConfirm}
                className={`px-md py-base rounded-lg text-xs font-bold cursor-pointer transition-all shadow-sm ${btnClass}`}
              >
                {dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </DialogContext.Provider>
  );
}
