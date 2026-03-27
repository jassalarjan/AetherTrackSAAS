import { useId } from 'react';
import './CyberToggle.css';

export default function CyberToggle({ checked, onChange, disabled = false, label = 'Toggle feature' }) {
  const id = useId();
  const isOn = Boolean(checked);

  return (
    <div className="matrix-toggle-wrapper" aria-disabled={disabled}>
      <span className={`matrix-toggle-state ${isOn ? 'is-on' : 'is-off'}`} aria-hidden="true">
        {isOn ? 'On' : 'Off'}
      </span>
      <input
        className="matrix-toggle-checkbox"
        id={id}
        type="checkbox"
        checked={isOn}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        aria-label={label}
      />
      <label className="matrix-toggle-switch" htmlFor={id}>
        <span className="matrix-toggle-knob" />
      </label>
    </div>
  );
}
