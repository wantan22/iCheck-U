import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Backpack, CheckCircle2, Circle, MapPin, ChevronDown, ListChecks } from 'lucide-react';
import { useT } from '../../i18n/index.js';
import { EmptyState } from '../../components/ui.jsx';
import { useChecklistOwner } from '../../components/checklistShared.js';
import { cx } from '../../utils/format.js';

export default function GrabGo({ ownerType = 'household', onEdit }) {
  const t = useT();
  const owner = useChecklistOwner(ownerType);
  const [got, setGot] = useState({});
  const [more, setMore] = useState(false);
  if (!owner) return null;
  const first = owner.checklist.filter((c) => c.priority === 'first');
  const later = owner.checklist.filter((c) => c.priority === 'time');
  const done = first.filter((c) => got[c.id]).length;
  const people = ownerType === 'business' ? [] : owner.members;
  const base = ownerType === 'business' ? '/biz' : '/home';

  const Item = ({ c, n }) => (
    <li>
      <button type="button" onClick={() => setGot({ ...got, [c.id]: !got[c.id] })} aria-pressed={!!got[c.id]}
        className={cx('w-full text-left card p-5 flex gap-4 items-start border-4 transition', got[c.id] ? 'border-safe opacity-70' : 'border-transparent')}>
        <span className="text-3xl font-extrabold tabular-nums w-10 shrink-0">{n}</span>
        <span className="flex-1 min-w-0">
          <span className={cx('block text-2xl font-extrabold leading-tight', got[c.id] && 'line-through')}>{c.name}</span>
          <span className="flex items-start gap-2 mt-2 text-xl"><MapPin className="h-6 w-6 shrink-0 mt-0.5 text-emergency" aria-hidden />{c.location || t('No location yet')}</span>
          {c.ownerId && <span className="block mt-1 muted">{people.find((m) => m.id === c.ownerId)?.name}</span>}
        </span>
        {got[c.id] ? <CheckCircle2 className="h-10 w-10 text-safe shrink-0" aria-label={t('Grabbed')} /> : <Circle className="h-10 w-10 muted shrink-0" aria-label={t('Not yet')} />}
      </button>
    </li>
  );

  return (
    <div className="space-y-5">
      <div className="rounded-card bg-brand text-neutral-900 p-5">
        <p className="text-xl font-bold">{t('Take these first, in this order. Leave everything else.')}</p>
        <p className="mt-2 text-3xl font-extrabold tabular-nums" aria-live="polite">{done} / {first.length} {t('grabbed')}</p>
      </div>
      {first.length === 0 ? (
        <EmptyState icon={Backpack} title="No 'Grab first' items yet">
          <button type="button" onClick={onEdit} className="btn btn-primary mt-3"><ListChecks className="h-5 w-5" aria-hidden />{t('Set up my list')}</button>
        </EmptyState>
      ) : (
        <ol className="space-y-3">{first.map((c, i) => <Item key={c.id} c={c} n={i + 1} />)}</ol>
      )}
      {later.length > 0 && (
        <section>
          <button type="button" className="btn btn-ghost w-full" onClick={() => setMore(!more)} aria-expanded={more}>
            <ChevronDown className={cx('h-5 w-5 transition-transform', more && 'rotate-180')} aria-hidden />{t('Only if there is time')} ({later.length})
          </button>
          {more && <ol className="space-y-3 mt-3">{later.map((c, i) => <Item key={c.id} c={c} n={first.length + i + 1} />)}</ol>}
        </section>
      )}
      <Link to="/safe-places" className="btn btn-navy btn-lg w-full"><MapPin className="h-6 w-6" aria-hidden />{t('Now go to the nearest safe place')}</Link>
    </div>
  );
}
