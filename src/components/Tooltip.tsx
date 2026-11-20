import { cloneElement, useRef, useState, type ReactElement } from 'react';
import { createPortal } from 'react-dom';
import './Tooltip.css';

type Placement = 'right-of-row' | 'right' | 'below' | 'above';

/**
 * Tooltip — Figma: Components / Tooltip. Inverse colours, hugs the text (max 360), 8 px from the
 * trigger, never leaves the window (8 px from edges). Rendered in a portal with position: fixed so
 * no overflow can clip it. Replaces the browser's native title tooltip everywhere.
 *
 * Appears after ~500 ms of hover (Figma rule) or at once on keyboard focus.
 * `onlyIfTruncated`: show only when the trigger's text is cut with "…" (full task name).
 */
export function Tooltip({
  label,
  placement = 'above',
  onlyIfTruncated = false,
  children,
}: {
  label: string;
  placement?: Placement;
  onlyIfTruncated?: boolean;
  children: ReactElement<Record<string, unknown>>;
}) {
  const [pos, setPos] = useState<{ left: number; top: number; transform: string } | null>(null);

  const show = (el: HTMLElement) => {
    if (onlyIfTruncated && el.scrollWidth <= el.clientWidth) return;
    const r = el.getBoundingClientRect();
    if (placement === 'right') {
      setPos({ left: r.right + 8, top: r.top + r.height / 2, transform: 'translateY(-50%)' });
      return;
    }
    if (placement === 'below-start') {
      // Left edges aligned with the trigger, whatever the label length (e.g. at the window edge)
      setPos({ left: Math.max(8, r.left), top: r.bottom + 8, transform: 'none' });
      return;
    }
    if (placement === 'right-of-row') {
      const row = el.closest('.task-item')?.getBoundingClientRect() ?? r;
      setPos({ left: row.right + 8, top: r.top + r.height / 2, transform: 'translateY(-50%)' });
      return;
    }
    const below = placement === 'below' || r.top < 48; // flip down when there is no room above
    const left = Math.min(Math.max(r.left + r.width / 2, 8 + 60), window.innerWidth - 8 - 60);
    setPos(below
      ? { left, top: r.bottom + 8, transform: 'translateX(-50%)' }
      : { left, top: r.top - 8, transform: 'translate(-50%, -100%)' });
  };
  const delayRef = useRef<number | undefined>(undefined);
  const showLater = (el: HTMLElement) => {
    window.clearTimeout(delayRef.current);
    delayRef.current = window.setTimeout(() => show(el), 500);
  };
  const hide = () => {
    window.clearTimeout(delayRef.current);
    setPos(null);
  };

  const props = children.props as Record<string, ((e: React.SyntheticEvent<HTMLElement>) => void) | undefined>;
  const trigger = cloneElement(children, {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => { props.onMouseEnter?.(e); showLater(e.currentTarget); },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => { props.onMouseLeave?.(e); hide(); },
    onFocus: (e: React.FocusEvent<HTMLElement>) => { props.onFocus?.(e); if (e.currentTarget.matches(':focus-visible')) show(e.currentTarget); },
    onBlur: (e: React.FocusEvent<HTMLElement>) => { props.onBlur?.(e); hide(); },
    onClick: (e: React.MouseEvent<HTMLElement>) => { props.onClick?.(e); hide(); },
  });

  return (
    <>
      {trigger}
      {pos &&
        createPortal(
          <div className="tooltip t-body-s" role="tooltip" style={{ left: pos.left, top: pos.top, transform: pos.transform }}>
            {label}
          </div>,
          document.body,
        )}
    </>
  );
}
