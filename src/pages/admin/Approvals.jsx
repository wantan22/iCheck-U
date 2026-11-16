import { useState } from 'react';
import { UserCheck, FileText, Check, X, Ban, RotateCcw, Award, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { CERT_TYPES, certState } from '../Register.jsx';
import { useStore } from '../../store/useStore.js';
import { useT } from '../../i18n/index.js';
import { PageHeader } from '../../components/ui.jsx';
import { cx } from '../../utils/format.js';

const ORG_STATUS = { approved: 'bg-safe text-white', pending: 'bg-caution text-neutral-900', rejected: 'bg-emergency text-white', suspended: 'bg-pending text-white' };

export default function Approvals() {
  const t = useT();
  const orgs = useStore((s) => s.orgs);
  const setOrg = useStore((s) => s.setOrgStatus);
  const setCert = useStore((s) => s.setCertificate);
  const [reason, setReason] = useState({});
  const sorted = [...orgs].sort((a) => (a.status === 'pending' ? -1 : 1));
  return (
    <div className="space-y-5">
      <PageHeader icon={UserCheck} title={t('Approval queue')} subtitle={t('Check rescue organizations before they can see household details.')} />
      <ul className="space-y-3">
        {sorted.map((o) => (
          <li key={o.id} className="card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-bold text-lg">{o.name}</p>
                <p className="muted text-sm">{o.type} · {o.regNo} · {t('Coverage')}: {o.coverage?.join(', ')} · {o.contactPerson} · {o.phone}</p>
                <p className="text-sm mt-1">{t('Resources')}: {Object.entries(o.capabilities || {}).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(', ') || '—'}</p>
                <p className="text-sm mt-1 flex items-center gap-1"><FileText className="h-4 w-4" aria-hidden />{o.documents?.length ? o.documents.join(', ') : t('No documents')}</p>
                {o.rejectReason && <p className="text-sm mt-1"><b>{t('Reason')}:</b> {o.rejectReason}</p>}
              </div>
              <span className={cx('chip', ORG_STATUS[o.status])}>{t(o.status)}</span>
            </div>
            <div className="mt-3 rounded-2xl bg-canvas p-3">
              <p className="font-bold flex items-center gap-2 mb-2"><Award className="h-5 w-5" aria-hidden />{t('Certificates')} ({(o.certificates || []).length})</p>
              {!(o.certificates || []).length ? (
                <p className="text-sm font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-emergency" aria-hidden />{t('No certificates uploaded. Do not approve until they are provided.')}</p>
              ) : (
                <ul className="space-y-2">
                  {o.certificates.map((c, i) => {
                    const state = certState(c);
                    return (
                      <li key={i} className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-semibold">{t(CERT_TYPES[c.type] || c.type)}</span>
                        <span className="muted">· {c.holder} · {c.number} · {c.issuer || '—'} · {c.file}</span>
                        <span className={cx('chip text-xs', state === 'expired' ? 'bg-emergency text-white' : state === 'soon' ? 'bg-caution text-neutral-900' : 'bg-safe text-white')}>
                          {state === 'expired' ? t('Expired') : state === 'soon' ? t('Expires soon') : c.expiry ? `${t('Valid until')} ${c.expiry}` : t('No expiry')}
                        </span>
                        {c.verified
                          ? <span className="chip text-xs bg-safe text-white"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden />{t('Checked')}</span>
                          : <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCert(o.id, i, { verified: true })}><Check className="h-4 w-4" aria-hidden />{t('Mark as checked')}</button>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {o.status !== 'approved' && o.status !== 'suspended' && <button type="button" className="btn btn-green btn-sm" disabled={!(o.certificates || []).length} onClick={() => setOrg(o.id, 'approved')}><Check className="h-4 w-4" aria-hidden />{t('Approve')}</button>}
              {o.status === 'pending' && (
                <>
                  <input className="input !min-h-[40px] max-w-xs" aria-label={t('Reason for rejection')} placeholder={t('Reason for rejection')} value={reason[o.id] || ''} onChange={(e) => setReason({ ...reason, [o.id]: e.target.value })} />
                  <button type="button" className="btn btn-red btn-sm" onClick={() => setOrg(o.id, 'rejected', reason[o.id] || '')}><X className="h-4 w-4" aria-hidden />{t('Reject')}</button>
                </>
              )}
              {o.status === 'approved' && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOrg(o.id, 'suspended')}><Ban className="h-4 w-4" aria-hidden />{t('Suspend')}</button>}
              {o.status === 'suspended' && <button type="button" className="btn btn-navy btn-sm" onClick={() => setOrg(o.id, 'approved')}><RotateCcw className="h-4 w-4" aria-hidden />{t('Reinstate')}</button>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
