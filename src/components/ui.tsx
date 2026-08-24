import type { ReactNode, ChangeEvent } from 'react';
import { initials, colorFor } from '../lib/format';

export function Spinner() {
  return <div className="spinner" aria-label="Loading" />;
}

export function Avatar({
  name,
  id,
  size = 48,
  url,
}: {
  name: string;
  id: string;
  size?: number;
  url?: string | null;
}) {
  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        background: url ? 'transparent' : colorFor(id),
        fontSize: Math.round(size * 0.36),
      }}
    >
      {url ? <img src={url} alt={name} /> : initials(name)}
    </div>
  );
}

export function Badge({
  children,
  tone = 'plain',
}: {
  children: ReactNode;
  tone?: 'plain' | 'verified' | 'gold' | 'warn';
}) {
  const cls =
    tone === 'verified'
      ? 'badge badge-verified'
      : tone === 'gold'
        ? 'badge badge-gold'
        : tone === 'warn'
          ? 'badge badge-warn'
          : 'badge';
  return <span className={cls}>{children}</span>;
}

export function Notice({
  children,
  tone = 'plain',
}: {
  children: ReactNode;
  tone?: 'plain' | 'error' | 'ok' | 'gold';
}) {
  const cls =
    tone === 'error'
      ? 'notice notice-error'
      : tone === 'ok'
        ? 'notice notice-ok'
        : tone === 'gold'
          ? 'notice notice-gold'
          : 'notice';
  return <div className={cls}>{children}</div>;
}

export function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required,
  max,
  autoComplete,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  max?: string;
  autoComplete?: string;
  hint?: string;
}) {
  return (
    <label className="field">
      <span className="label">{label}</span>
      <input
        type={type}
        value={value}
        max={max}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      />
      {hint ? <span className="tiny muted">{hint}</span> : null}
    </label>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  maxLength = 1500,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <label className="field">
      <span className="label">{label}</span>
      <textarea
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
      />
      <span className="tiny muted">
        {value.length} / {maxLength}
      </span>
    </label>
  );
}

export function Select({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select…',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <label className="field">
      <span className="label">{label}</span>
      <select
        value={value}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ChipGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="field">
      <span className="label">{label}</span>
      <div className="row wrap" style={{ gap: 8 }}>
        {options.map((o) => (
          <button
            type="button"
            key={o}
            className={selected.includes(o) ? 'chip on' : 'chip'}
            onClick={() => onToggle(o)}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="row-between" style={{ marginBottom: 14 }}>
          <h2 style={{ fontSize: 20 }}>{title}</h2>
          <button className="btn-ghost" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="card center" style={{ padding: 40 }}>
      <h3 style={{ fontSize: 18, marginBottom: 8 }}>{title}</h3>
      <p className="muted small">{body}</p>
    </div>
  );
}
