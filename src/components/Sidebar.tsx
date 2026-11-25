import {
  IconArrowBackUp,
  IconArrowBarLeft,
  IconArrowsUpDown,
  IconCalendarPlus,
  IconCheck,
  IconChevronDown,
  IconDatabase,
  IconDatabaseExport,
  IconDatabaseImport,
  IconEye,
  IconEyeOff,
  IconMessage,
  IconMoon,
  IconPencil,
  IconSun,
  IconTrash,
} from '@tabler/icons-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { AppData, Settings, Task } from '../data/types';
import { t, tf } from '../lib/i18n';
import { rowStatus, taskInfos } from '../lib/taskInfo';
import { formatMinutes } from '../lib/time';
import { weekRows } from '../data/actions';
import { Logo } from './Logo';
import { MoreMenu } from './MoreMenu';
import { RenameInput } from './RenameInput';
import { Tooltip } from './Tooltip';

/** Testers' feedback form (Google Forms) — remove or move after the testing round */
const FEEDBACK_URL = 'https://forms.gle/fEfrw2x4pav47YGN7';
import { MASK } from '../lib/clarity';
import './Sidebar.css';

type Props = {
  data: AppData;
  now: Date;
  onCollapse: () => void;
  onAddToWeek: (taskId: string) => void;
  onUnhide: (taskId: string) => void;
  onSettings: (patch: Partial<Settings>) => void;
  /** Returns an error message (name taken) or null when renamed */
  onRename: (taskId: string, name: string) => string | null;
  nameError: (taskId: string, name: string) => string | null;
  onHide: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onExport: () => void;
  onImport: () => void;
  onUndoImport: () => void;
};

const SORTS: Settings['sort'][] = ['most-tracked', 'recent', 'name'];

/** Sidebar — Figma: Components / Sidebar (280, padding 24/16/16/16, gap 24). */
export function Sidebar({ data, now, onCollapse, onAddToWeek, onUnhide, onSettings, onRename, nameError, onHide, onDelete, onExport, onImport, onUndoImport }: Props) {
  const lang = data.settings.language;
  const [editing, setEditing] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  // Scrollbar width differs by OS; measured once so the list can give exactly that much of its padding to it
  const scrollRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const s = getComputedStyle(el);
    const gutter = el.offsetWidth - el.clientWidth - parseFloat(s.borderLeftWidth) - parseFloat(s.borderRightWidth);
    el.style.setProperty('--gutter', `${Math.max(0, Math.min(16, gutter))}px`);
  }, []);
  // null = automatic: open when every task is hidden (Figma: Week · All hidden), closed otherwise
  const [hiddenOpenChoice, setHiddenOpen] = useState<boolean | null>(null);
  // Pointer/focus on a row's quick action: its own tooltip replaces the row tooltip
  const [actionFor, setActionFor] = useState<string | null>(null);
  const infos = taskInfos(data, now);
  const weekRowIds = new Set(weekRows(data, now));

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
  const hiddenOpen = hiddenOpenChoice ?? visible.length === 0;

  const row = (task: Task) => {
    const running = timer?.taskId === task.id;
    const inWeek = weekRowIds.has(task.id);
    const info = infos.get(task.id);
    return (
      // Row tooltip on every row (Figma, Sidebar Task Item): name + status, right of the row
      <Tooltip
        key={task.id}
        label={task.name}
        description={info ? rowStatus(lang, info, now) : undefined}
        placement="right-of-row"
        suppressed={actionFor === task.id || menuFor === task.id || editing === task.id}
      >
      <li data-task={task.id} className={`task-item ${task.hidden ? 'is-hidden' : ''} ${menuFor === task.id ? 'is-active' : ''} ${editing === task.id ? 'is-editing' : ''}`}>
        {editing === task.id ? (
          <RenameInput
            initial={task.name}
            label={t(lang, 'taskName')}
            className="t-body-s-medium is-small"
            onSave={(name) => {
              const err = onRename(task.id, name);
              if (!err) setEditing(null);
              return err;
            }}
            onCancel={() => setEditing(null)}
            validate={(name) => nameError(task.id, name)}
          />
        ) : (
          // Double-click renames; a single click never does
          <span {...MASK} className="task-item-name t-body-s-medium" onDoubleClick={() => setEditing(task.id)}>{task.name}</span>
        )}
        <span className="task-item-side">
          <span className="row-more">
            <MoreMenu
              size="s"
              label={`${t(lang, 'moreActions')}: ${task.name}`}
              onOpenChange={(o) => setMenuFor(o ? task.id : null)}
              entries={[
                { kind: 'item', label: t(lang, 'rename'), icon: <IconPencil size={16} />, onSelect: () => setEditing(task.id) },
                task.hidden
                  ? { kind: 'item', label: t(lang, 'restore'), icon: <IconEye size={16} />, onSelect: () => onUnhide(task.id) }
                  : { kind: 'item', label: t(lang, 'hide'), description: tf(lang, 'hideHint', { time: formatMinutes(total.get(task.id) ?? 0) }), icon: <IconEyeOff size={16} />, onSelect: () => onHide(task.id) },
                { kind: 'divider' },
                { kind: 'item', label: t(lang, 'delete'), icon: <IconTrash size={16} />, destructive: true, onSelect: () => onDelete(task.id) },
              ]}
            />
          </span>
          {task.hidden ? (
            <QuickAction label={t(lang, 'unhide')} onClick={() => onUnhide(task.id)} onActive={(a) => setActionFor(a ? task.id : null)} icon={<IconEye size={12} />} />
          ) : (
            !inWeek && <QuickAction label={t(lang, 'addToThisWeek')} onClick={() => onAddToWeek(task.id)} onActive={(a) => setActionFor(a ? task.id : null)} icon={<IconCalendarPlus size={12} />} />
          )}
          {running && <span className="running-dot" aria-label={t(lang, 'running')} />}
          <span className="task-item-total t-numeric-s-medium">{formatMinutes(total.get(task.id) ?? 0)}</span>
        </span>
      </li>
      </Tooltip>
    );
  };

  return (
    <aside className="sidebar" aria-label={t(lang, 'allTasks')}>
      <div className="sidebar-header">
        <Logo />
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
          <span className="t-numeric-m-medium section-count">{visible.length}</span>
        </h2>

        {visible.length > 0 ? (
          <>
            {/* Shown from one task, so people see sorting exists (it also orders the Hidden list) */}
            <SortMenu value={data.settings.sort} lang={lang} onChange={(sort) => onSettings({ sort })} />
            <div className="columns t-overline">
              <span>{t(lang, 'task')}</span>
              <span>{t(lang, 'allTime')}</span>
            </div>
          </>
        ) : (
          // Figma: Week · Empty / Week · All hidden — no sort, no column labels, one line
          <p className="sidebar-empty t-body-s">{t(lang, hidden.length ? 'allHidden' : 'emptyTasks')}</p>
        )}

        {/* Only the lists scroll; title, sort and column labels stay put (Figma: Sidebar / Tasks) */}
        <div className="task-scroll" ref={scrollRef}>
        {visible.length > 0 && <ul className="task-list">{visible.map(row)}</ul>}

        {hidden.length > 0 && (
          <div className="hidden-toggle">
            <button type="button" className="text-button t-body-s-medium" aria-expanded={hiddenOpen} onClick={() => setHiddenOpen(!hiddenOpen)}>
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
        <div className="preferences-right">
        <div className="segmented" role="radiogroup" aria-label={t(lang, 'language')}>
          {(['uk', 'en'] as const).map((l) => (
            <button key={l} type="button" role="radio" aria-checked={lang === l} className={`segment t-body-s-medium ${lang === l ? 'is-selected' : ''}`} onClick={() => onSettings({ language: l })}>
              {l === 'uk' ? 'UA' : 'EN'}
            </button>
          ))}
        </div>
        {/* Feedback for the testing period: one click from every screen, opens the Google Form */}
        <Tooltip label={t(lang, 'feedback')}>
          <a className="ghost-icon is-small" href={FEEDBACK_URL} target="_blank" rel="noopener" aria-label={t(lang, 'feedback')}>
            <IconMessage size={16} />
          </a>
        </Tooltip>
        {/* Data menu (Figma: Menu · Data) — opens above, right edges aligned with the button */}
        <MoreMenu
          size="s"
          label={t(lang, 'data')}
          icon={<IconDatabase size={16} />}
          align="end"
          width={240}
          entries={[
            { kind: 'item', label: t(lang, 'importData'), icon: <IconDatabaseImport size={16} />, onSelect: onImport },
            { kind: 'item', label: t(lang, 'exportData'), icon: <IconDatabaseExport size={16} />, disabled: data.entries.length === 0 && !data.timer, onSelect: onExport },
            { kind: 'divider' },
            { kind: 'item', label: t(lang, 'undoImport'), icon: <IconArrowBackUp size={16} />, disabled: !data.lastImport, onSelect: onUndoImport },
            { kind: 'divider' },
            { kind: 'note', text: t(lang, 'storageNote') },
          ]}
        />
        </div>
      </div>
    </aside>
  );
}

function QuickAction({ label, onClick, onActive, icon }: { label: string; onClick: () => void; onActive: (active: boolean) => void; icon: React.ReactNode }) {
  return (
    <Tooltip label={label} placement="right-of-row">
      <button
        type="button"
        className="ghost-icon is-small"
        onClick={onClick}
        aria-label={label}
        onMouseEnter={() => onActive(true)}
        onMouseLeave={() => onActive(false)}
        onFocus={() => onActive(true)}
        onBlur={() => onActive(false)}
      >
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
      {/* ⇅ instead of the word "Sort" (Figma); screen readers still hear "Sort: Most tracked" */}
      <button
        type="button"
        className={`secondary-button t-body-s-medium ${open ? 'is-pressed' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${t(lang, 'sort')}: ${label(value)}`}
        onClick={() => setOpen((o) => !o)}
      >
        <IconArrowsUpDown size={12} aria-hidden />
        {label(value)}
        <IconChevronDown size={12} className={open ? 'is-flipped' : ''} aria-hidden />
      </button>
      {open && (
        <ul className="menu" role="menu">
          {SORTS.map((s) => (
            <li key={s} role="none">
              <button type="button" role="menuitemradio" aria-checked={s === value} className="menu-item t-body-m-medium" onClick={() => { onChange(s); setOpen(false); }}>
                {label(s)}
                {s === value && <IconCheck size={16} className="menu-item-check" aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
