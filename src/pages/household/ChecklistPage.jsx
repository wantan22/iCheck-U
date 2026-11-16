import { IS_ARTIFACT } from '../../utils/env.js';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ListChecks, Plus, Printer, Backpack, Pencil, Trash2, ArrowUp, ArrowDown, ShieldAlert, CalendarCheck, CalendarClock, Camera, LayoutTemplate, RotateCcw, MapPin,
} from 'lucide-react';
import { useStore } from '../../store/useStore.js';
import { useT } from '../../i18n/index.js';
import { Card, PageHeader, Modal, Field, Notice, OfflineBadge, EmptyState, Tabs } from '../../components/ui.jsx';
import templates from '../../data/checklistTemplates.json';
import { CATEGORIES, PRIORITY, FORMAT, looksSecret, useChecklistOwner, cacheOffline } from '../../components/checklistShared.js';
import { daysSince, shortDate, cx } from '../../utils/format.js';

const EMPTY = { name: '', category: 'documents', location: '', ownerId: '', priority: 'first', format: 'physical', photo: '' };

export default function ChecklistPage({ ownerType = 'household' }) {
  const t = useT();
  const owner = useChecklistOwner(ownerType);
  const op = useStore((s) => s.checklistOp);
  const now = useStore((s) => s.now);
  const phase = useStore((s) => s.phase);
  const [edit, setEdit] = useState(null);
  const [tpl, setTpl] = useState(false);
  const [cat, setCat] = useState('all');
  const base = ownerType === 'business' ? '/biz' : '/home';

  useEffect(() => { if (owner) cacheOffline(ownerType, owner); }, [owner, ownerType]);
  const people = ownerType === 'business' ? [] : owner?.members || [];
  const list = owner?.checklist || [];
  const shown = cat === 'all' ? list : list.filter((c) => c.category === cat);
  const stale = list.filter((c) => daysSince(c.verifiedAt, now) > 180);
  const due = list.filter((c) => daysSince(c.verifiedAt, now) > 90 && daysSince(c.verifiedAt, now) <= 180);
  const tplList = templates[ownerType] || templates.household;
  const existing = useMemo(() => new Set(list.map((c) => c.name.toLowerCase())), [list]);
  if (!owner) return null;

  const save = () => {
    if (!edit.value.name.trim()) return;
    const payload = { ...edit.value, ownerId: edit.value.ownerId || null };
    if (edit.id) op(ownerType, owner.id, 'update', { id: edit.id, patch: payload });
    else op(ownerType, owner.id, 'add', payload);
    setEdit(null);
  };
  const ownerName = (id) => people.find((m) => m.id === id)?.name.split(' ')[0];

  return (
    <div className="space-y-5">
      <p className="text-lg">{t('Write down where each important thing is kept, so nobody has to search in a panic.')}</p>
      <Notice tone="amber" icon={ShieldAlert}>
        {t('Only write where things are. Never write PINs, passwords or safe codes.')}
      </Notice>

      {(owner.reviewPrompt || stale.length > 0 || due.length > 0) && (
        <Notice tone="orange" icon={CalendarClock} title={owner.reviewPrompt ? t('New member added — review your list') : t('Review reminder')}>
          <p>{stale.length > 0 && t('{n} items not checked for over 6 months.', { n: stale.length })} {due.length > 0 && t('{n} items due for their 3-month check.', { n: due.length })}</p>
          <button type="button" className="btn btn-sm btn-navy mt-2" onClick={() => op(ownerType, owner.id, 'verifyAll')}><CalendarCheck className="h-4 w-4" aria-hidden />{t('I checked everything today')}</button>
        </Notice>
      )}

      <div className="flex flex-wrap gap-2 no-print">
        <button type="button" className="btn btn-primary" onClick={() => setEdit({ value: { ...EMPTY } })}><Plus className="h-5 w-5" aria-hidden />{t('Add item')}</button>
        <button type="button" className="btn btn-ghost" onClick={() => setTpl(true)}><LayoutTemplate className="h-5 w-5" aria-hidden />{t('Add from ready-made list')}</button>
        {!IS_ARTIFACT && <button type="button" className="btn btn-ghost" onClick={() => window.print()}><Printer className="h-5 w-5" aria-hidden />{t('Print')}</button>}
      </div>

      <Tabs label={t('Categories')} value={cat} onChange={setCat}
        tabs={[{ id: 'all', label: 'All' }, ...Object.entries(CATEGORIES).map(([id, c]) => ({ id, label: c.label, icon: c.icon }))]} />

      {shown.length === 0 && <Card><EmptyState icon={ListChecks} title="Nothing here yet">{t('Start with the ready-made list — it takes two minutes.')}</EmptyState></Card>}

      <ul className="space-y-3 no-print">
        {shown.map((c) => {
          const C = CATEGORIES[c.category] || CATEGORIES.documents;
          const P = PRIORITY[c.priority];
          const age = daysSince(c.verifiedAt, now);
          return (
            <li key={c.id} className="card p-4">
              <div className="flex items-start gap-3">
                <span className="rounded-xl bg-canvas p-2.5"><C.icon className="h-6 w-6" aria-hidden /></span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-lg">{c.name}</p>
                    <span className={cx('chip text-xs', P.cls)}>{t(P.label)}</span>
                  </div>
                  <p className="mt-1 flex items-start gap-1.5"><MapPin className="h-4 w-4 mt-1 shrink-0" aria-hidden />{c.location || <span className="muted">{t('No location yet')}</span>}</p>
                  <p className="text-sm muted mt-1">
                    {t(C.label)} · {t(FORMAT[c.format])}{c.ownerId && ownerName(c.ownerId) ? ` · ${ownerName(c.ownerId)}` : ''} · {t('Checked')} {shortDate(c.verifiedAt)}
                    {age > 180 && <b className="text-emergency dark:text-red-300"> · {t('Review needed')}</b>}
                  </p>
                </div>
                {c.photo && <img src={c.photo} alt={t('Photo of the spot')} className="h-16 w-16 rounded-xl object-cover" />}
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEdit({ id: c.id, value: { ...EMPTY, ...c, ownerId: c.ownerId || '' } })}><Pencil className="h-4 w-4" aria-hidden />{t('Edit')}</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => op(ownerType, owner.id, 'update', { id: c.id, patch: { verifiedAt: new Date().toISOString().slice(0, 10) } })}><CalendarCheck className="h-4 w-4" aria-hidden />{t('Still there')}</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => op(ownerType, owner.id, 'move', { id: c.id, dir: -1 })} aria-label={t('Move up')}><ArrowUp className="h-4 w-4" aria-hidden /></button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => op(ownerType, owner.id, 'move', { id: c.id, dir: 1 })} aria-label={t('Move down')}><ArrowDown className="h-4 w-4" aria-hidden /></button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => op(ownerType, owner.id, 'remove', { id: c.id })}><Trash2 className="h-4 w-4" aria-hidden />{t('Delete')}</button>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Printable one-page version */}
      <section className="print-only">
        <h1 style={{ fontSize: '18pt', fontWeight: 800 }}>iCheck-U — {t('Where is everything')}: {owner.name}</h1>
        <p>{owner.address} · {t('Printed')} {shortDate(new Date())}</p>
        {['first', 'time', 'leave'].map((p) => (
          <div key={p} style={{ marginTop: '10pt' }}>
            <h2 style={{ fontSize: '13pt', fontWeight: 700, borderBottom: '2px solid #000' }}>{t(PRIORITY[p].label)}</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
              <tbody>
                {list.filter((c) => c.priority === p).map((c, i) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #ccc' }}>
                    <td style={{ padding: '3pt', width: '4%' }}>☐</td>
                    <td style={{ padding: '3pt', width: '30%', fontWeight: 700 }}>{i + 1}. {c.name}</td>
                    <td style={{ padding: '3pt' }}>{c.location}</td>
                    <td style={{ padding: '3pt', width: '14%' }}>{t(FORMAT[c.format])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        <p style={{ marginTop: '12pt', fontSize: '9pt' }}>{t('Store locations only — never the documents')}. {t('In a real emergency call 999.')}</p>
      </section>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? t('Edit item') : t('Add item')} size="lg"
        footer={<><button type="button" className="btn btn-ghost" onClick={() => setEdit(null)}>{t('Cancel')}</button><button type="button" className="btn btn-green" onClick={save}>{t('Save')}</button></>}>
        {edit && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('Item name')} id="ci-name" className="sm:col-span-2"><input id="ci-name" className="input" value={edit.value.name} onChange={(e) => setEdit({ ...edit, value: { ...edit.value, name: e.target.value } })} /></Field>
            <Field label={t('Where exactly is it kept?')} id="ci-loc" className="sm:col-span-2" hint={t('e.g. Master bedroom, second drawer, blue folder')}>
              <textarea id="ci-loc" className="input min-h-[80px]" value={edit.value.location} onChange={(e) => setEdit({ ...edit, value: { ...edit.value, location: e.target.value } })} />
            </Field>
            {looksSecret(edit.value.location + ' ' + edit.value.name) && (
              <div className="sm:col-span-2"><Notice tone="red" icon={ShieldAlert}>{t('This looks like a PIN, password or code. Please remove it — only write where the item is.')}</Notice></div>
            )}
            <Field label={t('Category')} id="ci-cat">
              <select id="ci-cat" className="input" value={edit.value.category} onChange={(e) => setEdit({ ...edit, value: { ...edit.value, category: e.target.value } })}>
                {Object.entries(CATEGORIES).map(([k, c]) => <option key={k} value={k}>{t(c.label)}</option>)}
              </select>
            </Field>
            <Field label={t('Priority')} id="ci-pri">
              <select id="ci-pri" className="input" value={edit.value.priority} onChange={(e) => setEdit({ ...edit, value: { ...edit.value, priority: e.target.value } })}>
                {Object.entries(PRIORITY).map(([k, c]) => <option key={k} value={k}>{t(c.label)}</option>)}
              </select>
            </Field>
            <Field label={t('Format')} id="ci-fmt">
              <select id="ci-fmt" className="input" value={edit.value.format} onChange={(e) => setEdit({ ...edit, value: { ...edit.value, format: e.target.value } })}>
                {Object.entries(FORMAT).map(([k, l]) => <option key={k} value={k}>{t(l)}</option>)}
              </select>
            </Field>
            {people.length > 0 && (
              <Field label={t('Belongs to')} id="ci-own">
                <select id="ci-own" className="input" value={edit.value.ownerId} onChange={(e) => setEdit({ ...edit, value: { ...edit.value, ownerId: e.target.value } })}>
                  <option value="">{t('Whole household')}</option>
                  {people.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </Field>
            )}
            <Field label={`${t('Photo of the spot')} (${t('optional')})`} id="ci-photo" className="sm:col-span-2">
              <div className="flex items-center gap-3">
                {edit.value.photo ? <img src={edit.value.photo} alt="" className="h-16 w-16 rounded-xl object-cover" /> : <Camera className="h-6 w-6 muted" aria-hidden />}
                <input id="ci-photo" type="file" accept="image/*" className="text-sm" onChange={(e) => e.target.files?.[0] && setEdit({ ...edit, value: { ...edit.value, photo: URL.createObjectURL(e.target.files[0]) } })} />
              </div>
            </Field>
          </div>
        )}
      </Modal>

      <Modal open={tpl} onClose={() => setTpl(false)} title={t('Ready-made list')} size="lg"
        footer={<button type="button" className="btn btn-navy" onClick={() => setTpl(false)}>{t('Done')}</button>}>
        <p className="muted mb-3">{t('Tap to add. Then edit each item to write where it is kept.')}</p>
        {Object.entries(CATEGORIES).map(([k, c]) => {
          const items = tplList.filter((x) => x.category === k);
          if (!items.length) return null;
          return (
            <div key={k} className="mb-4">
              <p className="font-bold flex items-center gap-2 mb-2"><c.icon className="h-5 w-5" aria-hidden />{t(c.label)}</p>
              <div className="flex flex-wrap gap-2">
                {items.map((x) => {
                  const has = existing.has(x.name.toLowerCase());
                  return (
                    <button key={x.name} type="button" disabled={has} className={cx('btn btn-sm', has ? 'btn-green' : 'btn-ghost')}
                      onClick={() => op(ownerType, owner.id, 'add', { name: x.name, category: x.category, priority: x.priority, location: '' })}>
                      {has ? '✓ ' : '+ '}{x.name}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </Modal>
    </div>
  );
}
