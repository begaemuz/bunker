import { useState, type ReactNode } from 'react';
import { UiIcon } from './Icons';

/**
 * Нижнее окно с закреплённой шапкой (заголовок + крестик) и закреплённой
 * панелью действий. Прокручивается только содержимое между ними.
 */
export function Sheet({
  title,
  subtitle,
  onClose,
  children,
  actions,
  head,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
  /** Своя шапка вместо заголовка (например, иконка + название). */
  head?: ReactNode;
}) {
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <div className="grow" style={{ minWidth: 0 }}>
            {head ?? (
              <>
                <div className="sheet-title">{title}</div>
                {subtitle && <div className="small muted">{subtitle}</div>}
              </>
            )}
          </div>
          <button className="sheet-x" onClick={onClose} aria-label="Закрыть">
            <UiIcon kind="close" size={18} />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
        {actions && <div className="sheet-actions">{actions}</div>}
      </div>
    </div>
  );
}

export interface SelectOption<T extends string> {
  value: T;
  label: ReactNode;
  hint?: ReactNode;
  color?: string;
}

/** Свой выпадающий список: кнопка открывает окно выбора с крупными пунктами. */
export function Select<T extends string>({
  value,
  options,
  onChange,
  title,
  className,
  prefix,
}: {
  prefix?: ReactNode;
  value: T;
  options: SelectOption<T>[];
  onChange: (v: T) => void;
  title: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const cur = options.find((o) => o.value === value);
  return (
    <>
      <button className={`select-btn ${className ?? ''}`} onClick={() => setOpen(true)}>
        <span className="grow" style={{ color: cur?.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {prefix}
          {cur?.label}
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <Sheet title={title} onClose={() => setOpen(false)}>
          <div className="option-list">
            {options.map((o) => (
              <button
                key={o.value}
                className={`option${o.value === value ? ' on' : ''}`}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
              >
                <span className="radio" />
                <span className="grow">
                  <span style={{ color: o.color, fontWeight: 800 }}>{o.label}</span>
                  {o.hint && <span className="small muted" style={{ display: 'block' }}>{o.hint}</span>}
                </span>
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </>
  );
}
