import { IconAlertTriangle, IconArrowsJoin, IconCheck, IconDatabaseImport, IconDownload } from '@tabler/icons-react';
import { useRef, useState } from 'react';
import type { AppData } from '../data/types';
import { download } from '../lib/csv';
import { monthRange, plural, t, tf, type Lang } from '../lib/i18n';
import { analyzeImport, applyChoices, findMerges, findOverlaps, TEMPLATE_CSV, type CommaMode, type ImportAnalysis, type ImportProblem } from '../lib/importCsv';
import { formatMinutes } from '../lib/time';
import { fromISODate } from '../lib/time';
import { Dialog } from './Dialog';
import './ImportDialog.css';

/**
 * Import (Figma Flow 8): Dialog · Import (drop or pick a CSV, template, "not a CSV" error) →
 * Dialog · Review import (summary, comma question, rows that will be skipped) → Import.
 */
export function ImportDialog({
  lang,
  data,
  now,
  onImport,
  onCancel,
}: {
  lang: Lang;
  data: AppData;
  now: Date;
  onImport: (analysis: ImportAnalysis, fileName: string) => void;
  onCancel: () => void;
}) {
  const [file, setFile] = useState<{ name: string; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState(false);
  const [comma, setComma] = useState<CommaMode>('decimal');
  const [dragging, setDragging] = useState(false);
  // Review choices: merge groups kept separate, rows unticked
  const [keep, setKeep] = useState<Set<string>>(new Set());
  const [skip, setSkip] = useState<Set<number>>(new Set());
  const toggle = <T,>(set: Set<T>, value: T, on: boolean) => { const next = new Set(set); if (on) next.add(value); else next.delete(value); return next; };
  const input = useRef<HTMLInputElement>(null);

  const take = async (f: File | undefined) => {
    if (!f) return;
    const isCsv = /\.csv$/i.test(f.name) || f.type === 'text/csv';
    if (!isCsv) { setFile(null); setError(tf(lang, 'notCsv', { file: f.name })); return; }
    setError(null);
    setKeep(new Set());
    setSkip(new Set());
    setFile({ name: f.name, text: await f.text() });
    setReview(true); // nothing else to decide on this step — go straight to the review
  };

  const template = (
    <button type="button" className="button button-ghost t-body-m-medium" onClick={() => download('my-daily-template.csv', TEMPLATE_CSV)}>
      <IconDownload size={16} /> {t(lang, 'downloadTemplate')}
    </button>
  );
  const cancel = (
    <button type="button" className="button button-secondary t-body-m-medium" onClick={onCancel}>{t(lang, 'cancel')}</button>
  );

  if (review && file) {
    const raw = analyzeImport(file.text, data, now, comma);
    const merges = findMerges(raw.rows, data);
    const overlaps = findOverlaps(applyChoices(raw, merges, keep, new Set()).rows, data);
    const a = applyChoices(raw, merges, keep, skip); // what Import will do
    const hours = Math.round(a.totalMinutes / 60);
    const example = raw.rows.find((r) => r.ambiguous);
    const day = (iso: string) =>
      new Intl.DateTimeFormat(lang === 'uk' ? 'uk-UA' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(fromISODate(iso)).replace(/^(\p{L})/u, (c) => c.toUpperCase());
    const manyOverlaps = overlaps.length > 5; // re-importing a whole file: one row for all of them
    const attention = (raw.ambiguousCount > 0 ? 1 : 0) + raw.problems.length + (manyOverlaps ? 1 : overlaps.length);
    return (
      <Dialog
        title={t(lang, 'reviewImport')}
        description={file.name}
        width={560}
        onCancel={onCancel}
        initialFocus=".button-primary:not(:disabled), .button-secondary"
        actions={
          <div className="dialog-buttons">
            {cancel}
            <button type="button" className="button button-primary t-body-m-medium" disabled={!a.rows.length} onClick={() => onImport(a, file.name)}>
              {a.rows.length ? tf(lang, 'importN', { entries: plural(lang, a.rows.length, 'entry') }) : t(lang, 'nothingToImport')}
            </button>
          </div>
        }
      >
        <div className="summary-card">
          <span className="t-body-m-medium">
            {[plural(lang, a.weeks, 'week'), plural(lang, a.tasks, 'task'), plural(lang, a.rows.length, 'entry')].join(' · ')}
          </span>
          {a.from && a.to && (
            <span className="t-body-s summary-caption">
              {monthRange(lang, fromISODate(a.from), fromISODate(a.to))} · {plural(lang, hours, 'hour')}
            </span>
          )}
        </div>
        {merges.length > 0 && (
          <section className="review-section">
            <h3 className="t-overline review-label">{t(lang, 'mergeSection')}</h3>
            {merges.map((g) => {
              const kept = keep.has(g.id);
              return (
                <div key={g.id} className={`list-row ${kept ? 'is-kept' : ''}`}>
                  <IconArrowsJoin size={16} className="list-row-icon" aria-hidden />
                  <span className="list-row-text">
                    <span className="t-body-s merge-title">
                      <span className="merge-from">{g.names.join(', ')}</span>{' '}
                      {!kept && <span className="merge-to t-body-s-medium">→ {g.target}</span>}
                    </span>
                    <span className="t-body-s list-row-description">{kept ? t(lang, 'keptSeparate') : plural(lang, g.rows, 'entry')}</span>
                  </span>
                  <button type="button" className="text-action t-body-s-medium" onClick={() => setKeep(toggle(keep, g.id, !kept))}>
                    {t(lang, kept ? 'mergeAgain' : 'keepSeparate')}
                  </button>
                </div>
              );
            })}
          </section>
        )}
        {attention > 0 && (
          <section className="review-section">
            <h3 className="t-overline review-label">{tf(lang, 'needsAttention', { n: String(attention) })}</h3>
            {manyOverlaps ? (
              <Check
                checked={overlaps.every((o) => !skip.has(o.line))}
                onChange={(on) => setSkip(overlaps.reduce((s, o) => toggle(s, o.line, !on), skip))}
                title={tf(lang, 'overlapMany', { rows: plural(lang, overlaps.length, 'row') })}
                hint={t(lang, 'overlapManyHint')}
              />
            ) : (
              overlaps.map((o) => (
                <Check
                  key={o.line}
                  checked={!skip.has(o.line)}
                  onChange={(on) => setSkip(toggle(skip, o.line, !on))}
                  title={tf(lang, 'overlap', { date: day(o.date), task: o.task, had: formatMinutes(o.existing), add: formatMinutes(o.adding) })}
                  hint={t(lang, 'overlapHint')}
                />
              ))
            )}
            {raw.ambiguousCount > 0 && example && (
              <div className="list-row">
                <IconAlertTriangle size={16} className="list-row-icon" aria-hidden />
                <span className="list-row-text">
                  <span className="t-body-m">{tf(lang, 'commaQuestion', { example: example.rawDuration })}</span>
                  <span className="t-body-s list-row-description">{tf(lang, 'appliesTo', { rows: plural(lang, a.ambiguousCount, 'row') })}</span>
                </span>
                <CommaChoice lang={lang} value={comma} onChange={setComma} example={example.rawDuration} />
              </div>
            )}
            {raw.problems.map((p) => (
              <div key={p.line} className="list-row">
                <IconAlertTriangle size={16} className="list-row-icon" aria-hidden />
                <span className="list-row-text">
                  <span className="t-body-m">{tf(lang, 'line', { n: String(p.line) })} · {problemText(lang, p)}</span>
                  <span className="t-body-s list-row-description">{t(lang, 'skipped')} · {p.raw}</span>
                </span>
              </div>
            ))}
          </section>
        )}
      </Dialog>
    );
  }

  return (
    <Dialog
      title={t(lang, 'importTitle')}
      description={t(lang, 'importIntro')}
      width={560}
      onCancel={onCancel}
      actions={
        <>
          {template}
          <div className="dialog-buttons">{cancel}</div>
        </>
      }
    >
      <label
        className={`file-drop ${dragging ? 'is-dragging' : ''}`}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.current?.click(); } }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); void take(e.dataTransfer.files[0]); }}
      >
        <IconDatabaseImport size={24} className="file-drop-icon" aria-hidden />
        <span className="t-body-s-medium">{dragging ? t(lang, 'dropToUpload') : t(lang, 'dropHere')}</span>
        <span className="t-body-s file-drop-hint">{t(lang, 'importFormat')}</span>
        <input ref={input} type="file" accept=".csv,text/csv" hidden onChange={(e) => { void take(e.target.files?.[0]); e.target.value = ''; }} />
      </label>
      {error && (
        // Figma: what went wrong in error colour, what to do in secondary — two lines
        <p className="t-body-s import-error" role="alert">
          <span className="import-error-what">{error}</span>
          <span>{t(lang, 'notCsvHelp')}</span>
        </p>
      )}
    </Dialog>
  );
}

function CommaChoice({ lang, value, onChange, example }: { lang: Lang; value: CommaMode; onChange: (v: CommaMode) => void; example: string }) {
  const [h, f] = example.split(/[.,]/);
  const dec = Math.round(Number(`0.${f}`) * 60);
  const options: [CommaMode, string][] = [
    ['decimal', `${h}:${String(dec).padStart(2, '0')}`],
    ['hoursMinutes', `${h}:${f.padEnd(2, '0')}`],
  ];
  return (
    <div className="segmented" role="radiogroup" aria-label={tf(lang, 'commaQuestion', { example })}>
      {options.map(([mode, label]) => (
        <button key={mode} type="button" role="radio" aria-checked={value === mode} className={`segment t-numeric-s-medium ${value === mode ? 'is-selected' : ''}`} onClick={() => onChange(mode)}>
          {label}
        </button>
      ))}
    </div>
  );
}

function problemText(lang: Lang, p: ImportProblem): string {
  const key = { date: 'problemDate', future: 'problemFuture', task: 'problemTask', duration: 'problemDuration', tooLong: 'problemTooLong', dayFull: 'problemDayFull' } as const;
  return t(lang, key[p.reason]);
}

/** Checkbox row (Figma Checkbox in a List Row): 16 px box, the whole row toggles */
function Check({ checked, onChange, title, hint }: { checked: boolean; onChange: (on: boolean) => void; title: string; hint: string }) {
  return (
    <label className="list-row check-row">
      <input type="checkbox" className="checkbox-input" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="checkbox" aria-hidden>{checked && <IconCheck size={12} stroke={3} />}</span>
      <span className="list-row-text">
        <span className="t-body-m">{title}</span>
        <span className="t-body-s list-row-description">{hint}</span>
      </span>
    </label>
  );
}
