import { weekTitle, t, weekRange, weekdayShort } from './i18n';
import { daySum, rowTotal, type Snapshot } from './snapshot';
import { addDays, formatMinutes } from './time';

/**
 * The shared week as a PNG (Figma Flow 9: "the PNG uses the theme the author has on now; the preview
 * shows exactly what will be saved"). Drawn on a canvas from the snapshot, colours read from the live
 * tokens, the app's own fonts. 1200 px wide, drawn at 2× for sharp text.
 */
const W = 1200;
const PAD = 48;
const TASK_W = 320;
const TOTAL_W = 110;
const HEAD_H = 64;
const ROW_H = 56;
const SCALE = 2;

const TEXT = '"Fixel Text", system-ui, sans-serif';
const NUM = '"Public Sans Numeric", "Fixel Text", system-ui, sans-serif';

/** A token's real colour in the current theme (custom properties hold light-dark(), not a colour) */
function colours() {
  const probe = document.createElement('span');
  document.body.appendChild(probe);
  const get = (token: string) => {
    probe.style.color = `var(${token})`;
    return getComputedStyle(probe).color;
  };
  const c = {
    bg: get('--bg-app'),
    primary: get('--text-primary'),
    secondary: get('--text-secondary'),
    subtle: get('--text-subtle'),
    divider: get('--border-divider'),
    line: get('--border-default'),
  };
  probe.remove();
  return c;
}

export async function drawWeek(s: Snapshot): Promise<HTMLCanvasElement> {
  await Promise.all(
    ['700 24px "Fixel Text"', '500 15px "Fixel Text"', '400 13px "Fixel Text"', '400 15px "Public Sans Numeric"', '500 15px "Public Sans Numeric"'].map((f) =>
      document.fonts.load(f, '0123456789:').catch(() => undefined),
    ),
  );
  const lang = s.lang;
  const monday = new Date(s.monday + 'T12:00');
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const dayW = (W - 2 * PAD - TASK_W - TOTAL_W) / 7;
  const gridTop = PAD + 32 + 4 + 20 + 32;
  const H = gridTop + HEAD_H + (s.rows.length + 1) * ROW_H + PAD;

  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(SCALE, SCALE);
  const c = colours();
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'middle';

  const text = (str: string, x: number, y: number, font: string, colour: string, align: CanvasTextAlign = 'left', maxW?: number) => {
    ctx.font = font;
    ctx.fillStyle = colour;
    ctx.textAlign = align;
    let out = str;
    if (maxW && ctx.measureText(out).width > maxW) {
      while (out.length > 1 && ctx.measureText(out + '…').width > maxW) out = out.slice(0, -1);
      out += '…';
    }
    ctx.fillText(out, x, y);
  };
  const line = (y: number, colour: string) => {
    ctx.fillStyle = colour;
    ctx.fillRect(PAD, y, W - 2 * PAD, 1);
  };
  const colX = (i: number) => PAD + TASK_W + dayW * i + dayW / 2;
  const totalX = W - PAD - 16;
  const isFuture = (i: number) => daySum(s, i) === null;

  // Header: "November · Week 2", "9–15 November 2026" (always with the year), week total on the right
  const weekTotal = s.rows.reduce((sum, r) => sum + rowTotal(r.days), 0);
  text(weekTitle(lang, monday), PAD, PAD + 16, `700 24px ${TEXT}`, c.primary);
  text(weekRange(lang, monday, days[6], new Date(s.at), true), PAD, PAD + 32 + 4 + 10, `400 13px ${TEXT}`, c.secondary);
  if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '1px';
  text(t(lang, 'weekTotal').toUpperCase(), W - PAD, PAD + 8, `500 12px ${TEXT}`, c.secondary, 'right');
  if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px';
  text(formatMinutes(weekTotal), W - PAD, PAD + 34, `500 24px ${NUM}`, c.primary, 'right');

  // Day header
  const hy = gridTop + HEAD_H / 2;
  text(t(lang, 'task'), PAD + 16, hy, `400 12px ${TEXT}`, c.secondary);
  days.forEach((d, i) => {
    const weekend = i >= 5;
    text(weekdayShort(lang, d), colX(i), hy - 10, `400 12px ${TEXT}`, weekend ? c.subtle : c.secondary, 'center');
    text(String(d.getDate()), colX(i), hy + 10, `400 15px ${TEXT}`, weekend ? c.secondary : c.primary, 'center');
  });
  text(t(lang, 'total'), totalX, hy, `400 12px ${TEXT}`, c.secondary, 'right');
  line(gridTop + HEAD_H - 1, c.line);

  // Rows: past day without time = «—», future = empty (same as the grid)
  const cell = (m: number | null, i: number, y: number, weight: 400 | 500) => {
    if (m === null || isFuture(i)) return;
    if (m <= 0) text('—', colX(i), y, `500 15px ${TEXT}`, c.subtle, 'center');
    else text(formatMinutes(m), colX(i), y, `${weight} 15px ${NUM}`, c.primary, 'center');
  };
  s.rows.forEach((r, ri) => {
    const top = gridTop + HEAD_H + ri * ROW_H;
    const y = top + ROW_H / 2;
    text(r.name, PAD + 16, y, `500 15px ${TEXT}`, c.primary, 'left', TASK_W - 32);
    r.days.forEach((m, i) => cell(m, i, y, 400));
    text(formatMinutes(rowTotal(r.days)), totalX, y, `500 15px ${NUM}`, c.primary, 'right');
    line(top + ROW_H - 1, c.divider);
  });

  // Total row
  const ty = gridTop + HEAD_H + s.rows.length * ROW_H + ROW_H / 2;
  text(t(lang, 'total'), PAD + 16, ty, `500 15px ${TEXT}`, c.secondary);
  days.forEach((_, i) => cell(daySum(s, i), i, ty, 500));
  text(formatMinutes(weekTotal), totalX, ty, `500 15px ${NUM}`, c.primary, 'right');
  line(ty + ROW_H / 2 - 1, c.divider);
  return canvas;
}

/** my-daily-9-15-nov.png (Figma toast) — the month in English, short, for a safe file name */
export function imageFileName(s: Snapshot): string {
  const monday = new Date(s.monday + 'T12:00');
  const sunday = addDays(monday, 6);
  const mon = (d: Date) => d.toLocaleDateString('en-GB', { month: 'short' }).toLowerCase();
  const range = monday.getMonth() === sunday.getMonth() ? `${monday.getDate()}-${sunday.getDate()}-${mon(sunday)}` : `${monday.getDate()}-${mon(monday)}-${sunday.getDate()}-${mon(sunday)}`;
  return `my-daily-${range}.png`;
}
