import { IconArrowRight } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { weekTitle, t, tf, weekRange, weekdayShort, type Lang } from '../lib/i18n';
import { daySum, decodeSnapshot, rowTotal, type Snapshot } from '../lib/snapshot';
import { addDays, formatMinutes } from '../lib/time';
import { LogoMark } from './Logo';
import './Dialog.css';
import './WeekGrid.css';
import './Viewer.css';

/** "Wed, 11 Nov 2026, 17:09" / "ср, 11 лист. 2026, 17:09" */
const taken = (lang: Lang, iso: string) =>
  new Intl.DateTimeFormat(lang === 'uk' ? 'uk-UA' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    .format(new Date(iso))
    .replace(' р.', '');

/**
 * Viewer · Shared link (Figma Flow 9): what someone sees when they open a shared week — the snapshot
 * from the link itself, read-only. No sidebar, timers or editing; the viewer's system theme.
 */
export function Viewer({ code }: { code: string }) {
  const [state, setState] = useState<{ snap: Snapshot | null; done: boolean }>({ snap: null, done: false });
  useEffect(() => {
    void decodeSnapshot(code).then((snap) => setState({ snap, done: true }));
  }, [code]);

  const snap = state.snap;
  const lang: Lang = snap?.lang ?? (navigator.language.startsWith('uk') ? 'uk' : 'en');
  useEffect(() => {
    document.documentElement.lang = lang;
    if (snap) {
      const m = new Date(snap.monday + 'T12:00');
      document.title = `${weekTitle(lang, m)} — My Daily`;
    }
  }, [lang, snap]);
  const cta = (
    <a className="button button-secondary is-small t-body-s-medium" href="/" target="_blank" rel="noopener">
      {t(lang, 'viewerCta')} <IconArrowRight size={16} aria-hidden />
    </a>
  );
  if (!state.done) return null;
  if (!snap) {
    return (
      <main className="too-narrow">
        <LogoMark />
        <p className="t-body-m">{t(lang, 'viewerBroken')}</p>
        {cta}
      </main>
    );
  }

  const monday = new Date(snap.monday + 'T12:00');
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const weekTotal = snap.rows.reduce((s, r) => s + rowTotal(r.days), 0);
  const value = (m: number | null, medium = false) =>
    m === null ? null : m <= 0 ? <span className="t-body-m-medium cell-subtle">—</span> : <span className={medium ? 't-numeric-m-medium' : 't-numeric-m'}>{formatMinutes(m)}</span>;

  return (
    <div className="viewer">
      <header className="viewer-bar">
        <p className="t-body-s">
          <span className="viewer-when">{tf(lang, 'viewerSnapshot', { when: taken(lang, snap.at) })}</span>
          <span className="viewer-muted"> · {t(lang, 'readOnly')}</span>
        </p>
        {cta}
      </header>
      <main className="week viewer-week" style={{ '--task-w': '280px', '--total-w': '100px' } as React.CSSProperties}>
        <header className="week-header">
          <div>
            <h1 className="t-heading-l">{weekTitle(lang, monday)}</h1>
            <p className="t-body-s week-range">{weekRange(lang, monday, days[6], new Date(snap.at), true)}</p>
          </div>
          <div className="week-summary">
            <span className="t-overline week-summary-label">{t(lang, 'weekTotal')}</span>
            <span className="t-numeric-l-medium">{formatMinutes(weekTotal)}</span>
          </div>
        </header>
        <div className="grid-scroll">
          <div className="grid" role="table" style={{ '--cols': 'var(--task-w) repeat(7, minmax(64px, 1fr)) var(--total-w)' } as React.CSSProperties}>
            <div className="row row-head" role="row">
              <div className="cell cell-task cell-head-label t-caption" role="columnheader">{t(lang, 'task')}</div>
              {days.map((d, i) => (
                <div key={i} className={`cell cell-day-head ${i >= 5 ? 'is-weekend' : ''}`} role="columnheader">
                  <span className="t-caption day-head-weekday">{weekdayShort(lang, d)}</span>
                  <span className="t-body-m">{d.getDate()}</span>
                </div>
              ))}
              <div className="cell cell-total cell-head-label t-caption" role="columnheader">{t(lang, 'total')}</div>
            </div>
            {snap.rows.map((r, ri) => (
              <div className="row" role="row" key={ri}>
                <div className="cell cell-task t-body-m" role="rowheader"><span className="task-name t-body-m-medium">{r.name}</span></div>
                {r.days.map((m, i) => <div key={i} className="cell cell-time" role="cell">{value(m)}</div>)}
                <div className="cell cell-total t-numeric-m-medium" role="cell">{formatMinutes(rowTotal(r.days))}</div>
              </div>
            ))}
            <div className="row row-total" role="row">
              <div className="cell cell-task t-body-m cell-muted" role="rowheader">{t(lang, 'total')}</div>
              {days.map((_, i) => <div key={i} className="cell cell-time" role="cell">{value(daySum(snap, i), true)}</div>)}
              <div className="cell cell-total t-numeric-m-medium" role="cell">{formatMinutes(weekTotal)}</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
