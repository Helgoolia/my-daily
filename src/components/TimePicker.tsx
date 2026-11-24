import { IconCheck, IconChevronDown, IconChevronUp, IconClock } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { autoColon } from '../lib/time';
import './TimePicker.css';

type Props = {
  value: string;
  onChange: (value: string) => void;
  /** Suggested times, newest first (labels like "13:30") */
  options: string[];
  /** Enter with the list closed */
  onSubmit: () => void;
  label: string;
  toggleLabel: string;
  invalid?: boolean;
  describedBy?: string;
};

/**
 * Input · Picker (Figma): a time field with suggestions, not a select. Type any minute (13:37) —
 * Enter keeps it even if it isn't listed. Chevron or ↓ opens the list (15-minute steps, newest first,
 * 6 rows visible, opens with the selected time in view); ↑↓ move, Enter picks, Esc closes the list
 * only. Typing moves the highlight to the first matching time. List sits 8 px under the field.
 */
export function TimePicker({ value, onChange, options, onSubmit, label, toggleLabel, invalid, describedBy }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const list = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const selected = options.indexOf(value);

  const show = (at = selected) => {
    setActive(at >= 0 ? at : 0);
    setOpen(true);
  };
  const pick = (i: number) => {
    onChange(options[i]);
    setOpen(false);
    input.current?.focus();
  };

  // Keep the highlighted row in view (on open: the selected time)
  useEffect(() => {
    if (!open || active < 0) return;
    list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  return (
    <div className={`picker ${invalid ? 'has-error' : ''}`} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
      <IconClock size={16} className="picker-icon" aria-hidden />
      <input
        ref={input}
        className="picker-input t-numeric-m"
        value={value}
        inputMode="numeric"
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls="picker-list"
        aria-activedescendant={open && active >= 0 ? `picker-${active}` : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        autoComplete="off"
        maxLength={5}
        onChange={(e) => {
          const v = autoColon(e.target.value);
          onChange(v);
          const match = options.findIndex((o) => o.startsWith(v));
          if (open && match >= 0) setActive(match);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (!open) return show();
            const step = e.key === 'ArrowDown' ? 1 : -1;
            setActive((a) => Math.min(options.length - 1, Math.max(0, a + step)));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            if (open && active >= 0) pick(active);
            else onSubmit();
          } else if (e.key === 'Escape' && open) {
            e.preventDefault();
            e.stopPropagation(); // closes the list, not the dialog
            setOpen(false);
          }
        }}
      />
      <button
        type="button"
        className="picker-toggle"
        tabIndex={-1}
        aria-label={toggleLabel}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => (open ? setOpen(false) : (show(), input.current?.focus()))}
      >
        {open ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
      </button>
      {open && options.length > 0 && (
        <div ref={list} id="picker-list" role="listbox" aria-label={label} className="menu picker-list" onMouseDown={(e) => e.preventDefault()}>
          {options.map((o, i) => (
            <div
              key={o}
              id={`picker-${i}`}
              data-index={i}
              role="option"
              aria-selected={i === selected}
              className={`menu-item t-numeric-m ${i === active ? 'is-active' : ''}`}
              onMouseMove={() => setActive(i)} // move, not enter: a list opening under a still cursor keeps its highlight
              onClick={() => pick(i)}
            >
              {o}
              {i === selected && <IconCheck size={16} className="menu-item-check" aria-hidden />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
