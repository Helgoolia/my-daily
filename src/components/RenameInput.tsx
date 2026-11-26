import { useLayoutEffect, useRef, useState } from 'react';
import { MASK } from '../lib/clarity';
import { createPortal } from 'react-dom';

/**
 * Inline rename — Figma: Task Cell / Sidebar Task Item, State=Editing (Input Text S).
 * Enter saves, Esc cancels, leaving the field saves too. A taken name shows the error tooltip
 * as soon as it's typed (no need to press Enter); while it shows, Enter does nothing and leaving
 * the field cancels. An empty name just cancels.
 */
export function RenameInput({
  initial,
  label,
  className = '',
  onSave,
  onCancel,
  validate,
}: {
  initial: string;
  label: string;
  className?: string;
  /** Returns an error message, or null when saved */
  onSave: (name: string) => string | null;
  onCancel: () => void;
  /** Checked on every keystroke: error message or null */
  validate?: (name: string) => string | null;
}) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [errPos, setErrPos] = useState<{ left: number; top: number } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const done = useRef(false);

  useLayoutEffect(() => {
    input.current?.focus();
    input.current?.select();
  }, []);

  useLayoutEffect(() => {
    if (!error || !input.current) return setErrPos(null);
    const r = input.current.getBoundingClientRect();
    // 8 px above the field (Tooltip offset rule)
    setErrPos({ left: r.left, top: r.top - 8 });
  }, [error]);

  const submit = () => {
    if (done.current || error) return;
    if (!value.trim() || value.trim() === initial) {
      done.current = true;
      return onCancel();
    }
    const err = onSave(value);
    if (err) setError(err);
    else done.current = true;
  };

  return (
    <>
      <input
        ref={input}
        className={`rename-input t-body-m-medium ${error ? 'has-error' : ''} ${className}`}
        value={value}
        aria-label={label}
        aria-invalid={!!error}
        maxLength={80}
        onChange={(e) => {
          setValue(e.target.value);
          const v = e.target.value;
          setError(v.trim() && v.trim() !== initial ? (validate?.(v) ?? null) : null);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); submit(); }
          if (e.key === 'Escape') { e.preventDefault(); done.current = true; onCancel(); }
        }}
        onBlur={() => { if (!error) submit(); else { done.current = true; onCancel(); } }}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      />
      {error && errPos &&
        createPortal(
          <div {...MASK} className="tooltip t-body-s" role="alert" style={{ left: errPos.left, top: errPos.top, transform: 'translateY(-100%)' }}>
            {error}
          </div>,
          document.body,
        )}
    </>
  );
}
