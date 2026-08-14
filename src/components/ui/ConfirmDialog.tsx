import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  strong?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  strong = false,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            {cancelLabel}
          </button>
          <button
            className={danger ? 'btn-danger' : 'btn-primary'}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex gap-3">
        {danger && (
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-error-100 dark:bg-error-900/30 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-error-600 dark:text-error-400" />
          </div>
        )}
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
          {strong && (
            <p className="mt-2 text-sm font-medium text-error-600 dark:text-error-400">
              This action cannot be undone.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
