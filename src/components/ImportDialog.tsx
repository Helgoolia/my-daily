import { IconAlertTriangle, IconDatabaseImport, IconDownload } from '@tabler/icons-react';
import { useRef, useState } from 'react';
import type { AppData } from '../data/types';
import { download } from '../lib/csv';
import { monthRange, plural, t, tf, type Lang } from '../lib/i18n';
import { analyzeImport, TEMPLATE_CSV, type CommaMode, type ImportAnalysis, type ImportProblem } from '../lib/importCsv';
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
  const input = useRef<HTMLInputElement>(null);

  const take = async (f: File | undefined) => {
    if (!f) return;
    const isCsv = /\.csv$/i.test(f.name) || f.type === 'text/csv';
    if (!isCsv) { setFile(null); setError(tf(lang, 'notCsv', { file: f.name })); return; }
    setError(null);
    setFile({ name: f.name, text: await f.text() });
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
    const a = analyzeImport(file.text, data, now, comma);
    const hours = Math.round(a.totalMinutes / 60);
    const example = a.rows.find((r) => r.ambiguous);
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
        {(a.ambiguousCount > 0 || a.problems.length > 0) && (
          <section className="review-section">
            <h3 className="t-overline review-label">{tf(lang, 'needsAttention', { n: String(a.ambiguousCount > 0 ? a.problems.length + 1 : a.problems.length) })}</h3>
            {a.ambiguousCount > 0 && example && (
              <div className="list-row">
                <IconAlertTriangle size={16} className="list-row-icon" aria-hidden />
                <span className="list-row-text">
                  <span className="t-body-m">{tf(lang, 'commaQuestion', { example: example.rawDuration })}</span>
                  <span className="t-body-s list-row-description">{tf(lang, 'appliesTo', { rows: plural(lang, a.ambiguousCount, 'row') })}</span>
                </span>
                <CommaChoice lang={lang} value={comma} onChange={setComma} example={example.rawDuration} />
              </div>
            )}
            {a.problems.map((p) => (
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
      title={t(lang, 'importData')}
      description={t(lang, 'importIntro')}
      width={560}
      onCancel={onCancel}
      actions={
        <>
          {template}
          <div className="dialog-buttons">
            {cancel}
            <button type="button" className="button button-primary t-body-m-medium" disabled={!file} onClick={() => setReview(true)}>
              {t(lang, 'continue')}
            </button>
          </div>
        </>
      }
    >
      <label
        className={`file-drop ${dragging ? 'is-dragging' : ''} ${error ? 'has-error' : ''}`}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.current?.click(); } }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); void take(e.dataTransfer.files[0]); }}
      >
        <IconDatabaseImport size={24} className="file-drop-icon" aria-hidden />
        <span className="t-body-s-medium">{file ? file.name : t(lang, 'dropHere')}</span>
        <span className="t-body-s file-drop-hint">{t(lang, 'importFormat')}</span>
        <input ref={input} type="file" accept=".csv,text/csv" hidden onChange={(e) => { void take(e.target.files?.[0]); e.target.value = ''; }} />
      </label>
      {error && <p className="t-body-s import-error" role="alert">{error}</p>}
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
  const key = { date: 'problemDate', future: 'problemFuture', task: 'problemTask', duration: 'problemDuration', dayFull: 'problemDayFull' } as const;
  return t(lang, key[p.reason]);
}
