import { useState, type ReactNode } from 'react';
import { clock, dayWord, resolveStop, stopOptions, suggestStop } from '../lib/forgotten';
import { t, tf, type Lang } from '../lib/i18n';
import { formatMinutes } from '../lib/time';
import { Dialog } from './Dialog';
import { TimePicker } from './TimePicker';

type Props = {
  lang: Lang;
  taskName: string;
  startedAt: Date;
  now: Date;
  /** When the tab was last left — the likely moment work stopped */
  lastSeen: Date | null;
  onKeep: () => void;
  onStopAt: (at: Date) => void;
  onDiscard: () => void;
};

/**
 * Sentence with facts in bold (task name, clock times), punctuation right after a fact bold too, as in
 * Figma: "**My Daily** started today at **09:48.**"
 */
function bold(text: string, facts: Record<string, string>): ReactNode {
  return text.split(/(\{\w+\}[.,:]?|\n)/).map((part, i) => {
    if (part === '\n') return <br key={i} />;
    const m = part.match(/^\{(\w+)\}([.,:]?)$/);
    if (!m || !(m[1] in facts)) return part;
    return m[1] === 'when' ? facts[m[1]] + m[2] : <strong key={i}>{facts[m[1]]}{m[2]}</strong>;
  });
}

/**
 * Forgotten timer — Figma Flow 7. Step 1 "Timer has been running for 9:12": Keep all · Stop at….
 * Step 2 "Stop the timer at…": picker (session start → now), live session hint, Discard (quiet, left),
 * Back, Stop timer. Esc / scrim on step 1 = Keep all; on step 2 = Back.
 */
export function ForgottenTimer({ lang, taskName, startedAt, now, lastSeen, onKeep, onStopAt, onDiscard }: Props) {
  const [step, setStep] = useState<'ask' | 'pick'>('ask');
  const [value, setValue] = useState(() => clock(suggestStop(startedAt, now, lastSeen)));
  const [tried, setTried] = useState(false);
  // While a time is half-typed the hint keeps the last valid session, so the dialog doesn't jump
  const [lastValid, setLastValid] = useState<Date | null>(null);

  const day = dayWord(startedAt, now);
  const when =
    day === 'today' ? t(lang, 'whenToday')
    : day === 'yesterday' ? t(lang, 'whenYesterday')
    : (lang === 'uk' ? '' : 'on ') + startedAt.toLocaleDateString(lang === 'uk' ? 'uk-UA' : 'en-GB', { day: 'numeric', month: 'long' });
  const facts = { name: taskName, start: clock(startedAt), when };
  const running = formatMinutes((now.getTime() - startedAt.getTime()) / 60_000);

  if (step === 'ask') {
    return (
      <Dialog
        key="ask" // a new dialog per step, so its initial focus runs again
        title={tf(lang, 'forgotTitle', { time: running })}
        description={bold(t(lang, 'forgotBody'), facts)}
        onCancel={onKeep}
        initialFocus="dialog"
        actions={
          <>
            <button type="button" className="button button-secondary t-body-m-medium" onClick={onKeep}>{t(lang, 'keepAll')}</button>
            <button type="button" className="button button-primary t-body-m-medium" onClick={() => setStep('pick')}>{t(lang, 'stopAt')}</button>
          </>
        }
      />
    );
  }

  const stopAt = resolveStop(value, startedAt, now);
  if (stopAt && stopAt.getTime() !== lastValid?.getTime()) setLastValid(stopAt);
  const hintAt = stopAt ?? lastValid;
  const showError = tried && !stopAt;
  const submit = () => (stopAt ? onStopAt(stopAt) : setTried(true));
  return (
    <Dialog
      key="pick"
      title={t(lang, 'stopAtTitle')}
      description={bold(t(lang, 'stopAtBody'), facts)}
      onCancel={() => setStep('ask')}
      initialFocus=".picker-input"
      actions={
        <>
          <button type="button" className="button button-ghost t-body-m-medium" onClick={onDiscard}>{t(lang, 'discardSession')}</button>
          <div className="dialog-buttons">
            <button type="button" className="button button-secondary t-body-m-medium" onClick={() => setStep('ask')}>{t(lang, 'back')}</button>
            <button type="button" className="button button-primary t-body-m-medium" onClick={submit}>{t(lang, 'stopTimer')}</button>
          </div>
        </>
      }
    >
      <TimePicker
        value={value}
        onChange={(v) => { setValue(v); setTried(false); }}
        options={stopOptions(startedAt, now).map(clock)}
        onSubmit={submit}
        label={t(lang, 'stopAtLabel')}
        toggleLabel={t(lang, 'showTimes')}
        invalid={showError}
        describedBy="stop-at-hint"
      />
      <p id="stop-at-hint" className={`t-body-s picker-hint ${showError ? 'is-error' : ''}`} aria-live="polite">
        {showError
          ? tf(lang, 'stopAtError', { from: clock(startedAt), to: clock(now) })
          : hintAt
            ? tf(lang, 'sessionHint', { time: formatMinutes((hintAt.getTime() - startedAt.getTime()) / 60_000), from: clock(startedAt), to: clock(hintAt) })
            : ' '}
      </p>
    </Dialog>
  );
}
