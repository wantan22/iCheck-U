import { Link, useSearchParams } from 'react-router-dom';
import { Backpack, Pencil, RotateCcw } from 'lucide-react';
import { useStore } from '../../store/useStore.js';
import { useT } from '../../i18n/index.js';
import { PageHeader, OfflineBadge, Notice } from '../../components/ui.jsx';
import { cx } from '../../utils/format.js';
import GrabGo from './GrabGo.jsx';
import ChecklistPage from './ChecklistPage.jsx';

/** One place for "what to grab" and "where everything is kept". */
export default function GrabList({ ownerType = 'household' }) {
  const t = useT();
  const [params, setParams] = useSearchParams();
  const phase = useStore((s) => s.phase);
  const editing = params.get('edit') === '1';
  const setEditing = (v) => setParams(v ? { edit: '1' } : {}, { replace: true });
  const base = ownerType === 'business' ? '/biz' : '/home';

  return (
    <div className="space-y-5">
      <PageHeader icon={Backpack} title={t('My grab list')} subtitle={t('What to take, and exactly where it is.')} />
      <div className="flex flex-wrap items-center gap-2 no-print"><OfflineBadge /><span className="text-sm muted">{t('Works without internet.')}</span></div>

      <div role="tablist" aria-label={t('Grab list')} className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-line/60 no-print">
        <button type="button" role="tab" aria-selected={!editing} onClick={() => setEditing(false)}
          className={cx('btn btn-lg !rounded-2xl', !editing ? 'btn-primary' : 'bg-transparent')}>
          <Backpack className="h-6 w-6" aria-hidden />{t('Grab now')}
        </button>
        <button type="button" role="tab" aria-selected={editing} onClick={() => setEditing(true)}
          className={cx('btn btn-lg !rounded-2xl', editing ? 'btn-primary' : 'bg-transparent')}>
          <Pencil className="h-6 w-6" aria-hidden />{t('Edit my list')}
        </button>
      </div>

      {phase === 'recovery' && (
        <Notice tone="blue" icon={RotateCcw} title={t('The emergency is over')}>
          <Link to={`${base}/recovery`} className="underline font-bold">{t('Check which items were found, damaged or lost')}</Link>
        </Notice>
      )}

      {editing ? <ChecklistPage ownerType={ownerType} /> : <GrabGo ownerType={ownerType} onEdit={() => setEditing(true)} />}
    </div>
  );
}
