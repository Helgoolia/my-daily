import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './Dialog.css';

const FOCUSABLE = 'button:not(:disabled), input:not([type="hidden"]):not(:disabled), [tabindex]:not([tabindex="-1"])';

/**
 * Dialog shell — Figma: Dialog (title, body, slot, actions). Scrim, Esc / scrim click = cancel,
 * focus trapped inside and returned to where it was. `initialFocus` = CSS selector inside the dialog.
 */
export function Dialog({
  title,
  description,
  children,
  actions,
  width = 400,
  initialFocus,
  onCancel,
}: {
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  actions: ReactNode;
  width?: number;
  initialFocus?: string;
  onCancel: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    const first = (initialFocus && box.current?.querySelector<HTMLElement>(initialFocus)) || box.current?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();
    return () => back?.focus?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
    if (e.key === 'Tab') {
      const f = [...(box.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
      const i = f.indexOf(document.activeElement as HTMLElement);
      e.preventDefault();
      f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length]?.focus();
    }
  };
  return createPortal(
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div ref={box} className="dialog" style={{ width }} role="dialog" aria-modal="true" aria-labelledby="dialog-title" onKeyDown={onKey}>
        <h2 id="dialog-title" className="t-heading-m dialog-title">{title}</h2>
        {description && <p className="t-body-m dialog-body">{description}</p>}
        {children && <div className="dialog-slot">{children}</div>}
        <div className="dialog-actions">{actions}</div>
      </div>
    </div>,
    document.body,
  );
}

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
