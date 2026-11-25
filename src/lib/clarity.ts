/**
 * Microsoft Clarity for the first round of tests: session recordings without screen sharing.
 *
 * - Runs only on production (my-daily-black.vercel.app), not in dev, previews, `?demo` or the shared-week viewer
 *   (its link carries the snapshot, and its visitors aren't testers).
 * - Personal links `?t=natasha` tag the session as `tester = natasha`; the name is kept in localStorage,
 *   so a tester who comes back without `?t=` is still tagged, and `t` is taken out of the address.
 * - Task names never reach Clarity: elements that show them carry `data-clarity-mask` (MASK below),
 *   inputs are always masked by Clarity, and the tab title drops the task name while recording
 *   (Clarity records <title> text unmasked). aria-label and title attributes aren't recorded at all.
 */

const PROJECT_ID = 'zj7a1huh9u';
const HOST = 'my-daily-black.vercel.app';
const TESTER_KEY = 'mydaily-tester';

/** Spread on any element whose text can contain a task name. */
export const MASK = { 'data-clarity-mask': 'true' } as const;

const params = new URLSearchParams(location.search);

export const recording =
  import.meta.env.PROD && location.hostname === HOST && !params.has('demo') && !location.hash.startsWith('#s=');

/** "Natasha K." → "natasha-k"; empty when nothing usable is left. */
export function testerTag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
}

function rememberTester(): string | null {
  const fromLink = params.get('t');
  try {
    if (fromLink !== null) {
      const tag = testerTag(fromLink);
      if (tag) localStorage.setItem(TESTER_KEY, tag);
      params.delete('t');
      const query = params.toString();
      history.replaceState(history.state, '', location.pathname + (query ? `?${query}` : '') + location.hash);
    }
    return localStorage.getItem(TESTER_KEY);
  } catch {
    return fromLink ? testerTag(fromLink) || null : null;
  }
}

type ClarityFn = ((...args: unknown[]) => void) & { q?: unknown[][] };

export function startClarity() {
  const tester = rememberTester();
  if (!recording) return;
  const w = window as unknown as { clarity?: ClarityFn };
  // Clarity's own snippet: queue calls until the script arrives
  w.clarity =
    w.clarity ||
    Object.assign((...args: unknown[]) => {
      (w.clarity!.q = w.clarity!.q || []).push(args);
    }, {});
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.clarity.ms/tag/${PROJECT_ID}`;
  document.head.appendChild(script);
  if (tester) w.clarity('set', 'tester', tester);
}
