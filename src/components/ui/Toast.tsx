import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  action?: { label: string; onClick: () => void };
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, action?: { label: string; onClick: () => void }) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(
    (message: string, type: ToastType = 'success', action?: { label: string; onClick: () => void }) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, message, type, action }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    },
    [],
  );

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 w-full max-w-md px-4 no-print">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-e3 bg-gray-900 dark:bg-gray-800 text-white animate-slide-up"
          >
            {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-success-400 flex-shrink-0" />}
            {t.type === 'error' && <AlertCircle className="w-5 h-5 text-error-400 flex-shrink-0" />}
            {t.type === 'info' && <Info className="w-5 h-5 text-primary-400 flex-shrink-0" />}
            <p className="flex-1 text-sm">{t.message}</p>
            {t.action && (
              <button
                className="text-sm font-medium text-primary-300 hover:text-primary-200"
                onClick={() => {
                  t.action?.onClick();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
            <button onClick={() => dismiss(t.id)} className="btn-icon -mr-1 text-gray-400 hover:text-white" aria-label="Dismiss">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
