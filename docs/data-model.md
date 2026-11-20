# My Daily — data model (v1)

Everything lives in the browser (`localStorage`), no accounts, no server.
One key, one JSON object, with a schema version so future updates can migrate old data safely.

```ts
// localStorage key: "mydaily"
type AppData = {
  version: 1;               // bump + migrate when the shape changes
  tasks: Task[];
  entries: Entry[];         // every piece of tracked time
  timer: RunningTimer | null;
  weeks: WeekMembership;    // which tasks are rows in which week
  settings: Settings;
  lastImport: ImportBatch | null; // for "Undo import"
};

type Task = {
  id: string;               // random id, never the name (names can be renamed)
  name: string;             // unique, case-insensitive
  hidden: boolean;          // "Hide" in the sidebar
  createdAt: string;        // ISO date-time
};

type Entry = {
  id: string;
  taskId: string;
  date: string;             // "2026-11-09" — the local day the time belongs to
  minutes: number;          // 1:30 = 90; timer sessions keep seconds as a fraction
  source: "timer" | "manual" | "import";
  importId?: string;        // set when source = "import"
};

type RunningTimer = {
  taskId: string;
  startedAt: string;        // ISO date-time; elapsed time is always now − startedAt
};

// key = Monday of the week, "2026-11-09"; value = task ids shown as rows, in order
type WeekMembership = Record<string, string[]>;

type Settings = {
  theme: "system" | "light" | "dark";
  language: "uk" | "en";
  sort: "most-tracked" | "recent" | "name";
  sidebarCollapsed?: boolean;
};

type ImportBatch = { id: string; at: string; entryIds: string[]; createdTaskIds: string[] };
```

## Rules the code follows

- **Totals are never stored.** Day, week, task and all-time totals are always calculated from `entries` — so they can't drift (85 of 200 hand-written weeks were off by 10+ min).
- **A cell = the sum of entries** for that task and day. Editing a cell to 1:45 replaces that day's entries with one `manual` entry of 105 min.
- **Short sessions are never lost.** A 25-second session is stored as 0.4167 min; displays floor like a clock.
- **The timer is a start time, not a counter.** If the tab sleeps or the laptop closes, the time is still right. Stopping it adds one `timer` entry for today.
- **Past midnight:** v1 adds the whole session to the start day; Stop at… shows the date (split screen is v2).
- **Day limit:** a day can't exceed 24:00 per all tasks together.
- **Future days** take no entries.
- **New week:** rows = tasks that had time last week; hours start at zero. Tasks with no time "sleep" and come back from the sidebar or suggestions.
- **Remove from this week** deletes that week's entries for the task and drops it from `weeks[monday]`; the task and other weeks stay.
- **Delete** removes the task and all its entries. Every remove/delete keeps a copy in memory for **Undo** (toast).
- **Rename** changes only `name`; entries point to `id`, so history stays.
- **Import** adds entries with `source: "import"` in one batch → **Undo import** removes exactly that batch.
- **Export** writes the same CSV the import reads: `date,task,duration`.
- **Share:** the link carries a compressed snapshot of the week in the URL itself (no server); the PNG is drawn in the browser.
- **Safety:** every write is wrapped so a full or blocked `localStorage` shows an error instead of losing data; the Data menu reminds people to export a backup.
