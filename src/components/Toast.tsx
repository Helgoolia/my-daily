import { IconX } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MASK } from '../lib/clarity';
import './Toast.css';

export type ToastData = {
  id: number;
  message: string;
  undoLabel?: string;
  onUndo?: () => void;
  /** Another action instead of Undo (e.g. "Open" a copied link) — not bound to Ctrl/Cmd+Z */
  actionLabel?: string;
  onAction?: () => void;
  /** No timer, × to close — for something the app did by itself (e.g. stopped the timer) */
  sticky?: boolean;
  closeLabel?: string;
};

/**
 * Toast — Figma: Toast. Bottom centre, 24 px above the edge, inverse colours, one at a time.
 * Hides after 5 s; the timer pauses on hover / keyboard focus. Undo (Button Secondary S) and
 * Ctrl/Cmd+Z do the same while it is visible. role="status", aria-live="polite".
 * Sticky: no timer, a × closes it (Figma: Show close — "Close only when the toast has no timer").
 */
export function Toast({ toast, onClose }: { toast: ToastData | null; onClose: () => void }) {
  const [paused, setPaused] = useState(false);
  const left = useRef(5000);
  const started = useRef(0);

  // A new toast starts its full 5 s, unpaused: the old one may have gone while hovered or focused
  // (Undo clicked), and then no mouseleave/blur ever came — the next toast stayed until hovered.
  const [shownId, setShownId] = useState(toast?.id);
  if (shownId !== toast?.id) {
    setShownId(toast?.id);
    setPaused(false);
  }
  useEffect(() => {
    left.current = 5000;
  }, [toast?.id]);

  useEffect(() => {
    if (!toast || paused || toast.sticky) return;
    started.current = Date.now();
    const id = window.setTimeout(onClose, left.current);
    return () => {
      window.clearTimeout(id);
      left.current -= Date.now() - started.current;
    };
  }, [toast, paused, onClose]);

  useEffect(() => {
    if (!toast?.onUndo) return;
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement).closest('input, textarea');
      // e.code, not e.key: with the Ukrainian layout the Z key gives 'я'. Shift = redo, not ours.
      if (!typing && (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.code === 'KeyZ') {
        e.preventDefault();
        toast.onUndo?.();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [toast, onClose]);

  return createPortal(
    <div className="toast-region" role="status" aria-live="polite">
      {toast && (
        <div
          key={toast.id}
          className="toast"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <span {...MASK} className="t-body-m">{toast.message}</span>
          {toast.onUndo && (
            <button
              type="button"
              className="secondary-button t-body-s-medium"
              onClick={() => {
                toast.onUndo?.();
                onClose();
              }}
            >
              {toast.undoLabel}
            </button>
          )}
          {toast.onAction && (
            <button
              type="button"
              className="secondary-button t-body-s-medium"
              onClick={() => {
                toast.onAction?.();
                onClose();
              }}
            >
              {toast.actionLabel}
            </button>
          )}
          {toast.sticky && (
            <button type="button" className="ghost-icon is-small toast-close" onClick={onClose} aria-label={toast.closeLabel}>
              <IconX size={16} />
            </button>
          )}
        </div>
      )}
    </div>,
    document.body,
  );
}
