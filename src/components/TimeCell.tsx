import { IconBan, IconPlayerPlayFilled, IconPlayerStopFilled } from '@tabler/icons-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { t, tf, type Lang } from '../lib/i18n';
import { autoColon, formatMinutes, parseCellTime } from '../lib/time';

/**
 * Week grid cell (Figma: Time Cell, Flow 5).
 * Past / today: click the time → Input Time S; Enter saves, Esc cancels, leaving the field saves.
 *   Validation on Enter: format ("Use h:mm, like 1:45"), then the day limit — all tasks of a day
 *   together ≤ 24:00, a running timer included ("You can add 19:15 more").
 * Running: clicking its time shows "Stop the timer to edit" (~2 s); the stop button works as usual.
 * Future: hover shows the ban icon (cursor not-allowed); click → "You can't add time to future days" (~2 s).
 * Tooltips sit on the cell's top edge, centred — the cell is the trigger (Figma: 6 · Tooltips in context).
 */
export function TimeCell({
  kind,
  minutes,
  running,
  seconds,
  limit,
  label,
  lang,
  onSave,
  onStart,
  onStop,
}: {
  kind: 'past' | 'today' | 'future';
  minutes: number;
  running: boolean;
  /** Seconds of the running session, shown after h:mm */
  seconds?: number;
  /** Most this cell may hold: 24:00 minus the other tasks of that day */
  limit: number;
  /** "Exploring · Tue 24" — for screen readers */
  label: string;
  lang: Lang;
  onSave: (minutes: number) => void;
  onStart?: () => void;
  onStop?: () => void;
}) {
  const cell = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [tip, setTip] = useState<{ text: string; error: boolean; left: number; top: number } | null>(null);
  // Centre of the cell's top edge, read when the tooltip appears
  const at = () => { const r = cell.current!.getBoundingClientRect(); return { left: r.left + r.width / 2, top: r.top }; };
  const timer = useRef<number | undefined>(undefined);
  const flash = (text: string) => {
    window.clearTimeout(timer.current);
    setTip({ text, error: false, ...at() });
    timer.current = window.setTimeout(() => setTip(null), 2000);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const hideFlash = () => { if (tip && !tip.error) { window.clearTimeout(timer.current); setTip(null); } };

  const today = kind === 'today';
  const value = (
    <span className={`t-numeric-m ${minutes < 1 && !running ? 'cell-subtle' : ''}`}>
      {kind === 'past' && minutes <= 0 ? '—' : formatMinutes(minutes)}
      {running && <span className="seconds">:{String(seconds ?? 0).padStart(2, '0')}</span>}
    </span>
  );

  let body: ReactNode;
  if (kind === 'future') {
    body = (
      <button type="button" className="cell-hit is-blocked" aria-disabled="true" aria-label={`${label}: ${t(lang, 'futureBlocked')}`} onClick={() => flash(t(lang, 'futureBlocked'))}>
        <IconBan size={16} className="cell-ban" aria-hidden />
      </button>
    );
  } else if (editing) {
    body = (
      <TimeInput
        initial={minutes}
        limit={limit}
        lang={lang}
        label={`${t(lang, 'editTime')}: ${label}`}
        onError={(text) => setTip(text ? { text, error: true, ...at() } : null)}
        onDone={(next) => {
          setEditing(false);
          setTip(null);
          if (next !== null) onSave(next);
        }}
      />
    );
  } else {
    body = (
      <button
        type="button"
        className={`cell-hit ${running ? 'is-running' : ''}`}
        aria-label={`${t(lang, 'editTime')}: ${label}, ${formatMinutes(minutes)}`}
        onClick={() => (running ? flash(t(lang, 'stopToEdit')) : setEditing(true))}
      >
        {value}
      </button>
    );
  }

  return (
    <div ref={cell} role="cell" className={`cell ${today ? 'cell-today is-today' : 'cell-time'} ${editing ? 'is-editing' : ''} ${kind === 'future' ? 'is-future' : ''}`} onMouseLeave={hideFlash}>
      {body}
      {today && (
        <button
          type="button"
          className={`icon-button ${running ? 'is-primary' : ''}`}
          onClick={() => (running ? onStop?.() : onStart?.())}
          aria-label={`${running ? t(lang, 'stop') : t(lang, 'start')}: ${label}`}
        >
          {running ? <IconPlayerStopFilled size={16} /> : <IconPlayerPlayFilled size={16} />}
        </button>
      )}
      {tip && <CellTip left={tip.left} top={tip.top} text={tip.text} />}
    </div>
  );
}

function TimeInput({ initial, limit, lang, label, onError, onDone }: {
  initial: number;
  limit: number;
  lang: Lang;
  label: string;
  onError: (text: string | null) => void;
  /** minutes to save, or null to cancel */
  onDone: (minutes: number | null) => void;
}) {
  const start = initial > 0 ? formatMinutes(initial) : '';
  const [value, setValue] = useState(start);
  const [error, setError] = useState(false);
  const done = useRef(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);

  const finish = (next: number | null) => { if (done.current) return; done.current = true; onDone(next); };
  /** Enter: show what's wrong. Leaving the field: save if fine, else cancel. */
  const check = (fromEnter: boolean) => {
    if (value.trim() === start) return finish(null); // unchanged
    const minutes = parseCellTime(value);
    const problem = minutes === null
      ? t(lang, 'timeFormat')
      : minutes > limit + 1e-9
        ? tf(lang, 'canAddMore', { time: formatMinutes(Math.max(0, limit)) })
        : null;
    if (!problem) return finish(minutes);
    if (!fromEnter) return finish(null);
    setError(true);
    onError(problem);
  };

  return (
    <input
      ref={ref}
      className={`time-input t-numeric-m ${error ? 'has-error' : ''}`}
      value={value}
      inputMode="numeric"
      autoComplete="off"
      maxLength={8}
      aria-label={label}
      aria-invalid={error}
      placeholder="0:00"
      onChange={(e) => {
        setValue(autoColon(e.target.value));
        if (error) { setError(false); onError(null); }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.preventDefault(); check(true); }
        if (e.key === 'Escape') { e.preventDefault(); finish(null); }
      }}
      onBlur={() => check(false)}
    />
  );
}

/** Tooltip over the cell: centred, its bottom on the cell's top edge (no gap — the cell padding gives the air). */
function CellTip({ left, top, text }: { left: number; top: number; text: string }) {
  return createPortal(
    <div className="tooltip t-body-s" role="tooltip" aria-live="polite" style={{ left, top, transform: 'translate(-50%, -100%)' }}>
      {text}
    </div>,
    document.body,
  );
}
