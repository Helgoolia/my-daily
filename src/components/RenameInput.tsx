import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Inline rename — Figma: Task Cell / Sidebar Task Item, State=Editing (Input Text S).
 * Enter saves, Esc cancels, leaving the field saves too. A taken name shows an error tooltip
 * above the field and keeps it open; an empty name just cancels.
 */
export function RenameInput({
  initial,
  label,
  className = '',
  onSave,
  onCancel,
}: {
  initial: string;
  label: string;
  className?: string;
  /** Returns an error message, or null when saved */
  onSave: (name: string) => string | null;
  onCancel: () => void;
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
    setErrPos({ left: r.left, top: r.top - 8 });
  }, [error]);

  const submit = () => {
    if (done.current) return;
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
          setError(null);
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
          <div className="tooltip t-body-s" role="alert" style={{ left: errPos.left, top: errPos.top, transform: 'translateY(-100%)' }}>
            {error}
          </div>,
          document.body,
        )}
    </>
  );
}
