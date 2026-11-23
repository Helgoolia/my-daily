import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './Dialog.css';

/**
 * Confirm dialog — Figma: Dialog (400 wide, centred, scrim). Title = short question, body names the
 * task and what is lost, Confirm repeats the verb. Destructive: Cancel gets the initial focus.
 * Esc and a click on the scrim = Cancel. Focus stays inside while open.
 */
export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel,
  destructive = true,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const returnTo = useRef<Element | null>(null);

  useEffect(() => {
    returnTo.current = document.activeElement;
    cancel.current?.focus();
    const back = returnTo.current;
    return () => (back as HTMLElement | null)?.focus?.();
  }, []);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
    if (e.key === 'Tab') {
      const f = [...(box.current?.querySelectorAll<HTMLElement>('button') ?? [])];
      const i = f.indexOf(document.activeElement as HTMLElement);
      e.preventDefault();
      f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length]?.focus();
    }
  };

  return createPortal(
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div ref={box} className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-body" onKeyDown={onKey}>
        <h2 id="dialog-title" className="t-heading-m dialog-title">{title}</h2>
        <p id="dialog-body" className="t-body-m dialog-body">{body}</p>
        <div className="dialog-actions">
          <button ref={cancel} type="button" className="button button-secondary t-body-m-medium" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className={`button ${destructive ? 'button-destructive' : 'button-primary'} t-body-m-medium`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
