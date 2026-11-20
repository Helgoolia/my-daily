import { IconCornerDownLeft, IconPlus } from '@tabler/icons-react';
import { useState } from 'react';
import type { Settings } from '../data/types';
import { t } from '../lib/i18n';

/**
 * "Name a task" — Figma: Input, Style=Ghost (no fill, no border; hover = state layer).
 * Enter creates the task, or brings back an existing one with the same name.
 * Suggestions list comes in a later PR (Flow 10).
 */
export function AddTask({ lang, onAdd }: { lang: Settings['language']; onAdd: (name: string) => void }) {
  // After Enter the field lets go of focus; WeekGrid flashes the new row (see onAddTask).
  const [value, setValue] = useState('');
  return (
    <form
      className="add-task"
      onSubmit={(e) => {
        e.preventDefault();
        if (!value.trim()) return;
        onAdd(value);
        setValue('');
        (document.activeElement as HTMLElement | null)?.blur();
      }}
    >
      <IconPlus size={16} className="add-task-icon" aria-hidden />
      <input
        className="add-task-input t-body-m"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t(lang, 'nameATask')}
        aria-label={t(lang, 'nameATask')}
        maxLength={80}
      />
      {value.trim() && (
        <span className="add-task-hint t-caption" aria-hidden>
          Enter <IconCornerDownLeft size={12} />
        </span>
      )}
    </form>
  );
}
