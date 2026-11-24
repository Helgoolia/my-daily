import { IconDownload, IconShare } from '@tabler/icons-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { AppData } from '../data/types';
import { t, tf, type Lang } from '../lib/i18n';
import { buildSnapshot, type Snapshot } from '../lib/snapshot';
import { drawWeek, imageFileName } from '../lib/weekImage';
import { Switch } from './Switch';
import { Tooltip } from './Tooltip';
import './SharePopover.css';

type Props = {
  data: AppData;
  monday: Date;
  now: Date;
  lang: Lang;
  /** Icon-only below 900 px (Figma 768: tooltip "Share") */
  compact: boolean;
  disabled: boolean;
  onDownloaded: (fileName: string) => void;
};

/**
 * Share (Figma Flow 9): Button Secondary M "Share" → Popover (8 px under the button, right edges
 * aligned, kept 8 px inside the window) with a preview that is the PNG itself, "Include task names",
 * the snapshot note and Download PNG. Closes on click outside or Esc.
 */
export function SharePopover({ data, monday, now, lang, compact, disabled, onDownloaded }: Props) {
  const [open, setOpen] = useState(false);
  const [names, setNames] = useState(true);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  // A snapshot is taken when the popover opens (and again when names are switched)
  const take = (withNames: boolean) => setSnap(buildSnapshot(data, monday, now, withNames, (n) => tf(lang, 'taskN', { n: String(n) })));
  useEffect(() => {
    if (!snap) return;
    let alive = true;
    void drawWeek(snap).then((c) => alive && setPreview(c.toDataURL('image/png')));
    return () => { alive = false; };
  }, [snap]);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const b = button.current?.getBoundingClientRect();
      const p = panel.current;
      if (!b || !p) return;
      const w = p.offsetWidth;
      const h = p.offsetHeight;
      const left = Math.max(8, Math.min(b.right - w, window.innerWidth - w - 8));
      const below = b.bottom + 8;
      const top = below + h > window.innerHeight - 8 && b.top - 8 - h >= 8 ? b.top - 8 - h : below;
      setPos({ top, left });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [open, preview]);

  useEffect(() => {
    if (!open) return;
    const outside = (e: MouseEvent) => {
      const el = e.target as Node;
      if (!panel.current?.contains(el) && !button.current?.contains(el)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', esc, true);
    return () => { document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', esc, true); };
  }, [open]);

  const toggle = () => {
    if (open) return setOpen(false);
    setPreview(null);
    take(names);
    setOpen(true);
  };

  const download = async () => {
    if (!snap) return;
    const canvas = await drawWeek(snap);
    const file = imageFileName(snap);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setOpen(false);
      onDownloaded(file);
    }, 'image/png');
  };

  const trigger = (
    <button
      ref={button}
      type="button"
      className={`button button-secondary t-body-m-medium share-button ${compact ? 'is-icon' : ''} ${open ? 'is-pressed' : ''}`}
      onClick={toggle}
      disabled={disabled}
      aria-label={compact ? t(lang, 'share') : undefined}
      aria-expanded={open}
      aria-haspopup="dialog"
    >
      <IconShare size={16} aria-hidden />
      {!compact && t(lang, 'share')}
    </button>
  );

  return (
    <>
      {compact || disabled ? (
        <Tooltip label={disabled ? t(lang, 'shareEmpty') : t(lang, 'share')} placement="below">{trigger}</Tooltip>
      ) : trigger}
      {open &&
        createPortal(
          <div
            ref={panel}
            className="popover share-popover"
            role="dialog"
            aria-label={t(lang, 'shareTitle')}
            style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
          >
            <h2 className="t-body-m-medium popover-title">{t(lang, 'shareTitle')}</h2>
            <div className="share-preview">{preview && <img src={preview} alt="" />}</div>
            <div className="setting-row">
              <div>
                <p id="share-names" className="t-body-m">{t(lang, 'includeNames')}</p>
                <p id="share-names-hint" className="t-body-s setting-hint">{t(lang, names ? 'includeNamesOn' : 'includeNamesOff')}</p>
              </div>
              <Switch
                checked={names}
                onChange={(v) => { setNames(v); take(v); }}
                labelledBy="share-names"
                describedBy="share-names-hint"
              />
            </div>
            <p className="t-body-s setting-hint">{t(lang, 'snapshotNote')}</p>
            <div className="popover-actions">
              <button type="button" className="button button-secondary t-body-m-medium" onClick={() => void download()}>
                <IconDownload size={16} aria-hidden /> {t(lang, 'downloadPng')}
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
