import './Switch.css';

/** Switch (Figma): 32×18, applies right away. Off: bg/control + border/strong; on: bg/accent. role="switch". */
export function Switch({ checked, onChange, labelledBy, describedBy }: { checked: boolean; onChange: (v: boolean) => void; labelledBy?: string; describedBy?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      className={`switch ${checked ? 'is-on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="switch-knob" aria-hidden />
    </button>
  );
}
