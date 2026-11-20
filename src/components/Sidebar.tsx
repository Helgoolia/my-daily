import {
  IconArrowBarLeft,
  IconCalendarPlus,
  IconChevronDown,
  IconEye,
  IconMoon,
  IconSun,
} from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import type { AppData, Settings, Task } from '../data/types';
import { t } from '../lib/i18n';
import { formatMinutes, mondayOf, toISODate } from '../lib/time';
import { Logo } from './Logo';
import { Tooltip } from './Tooltip';
import './Sidebar.css';

type Props = {
  data: AppData;
  now: Date;
  onCollapse: () => void;
  onAddToWeek: (taskId: string) => void;
  onUnhide: (taskId: string) => void;
  onSettings: (patch: Partial<Settings>) => void;
};

const SORTS: Settings['sort'][] = ['most-tracked', 'recent', 'name'];

/** Sidebar — Figma: Components / Sidebar (280, padding 24/16/16/16, gap 24). */
export function Sidebar({ data, now, onCollapse, onAddToWeek, onUnhide, onSettings }: Props) {
  const lang = data.settings.language;
  const [hiddenOpen, setHiddenOpen] = useState(false);
  const weekRows = new Set(data.weeks[toISODate(mondayOf(now))] ?? []);

  // All-time total and last use per task, including the running session.
  const timer = data.timer;
  const live = timer ? (now.getTime() - new Date(timer.startedAt).getTime()) / 60_000 : 0;
  const total = new Map<string, number>();
  const lastUsed = new Map<string, string>();
  for (const e of data.entries) {
    total.set(e.taskId, (total.get(e.taskId) ?? 0) + e.minutes);
    if ((lastUsed.get(e.taskId) ?? '') < e.date) lastUsed.set(e.taskId, e.date);
  }
  if (timer) {
    total.set(timer.taskId, (total.get(timer.taskId) ?? 0) + live);
    lastUsed.set(timer.taskId, '9999');
  }

  const sorted = (tasks: Task[]) =>
    [...tasks].sort((a, b) => {
      if (data.settings.sort === 'name') return a.name.localeCompare(b.name, lang === 'uk' ? 'uk' : 'en');
      if (data.settings.sort === 'recent') return (lastUsed.get(b.id) ?? '').localeCompare(lastUsed.get(a.id) ?? '');
      return (total.get(b.id) ?? 0) - (total.get(a.id) ?? 0);
    });
  const visible = sorted(data.tasks.filter((x) => !x.hidden));
  const hidden = sorted(data.tasks.filter((x) => x.hidden));

  const row = (task: Task) => {
    const running = timer?.taskId === task.id;
    const inWeek = weekRows.has(task.id);
    return (
      <li key={task.id} className={`task-item ${task.hidden ? 'is-hidden' : ''}`}>
        <Tooltip label={task.name} placement="right-of-row" onlyIfTruncated>
          <span className="task-item-name t-body-s-medium">{task.name}</span>
        </Tooltip>
        <span className="task-item-side">
          {task.hidden ? (
            <QuickAction label={t(lang, 'unhide')} onClick={() => onUnhide(task.id)} icon={<IconEye size={12} />} />
          ) : (
            !inWeek && <QuickAction label={t(lang, 'addToThisWeek')} onClick={() => onAddToWeek(task.id)} icon={<IconCalendarPlus size={12} />} />
          )}
          {running && <span className="running-dot" aria-label={t(lang, 'running')} />}
          <span className="task-item-total t-numeric-s">{formatMinutes(total.get(task.id) ?? 0)}</span>
        </span>
      </li>
    );
  };

  return (
    <aside className="sidebar" aria-label={t(lang, 'allTasks')}>
      <div className="sidebar-header">
        <Logo active={timer !== null} />
        {/* Right of the button: at the sidebar's edge it covers nothing (below would hide "All tasks") */}
        {/* Tooltip: just the verb; screen readers still get the full "Collapse sidebar" */}
        <Tooltip label={t(lang, 'collapse')} placement="right">
          <button type="button" className="ghost-icon" onClick={onCollapse} aria-label={t(lang, 'collapseSidebar')}>
            <IconArrowBarLeft size={16} />
          </button>
        </Tooltip>
      </div>

      <section className="sidebar-tasks">
        <h2 className="section-header">
          <span className="t-body-m-medium">{t(lang, 'allTasks')}</span>
          <span className="t-numeric-m section-count">{visible.length}</span>
        </h2>

        <SortMenu value={data.settings.sort} lang={lang} onChange={(sort) => onSettings({ sort })} />

        <div className="columns t-overline">
          <span>{t(lang, 'task')}</span>
          <span>{t(lang, 'allTime')}</span>
        </div>

        {/* Only the lists scroll; title, sort and column labels stay put (Figma: Sidebar / Tasks) */}
        <div className="task-scroll">
        <ul className="task-list">{visible.map(row)}</ul>

        {hidden.length > 0 && (
          <div className="hidden-toggle">
            <button type="button" className="text-button t-body-s-medium" aria-expanded={hiddenOpen} onClick={() => setHiddenOpen((o) => !o)}>
              {t(lang, 'hidden')} ({hidden.length})
              <IconChevronDown size={12} className={hiddenOpen ? 'is-flipped' : ''} />
            </button>
            {hiddenOpen && <ul className="task-list">{hidden.map(row)}</ul>}
          </div>
        )}
        </div>
      </section>

      <div className="preferences">
        <ThemeSwitch value={data.settings.theme} lang={lang} onChange={(theme) => onSettings({ theme })} />
        <div className="segmented" role="radiogroup" aria-label={t(lang, 'language')}>
          {(['uk', 'en'] as const).map((l) => (
            <button key={l} type="button" role="radio" aria-checked={lang === l} className={`segment t-body-s-medium ${lang === l ? 'is-selected' : ''}`} onClick={() => onSettings({ language: l })}>
              {l === 'uk' ? 'UA' : 'EN'}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

function QuickAction({ label, onClick, icon }: { label: string; onClick: () => void; icon: React.ReactNode }) {
  return (
    <Tooltip label={label} placement="right-of-row">
      <button type="button" className="ghost-icon is-small" onClick={onClick} aria-label={label}>
        {icon}
      </button>
    </Tooltip>
  );
}

/** Theme: the selected segment shows the theme in use (system until the user picks one). */
function ThemeSwitch({ value, lang, onChange }: { value: Settings['theme']; lang: Settings['language']; onChange: (v: Settings['theme']) => void }) {
  const [systemDark, setSystemDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const fn = () => setSystemDark(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  const effective = value === 'system' ? (systemDark ? 'dark' : 'light') : value;
  return (
    <div className="segmented" role="radiogroup" aria-label={t(lang, 'theme')}>
      {(['light', 'dark'] as const).map((th) => (
        <button key={th} type="button" role="radio" aria-checked={effective === th} aria-label={t(lang, th)} className={`segment is-icon ${effective === th ? 'is-selected' : ''}`} onClick={() => onChange(th)}>
          {th === 'light' ? <IconSun size={16} /> : <IconMoon size={16} />}
        </button>
      ))}
    </div>
  );
}

function SortMenu({ value, lang, onChange }: { value: Settings['sort']; lang: Settings['language']; onChange: (v: Settings['sort']) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);
  const label = (s: Settings['sort']) => t(lang, s === 'most-tracked' ? 'sortMostTracked' : s === 'recent' ? 'sortRecent' : 'sortName');
  return (
    <div className="sort" ref={ref}>
      {/* Trigger is Pressed while its menu is open; chevron flips (rule from Figma) */}
      <button type="button" className={`secondary-button t-body-s-medium ${open ? 'is-pressed' : ''}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {t(lang, 'sort')}: {label(value)}
        <IconChevronDown size={12} className={open ? 'is-flipped' : ''} />
      </button>
      {open && (
        <ul className="menu" role="menu">
          {SORTS.map((s) => (
            <li key={s} role="none">
              <button type="button" role="menuitemradio" aria-checked={s === value} className="menu-item t-body-s" onClick={() => { onChange(s); setOpen(false); }}>
                {label(s)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
