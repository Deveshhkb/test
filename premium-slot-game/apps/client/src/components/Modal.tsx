import type { ReactNode } from 'react';
import { useUiStore } from '../stores/uiStore';
import { IconClose } from './Icons';

export function Modal({ title, children, wide = false, testId }: { title: string; children: ReactNode; wide?: boolean; testId?: string }) {
  const close = useUiStore((s) => s.close);
  return (
    <div className="modal-backdrop" onClick={close} role="presentation">
      <div className={`modal${wide ? ' modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} data-testid={testId} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={close}>
            <IconClose />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
