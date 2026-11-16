import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Clock, XCircle, ShieldOff, Hourglass, Building2 } from 'lucide-react';
import { useStore } from '../../store/useStore.js';
import { useMyOrg } from '../../store/hooks.js';
import { useT } from '../../i18n/index.js';
import { Card, Notice } from '../../components/ui.jsx';
import { scoreEntity } from '../../utils/priority.js';

/** All households + businesses in the active event zones that this org covers, scored and sorted. */
export function useRankedEntities() {
  const households = useStore((s) => s.households);
  const businesses = useStore((s) => s.businesses);
  const event = useStore((s) => s.event);
  const org = useMyOrg();
  return useMemo(() => {
    if (!event) return [];
    const zones = event.zones.filter((z) => !org || !org.coverage?.length || org.coverage.includes(z));
    const list = [
      ...households.filter((h) => zones.includes(h.zone)).map((e) => ({ kind: 'household', coll: 'households', e, ...scoreEntity(e, 'household') })),
      ...businesses.filter((b) => zones.includes(b.zone)).map((e) => ({ kind: 'business', coll: 'businesses', e, ...scoreEntity(e, 'business') })),
    ];
    return list.sort((a, b) => b.score - a.score);
  }, [households, businesses, event, org]);
}

export function OrgGate({ children }) {
  const t = useT();
  const org = useMyOrg();
  const setRole = useStore((s) => s.setRole);
  if (!org) return null;
  if (org.status === 'approved') return children;
  const map = {
    pending: { icon: Hourglass, title: 'Pending approval', body: 'Thank you for registering. An admin is checking your documents. You will get full dashboard access once approved.' },
    rejected: { icon: XCircle, title: 'Application not approved', body: org.rejectReason || 'Please contact the admin.' },
    suspended: { icon: ShieldOff, title: 'Account suspended', body: 'Your access has been suspended by an admin. Contact the admin to appeal.' },
  }[org.status] || { icon: Clock, title: org.status, body: '' };
  return (
    <div className="max-w-xl mx-auto space-y-4">
      <Card className="text-center space-y-3 py-10">
        <map.icon className="h-16 w-16 mx-auto text-caution" aria-hidden />
        <h1 className="h1">{t(map.title)}</h1>
        <p className="font-bold">{org.name}</p>
        <p className="muted">{t(map.body)}</p>
        <ul className="text-left text-sm mx-auto max-w-sm list-disc pl-6">
          <li>{t('Registration number')}: {org.regNo || '—'}</li>
          <li>{t('Documents')}: {org.documents?.length ? org.documents.join(', ') : t('None uploaded')}</li>
          <li>{t('Coverage areas')}: {org.coverage?.join(', ') || '—'}</li>
        </ul>
      </Card>
      <Notice tone="blue" icon={Building2}>
        {t('Demo tip: switch to Admin to approve this organization, or continue with the approved demo organization.')}
        <div className="flex flex-wrap gap-2 mt-2">
          <button type="button" className="btn btn-sm btn-navy" onClick={() => setRole('rescue', { orgId: 'o1' })}>{t('Use approved demo organization')}</button>
          <Link to="/admin/approvals" className="btn btn-sm btn-ghost" onClick={() => setRole('admin')}>{t('Go to Admin approvals')}</Link>
        </div>
      </Notice>
    </div>
  );
}

export function NoEventNotice() {
  const t = useT();
  const phase = useStore((s) => s.phase);
  return (
    <Notice tone={phase === 'recovery' ? 'blue' : 'green'} icon={ShieldOff} title={phase === 'recovery' ? t('Event ended — responder access to household details has ended') : t('No active emergency')}>
      {phase === 'recovery' ? <Link to="/responder/summary" className="underline font-bold">{t('See the post-event summary')}</Link> : t('Household details are hidden until an emergency is activated in your coverage area.')}
    </Notice>
  );
}
