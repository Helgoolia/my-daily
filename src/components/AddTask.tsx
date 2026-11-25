import { IconCornerDownLeft, IconPlus } from '@tabler/icons-react';
import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Settings } from '../data/types';
import { t, tf } from '../lib/i18n';
import { MASK } from '../lib/clarity';
import type { Suggestion } from '../lib/taskInfo';

/**
 * "Name a task" — Figma: Input, Style=Ghost + Flow 10 (Suggestions).
 * From 2 letters a list shows existing tasks whose name contains the text (hidden and not-in-week
 * included, with total and status) and "Create task" last. "Create task" is highlighted by default,
 * so Enter creates. Exact match (case-insensitive): no "Create task", the existing task is
 * highlighted — no duplicate names. ↑↓ move, Enter picks, Esc closes the list (a second Esc clears).
 * The list sits 8 px from the field (the field keeps its focus ring while the list is open),
 * below it, or above when there is no room.
 */
export function AddTask({
  lang,
  getSuggestions,
  onAdd,
  onPick,
}: {
  lang: Settings['language'];
  getSuggestions: (query: string) => Suggestion[];
  /** Create a task with this name */
  onAdd: (name: string) => void;
  /** Bring an existing task into this week */
  onPick: (taskId: string) => void;
}) {
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(true);
  const [active, setActive] = useState<number | null>(null); // null = the default item
  const form = useRef<HTMLFormElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  const found = value.trim().length >= 2 ? getSuggestions(value) : [];
  const exact = found.findIndex((s) => s.exact);
  const showCreate = exact < 0;
  const count = found.length + (showCreate ? 1 : 0);
  const listOpen = open && found.length > 0;
  const defaultIndex = exact >= 0 ? exact : found.length; // Create task is last
  const current = active === null || active >= count ? defaultIndex : active;

  useLayoutEffect(() => {
    if (!listOpen || !form.current || !list.current) return setPos(null);
    const r = form.current.getBoundingClientRect();
    const h = list.current.offsetHeight;
    const below = r.bottom + 8 + h <= window.innerHeight - 8;
    setPos({ left: r.left, top: below ? r.bottom + 8 : r.top - 8 - h });
  }, [listOpen, count, value]);

  const reset = () => {
    setValue('');
    setActive(null);
    setOpen(true);
    (document.activeElement as HTMLElement | null)?.blur(); // the new / returned row flashes instead
  };
  const choose = (index: number) => {
    if (index < found.length) onPick(found[index].id);
    else if (value.trim()) onAdd(value);
    reset();
  };

  return (
    <form
      ref={form}
      className="add-task"
      onSubmit={(e) => {
        e.preventDefault();
        if (!value.trim()) return;
        if (listOpen) return choose(current);
        onAdd(value);
        reset();
      }}
    >
      <IconPlus size={16} className="add-task-icon" aria-hidden />
      <input
        className="add-task-input t-body-m"
        value={value}
        role="combobox"
        aria-expanded={listOpen}
        aria-controls="add-task-suggestions"
        aria-activedescendant={listOpen ? `suggestion-${current}` : undefined}
        aria-autocomplete="list"
        onChange={(e) => {
          setValue(e.target.value);
          setActive(null);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            if (!listOpen) return;
            e.preventDefault();
            const step = e.key === 'ArrowDown' ? 1 : -1;
            setActive((current + step + count) % count);
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            if (listOpen) return setOpen(false);
            setValue('');
            e.currentTarget.blur();
          }
        }}
        onBlur={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        placeholder={t(lang, 'nameATask')}
        aria-label={t(lang, 'nameATask')}
        maxLength={80}
        autoComplete="off"
      />
      {value.trim() && (
        <span className="add-task-hint t-caption" aria-hidden>
          Enter <IconCornerDownLeft size={12} />
        </span>
      )}
      {listOpen &&
        createPortal(
          <div
            ref={list}
            id="add-task-suggestions"
            role="listbox"
            aria-label={t(lang, 'nameATask')}
            className="menu is-floating suggestions"
            style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999 }}
            // keep the focus in the field while clicking an item
            onMouseDown={(e) => e.preventDefault()}
          >
            {found.map((s, i) => (
              <div
                key={s.id}
                id={`suggestion-${i}`}
                role="option"
                aria-selected={i === current}
                className={`menu-item suggestion ${i === current ? 'is-active' : ''}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(i)}
              >
                <span {...MASK} className="t-body-m-medium suggestion-name">{s.name}</span>
                <span className="t-body-s suggestion-meta">{s.meta}</span>
              </div>
            ))}
            {showCreate && (
              <div
                id={`suggestion-${found.length}`}
                role="option"
                aria-selected={current === found.length}
                {...MASK}
                className={`menu-item suggestion-create t-body-m-medium ${current === found.length ? 'is-active' : ''}`}
                onMouseEnter={() => setActive(found.length)}
                onClick={() => choose(found.length)}
              >
                {tf(lang, 'createTask', { name: value.trim() })}
              </div>
            )}
          </div>,
          document.body,
        )}
    </form>
  );
}
