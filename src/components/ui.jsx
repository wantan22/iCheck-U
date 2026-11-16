import { useEffect, useRef } from 'react';
import {
  CheckCircle2, AlertTriangle, UserSearch, BellOff, Clock, ShieldCheck, X, Inbox, WifiOff, Wifi,
} from 'lucide-react';
import { useT } from '../i18n/index.js';
import { useStore, isOffline } from '../store/useStore.js';
import { cx } from '../utils/format.js';

// ---------- status system: colour is never the only indicator ----------
export const STATUS = {
  safe: { label: 'Safe', icon: CheckCircle2, bg: 'bg-safe text-white', dot: 'var(--c-safe)', hex: '#2E7D32' },
  needs_help: { label: 'Needs help', icon: AlertTriangle, bg: 'bg-emergency text-white', dot: 'var(--c-emergency)', hex: '#D32F2F' },
  missing: { label: 'Missing', icon: UserSearch, bg: 'bg-missing text-white', dot: 'var(--c-missing)', hex: '#6A1B9A' },
  no_response: { label: 'No response', icon: BellOff, bg: 'bg-alert text-neutral-900', dot: 'var(--c-alert)', hex: '#F57C00' },
  pending: { label: 'Pending', icon: Clock, bg: 'bg-pending text-white', dot: 'var(--c-pending)', hex: '#4B5563' },
  rescued: { label: 'Rescued', icon: ShieldCheck, bg: 'bg-safe text-white', dot: 'var(--c-safe)', hex: '#2E7D32' },
  with_me: { label: 'With me', icon: CheckCircle2, bg: 'bg-safe text-white', dot: 'var(--c-safe)', hex: '#2E7D32' },
  reached: { label: 'Reached', icon: ShieldCheck, bg: 'bg-safe text-white', dot: 'var(--c-safe)', hex: '#2E7D32' },
};

export function StatusChip({ status = 'pending', label, size = 'md', className }) {
  const t = useT();
  const s = STATUS[status] || STATUS.pending;
  const Icon = s.icon;
  return (
    <span className={cx('chip', s.bg, size === 'sm' && 'text-xs px-2 py-0.5', size === 'lg' && 'text-base px-4 py-1.5', className)}>
      <Icon aria-hidden className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      {t(label || s.label)}
    </span>
  );
}

export function Card({ as: As = 'section', className, children, ...rest }) {
  return (
    <As className={cx('card p-5', className)} {...rest}>
      {children}
    </As>
  );
}

export function CardTitle({ icon: Icon, children, action, className }) {
  return (
    <div className={cx('flex items-center justify-between gap-3 mb-3', className)}>
      <h2 className="h2 flex items-center gap-2">
        {Icon && <Icon aria-hidden className="h-6 w-6 shrink-0" />}
        <span>{children}</span>
      </h2>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, icon: Icon, actions }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="h1 flex items-center gap-3">
          {Icon && <Icon aria-hidden className="h-8 w-8" />}
          {title}
        </h1>
        {subtitle && <p className="muted mt-1 text-base">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 no-print">{actions}</div>}
    </header>
  );
}

export function Field({ label, hint, children, id, className }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="label">{label}</label>
      {children}
      {hint && <p className="mt-1 text-sm muted">{hint}</p>}
    </div>
  );
}

export function Toggle({ checked, onChange, label, description, id }) {
  return (
    <label htmlFor={id} className="flex items-center justify-between gap-4 min-h-touch cursor-pointer py-1">
      <span>
        <span className="font-semibold block">{label}</span>
        {description && <span className="text-sm muted block">{description}</span>}
      </span>
      <span className="relative inline-flex shrink-0">
        <input id={id} type="checkbox" role="switch" className="peer sr-only" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-8 w-14 rounded-full bg-pending peer-checked:bg-safe transition-colors peer-focus-visible:ring-4 peer-focus-visible:ring-help/50" />
        <span className="absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow transition-transform peer-checked:translate-x-6" />
      </span>
    </label>
  );
}

export function CheckPill({ checked, onChange, children }) {
  return (
    <label className={cx(
      'inline-flex items-center gap-2 min-h-touch px-4 rounded-2xl border-2 cursor-pointer font-semibold select-none focus-within:ring-4 focus-within:ring-brand/60',
      checked ? 'border-brand bg-brand text-neutral-900' : 'border-line bg-surface',
    )}>
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {children}
    </label>
  );
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  const ref = useRef(null);
  const t = useT();
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    ref.current?.querySelector('button, input, select, textarea, a')?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); prev?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title}
        className={cx('card w-full max-h-[92vh] overflow-y-auto rounded-b-none sm:rounded-card p-6 animate-slidein', size === 'lg' ? 'sm:max-w-3xl' : 'sm:max-w-lg')}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <h2 className="h2">{title}</h2>
          {onClose && (
            <button type="button" className="btn btn-ghost btn-sm !min-h-[44px] !px-3" onClick={onClose} aria-label={t('Close')}>
              <X className="h-5 w-5" aria-hidden /> <span className="sr-only">{t('Close')}</span>
            </button>
          )}
        </div>
        {children}
        {footer && <div className="mt-6 flex flex-wrap justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, children }) {
  const t = useT();
  return (
    <div className="flex flex-col items-center text-center gap-2 py-10 px-4 muted">
      <Icon className="h-12 w-12" aria-hidden />
      <p className="font-bold text-lg text-ink">{t(title)}</p>
      {children && <div className="max-w-md">{children}</div>}
    </div>
  );
}

export function Stat({ label, value, icon: Icon, tone = 'navy', sub }) {
  const tones = {
    navy: 'border-l-navy dark:border-l-white', safe: 'border-l-safe', red: 'border-l-emergency', purple: 'border-l-missing',
    orange: 'border-l-alert', grey: 'border-l-pending', blue: 'border-l-help',
  };
  return (
    <div className={cx('card p-4 border-l-8', tones[tone])}>
      <div className="flex items-center gap-2 text-sm font-semibold muted">
        {Icon && <Icon className="h-4 w-4" aria-hidden />} {label}
      </div>
      <div className="text-3xl font-extrabold mt-1 tabular-nums">{value}</div>
      {sub && <div className="text-xs muted mt-0.5">{sub}</div>}
    </div>
  );
}

export function Progress({ value, max, label, tone = 'bg-safe' }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm font-semibold mb-1"><span>{label}</span><span>{value}/{max} ({pct}%)</span></div>
      <div className="h-4 rounded-full bg-line overflow-hidden" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
        <div className={cx('h-full rounded-full transition-all', tone)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Tabs({ tabs, value, onChange, label }) {
  const t = useT();
  return (
    <div role="tablist" aria-label={label} className="flex gap-2 overflow-x-auto pb-1 no-print">
      {tabs.map((tab) => (
        <button key={tab.id} role="tab" type="button" aria-selected={value === tab.id} onClick={() => onChange(tab.id)}
          className={cx('btn btn-sm whitespace-nowrap', value === tab.id ? 'btn-navy' : 'btn-ghost')}>
          {tab.icon && <tab.icon className="h-4 w-4" aria-hidden />} {t(tab.label)}
          {tab.count != null && <span className="ml-1 rounded-full bg-emergency text-white text-xs px-2 py-0.5">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function OfflineBadge({ ready = true }) {
  const t = useT();
  const online = !useStore(isOffline);
  return online ? (
    <span className="chip bg-safe/15 text-safe dark:text-green-300 border border-safe/40"><Wifi className="h-4 w-4" aria-hidden />{t(ready ? 'Offline ready' : 'Online')}</span>
  ) : (
    <span className="chip bg-caution text-neutral-900"><WifiOff className="h-4 w-4" aria-hidden />{t('Offline — showing saved copy')}</span>
  );
}

export function Notice({ tone = 'blue', icon: Icon, title, children, className }) {
  const tones = {
    blue: 'border-help bg-help/10', red: 'border-emergency bg-emergency/10', amber: 'border-caution bg-caution/15',
    green: 'border-safe bg-safe/10', purple: 'border-missing bg-missing/10', orange: 'border-alert bg-alert/10',
  };
  return (
    <div className={cx('rounded-2xl border-l-8 p-4', tones[tone], className)} role={tone === 'red' ? 'alert' : undefined}>
      <div className="flex gap-3">
        {Icon && <Icon className="h-6 w-6 shrink-0 mt-0.5" aria-hidden />}
        <div className="min-w-0">
          {title && <p className="font-bold">{title}</p>}
          <div className="text-[0.95em]">{children}</div>
        </div>
      </div>
    </div>
  );
}

export const NEED_LABELS = {
  child: 'Child', infant: 'Infant', elderly: 'Elderly', disabled: 'Disabled', bedridden: 'Bedridden',
  pregnant: 'Pregnant', oxygen: 'Oxygen dependent', dialysis: 'Dialysis dependent', mobility: 'Mobility aid', medical: 'Medical condition',
};

export function NeedTags({ needs = [], className }) {
  const t = useT();
  if (!needs.length) return null;
  const strong = ['oxygen', 'dialysis', 'bedridden', 'infant'];
  return (
    <span className={cx('flex flex-wrap gap-1', className)}>
      {needs.map((n) => (
        <span key={n} className={cx('rounded-lg px-2 py-0.5 text-xs font-bold border', strong.includes(n) ? 'bg-emergency/10 border-emergency/40 text-emergency dark:text-red-300' : 'bg-help/10 border-help/30 text-help dark:text-blue-200')}>
          {t(NEED_LABELS[n] || n)}
        </span>
      ))}
    </span>
  );
}
