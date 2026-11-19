import type { ReactNode } from 'react';
import { useUi } from '../../stores/uiStore';

export function Bar({
  value,
  max,
  color,
  label,
  shield,
  thin,
  mid,
}: {
  value: number;
  max: number;
  color: string;
  label?: ReactNode;
  shield?: number;
  thin?: boolean;
  mid?: boolean;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const sh = shield && max > 0 ? Math.min(100, (shield / max) * 100) : 0;
  return (
    <div className={`bar${thin ? ' thin' : mid ? ' mid' : ''}`}>
      <div className="bar-fill" style={{ width: `${pct}%`, background: color }} />
      {sh > 0 && <div className="bar-shield" style={{ width: `${sh}%` }} />}
      {label !== undefined && <div className="bar-label">{label}</div>}
    </div>
  );
}

export function ConfirmDialog({
  title,
  text,
  warning,
  confirmLabel,
  danger,
  onConfirm,
  onCancel,
}: {
  title: string;
  text: ReactNode;
  warning?: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="modal-back center" onClick={onCancel}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{text}</p>
        {warning && <div className="warn-box">{warning}</div>}
        <div className="row">
          <button className="btn" onClick={onCancel}>
            Отмена
          </button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Toasts() {
  const toasts = useUi((s) => s.toasts);
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.tone}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}

export function Switch({ on, onChange }: { on: boolean; onChange: () => void }) {
  return <button className={`switch${on ? ' on' : ''}`} onClick={onChange} aria-pressed={on} />;
}
