import { IconDots } from '@tabler/icons-react';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './Menu.css';

export type MenuEntry =
  | { kind: 'item'; label: string; description?: string; icon?: ReactNode; destructive?: boolean; disabled?: boolean; onSelect: () => void }
  | { kind: 'divider' }
  /** Plain text at the bottom of a menu (Body/S, text/secondary), not focusable — e.g. the storage note */
  | { kind: 'note'; text: string };

/**
 * ••• button + menu — Figma: Menu / Menu Item / Menu Divider.
 * Opens under the trigger, left edges aligned, 4 px away (above if there's no room).
 * Portal + position: fixed, so the sidebar's scrolling list can't clip it.
 * Keyboard: focus moves to the first item, ↑↓ move, Enter picks, Esc / click outside closes and
 * returns focus to •••. While open the trigger looks pressed and the row keeps its "menu open" look.
 */
export function MoreMenu({
  label,
  entries,
  size = 'm',
  onOpenChange,
  icon = <IconDots size={16} />,
  align = 'start',
  width,
}: {
  label: string;
  entries: MenuEntry[];
  size?: 's' | 'm';
  onOpenChange?: (open: boolean) => void;
  /** Trigger icon (default •••) */
  icon?: ReactNode;
  /** start: left edges aligned (row menus) · end: right edges aligned (footer buttons at the right) */
  align?: 'start' | 'end';
  width?: number;
}) {
  const [open, setOpenState] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLUListElement>(null);

  const setOpen = (v: boolean) => {
    setOpenState(v);
    onOpenChange?.(v);
  };
  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  };

  useLayoutEffect(() => {
    if (!open || !trigger.current || !menu.current) return;
    const r = trigger.current.getBoundingClientRect();
    const m = menu.current.getBoundingClientRect();
    const below = r.bottom + 4 + m.height <= window.innerHeight - 8;
    setPos({
      top: below ? r.bottom + 4 : r.top - 4 - m.height,
      left: Math.max(8, Math.min(align === 'end' ? r.right - m.width : r.left, window.innerWidth - 8 - m.width)),
    });
    menu.current.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')?.focus();
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!menu.current?.contains(e.target as Node) && !trigger.current?.contains(e.target as Node)) close(false);
    };
    const onScroll = () => close(false);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('resize', onScroll);
    };
  });

  const onKey = (e: React.KeyboardEvent) => {
    const items = [...(menu.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? [])];
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length]?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus(); }
    else if (e.key === 'Tab') close(false);
  };

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={`ghost-icon ${size === 's' ? 'is-small' : ''} more-button ${open ? 'is-pressed' : ''}`}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
      >
        {icon}
      </button>
      {open &&
        createPortal(
          <ul
            ref={menu}
            className="menu is-floating"
            role="menu"
            aria-label={label}
            onKeyDown={onKey}
            style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, width }}
          >
            {entries.map((entry, i) =>
              entry.kind === 'divider' ? (
                <li key={i} role="separator" className="menu-divider" />
              ) : entry.kind === 'note' ? (
                <li key={i} role="none" className="menu-note t-body-s">{entry.text}</li>
              ) : (
                <li key={i} role="none">
                  <button
                    type="button"
                    role="menuitem"
                    className={`menu-item has-icon ${entry.destructive ? 'is-destructive' : ''}`}
                    disabled={entry.disabled}
                    onClick={() => {
                      close(false);
                      entry.onSelect();
                    }}
                  >
                    {entry.icon && <span className="menu-item-icon">{entry.icon}</span>}
                    <span className="menu-item-text">
                      <span className="t-body-m-medium">{entry.label}</span>
                      {entry.description && <span className="t-caption menu-item-description">{entry.description}</span>}
                    </span>
                  </button>
                </li>
              ),
            )}
          </ul>,
          document.body,
        )}
    </>
  );
}
