import type { ReactNode } from 'react';

interface ModalProps {
  title: string;
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
  /** Hide the close button (forced-interaction modals like the bonus pick). */
  dismissable?: boolean;
}

/** Shared modal shell used by settings / help / history / bonus. */
export function Modal({ title, open, onClose, children, dismissable = true }: ModalProps) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={dismissable ? onClose : undefined}>
      <div className="modal" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          {dismissable && (
            <button className="icon-btn" onClick={onClose} aria-label="Close">
              ✕
            </button>
          )}
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
