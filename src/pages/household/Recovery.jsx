import { useState } from 'react';
import { RotateCcw, FileQuestion, Building, PackageCheck, AlertTriangle, Info, X } from 'lucide-react';
import { useStore } from '../../store/useStore.js';
import { useT } from '../../i18n/index.js';
import { Card, PageHeader, Notice, Modal, Stat, EmptyState } from '../../components/ui.jsx';
import guides from '../../data/replacementGuides.json';
import { CATEGORIES, RECOVERY, useChecklistOwner } from '../../components/checklistShared.js';
import { cx } from '../../utils/format.js';

export const findGuide = (name = '') => {
  const n = name.toLowerCase();
  return guides.find((g) => g.match.some((m) => new RegExp(`\\b${m}`, 'i').test(n)));
};

export function GuideCard({ guide }) {
  const t = useT();
  return (
    <div className="space-y-3">
      <Notice tone="amber" icon={Info}>{t('Demo placeholder — confirm current steps and fees with the agency before you go.')}</Notice>
      <p className="flex items-start gap-2"><Building className="h-5 w-5 mt-0.5 shrink-0" aria-hidden /><span><b>{t('Who to contact')}:</b> {guide.agency}</span></p>
      <div>
        <p className="font-bold">{t('What to bring')}:</p>
        <ul className="list-disc pl-6">{guide.bring.map((b) => <li key={b}>{b}</li>)}</ul>
      </div>
      <p><b>{t('How long')}:</b> {guide.time}</p>
    </div>
  );
}

export default function Recovery({ ownerType = 'household' }) {
  const t = useT();
  const owner = useChecklistOwner(ownerType);
  const phase = useStore((s) => s.phase);
  const op = useStore((s) => s.checklistOp);
  const [guide, setGuide] = useState(null);
  if (!owner) return null;
  const list = owner.checklist;
  const count = (k) => list.filter((c) => c.recovery === k).length;
  const needGuides = list.filter((c) => (c.recovery === 'lost' || c.recovery === 'damaged') && findGuide(c.name));

  return (
    <div className="space-y-5">
      <PageHeader icon={RotateCcw} title={t('Recovery mode')} subtitle={t('Go through your list. Mark each item found, damaged or lost.')} />
      {phase !== 'recovery' && (
        <Notice tone="blue" icon={Info}>{t('Recovery mode opens automatically when an emergency ends. You can preview it now.')}</Notice>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label={t('Items')} value={list.length} />
        <Stat label={t('Found')} value={count('found')} tone="safe" />
        <Stat label={t('Damaged')} value={count('damaged')} tone="orange" />
        <Stat label={t('Lost')} value={count('lost')} tone="red" />
      </div>

      {list.length === 0 && <Card><EmptyState icon={PackageCheck} title="Your checklist is empty" /></Card>}
      <ul className="space-y-3">
        {list.map((c) => {
          const C = CATEGORIES[c.category] || CATEGORIES.documents;
          const g = findGuide(c.name);
          return (
            <li key={c.id} className={cx('card p-4 border-l-8', c.recovery === 'found' ? 'border-l-safe' : c.recovery === 'damaged' ? 'border-l-alert' : c.recovery === 'lost' ? 'border-l-emergency' : 'border-l-line')}>
              <div className="flex items-start gap-3">
                <C.icon className="h-6 w-6 shrink-0 mt-1" aria-hidden />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-lg">{c.name}</p>
                  <p className="muted text-sm">{c.location}</p>
                </div>
                {c.recovery && (
                  <button type="button" className="p-2 rounded-lg hover:bg-canvas" onClick={() => op(ownerType, owner.id, 'update', { id: c.id, patch: { recovery: null } })} aria-label={t('Clear')}><X className="h-5 w-5" aria-hidden /></button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3" role="group" aria-label={t('Recovery status for {name}', { name: c.name })}>
                {Object.entries(RECOVERY).map(([k, r]) => (
                  <button key={k} type="button" aria-pressed={c.recovery === k} className={cx('btn', c.recovery === k ? r.cls : 'btn-ghost')}
                    onClick={() => {
                      op(ownerType, owner.id, 'update', { id: c.id, patch: { recovery: k } });
                      if ((k === 'lost' || k === 'damaged') && g) setGuide({ item: c, guide: g });
                    }}>
                    {t(r.label)}
                  </button>
                ))}
              </div>
              {(c.recovery === 'lost' || c.recovery === 'damaged') && g && (
                <button type="button" className="btn btn-blue btn-sm mt-3" onClick={() => setGuide({ item: c, guide: g })}><FileQuestion className="h-4 w-4" aria-hidden />{t('How to replace this')}</button>
              )}
            </li>
          );
        })}
      </ul>

      {needGuides.length > 0 && (
        <Card>
          <h2 className="h2 flex items-center gap-2 mb-3"><AlertTriangle className="h-6 w-6" aria-hidden />{t('Your replacement to-do list')}</h2>
          <ol className="list-decimal pl-6 space-y-2">
            {needGuides.map((c) => {
              const g = findGuide(c.name);
              return <li key={c.id}><button type="button" className="underline font-semibold text-left" onClick={() => setGuide({ item: c, guide: g })}>{c.name}</button> — {g.agency}</li>;
            })}
          </ol>
        </Card>
      )}

      <Modal open={!!guide} onClose={() => setGuide(null)} title={guide ? `${t('Replacement guide')}: ${guide.guide.item}` : ''}>
        {guide && <GuideCard guide={guide.guide} />}
      </Modal>
    </div>
  );
}
