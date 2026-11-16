import { useMemo, useState } from 'react';
import { Bell } from 'lucide-react';
import { useStore, identityKeys } from '../store/useStore.js';
import { useT } from '../i18n/index.js';
import { PageHeader, Tabs, Card, EmptyState } from '../components/ui.jsx';
import { NotificationItem } from '../components/Layout.jsx';

export default function Notifications() {
  const t = useT();
  const all = useStore((s) => s.notifications);
  const role = useStore((s) => s.role);
  const identity = useStore((s) => s.identity);
  const [scope, setScope] = useState('mine');
  const [ch, setCh] = useState('all');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const keys = useMemo(() => identityKeys(useStore.getState()), [role, identity]);
  const list = all.filter((n) => (scope === 'all' || n.aud.some((a) => keys.includes(a))) && (ch === 'all' || n.channel === ch));
  return (
    <div className="space-y-4">
      <PageHeader icon={Bell} title={t('Notification log')} subtitle={t('Simulated Push, SMS and WhatsApp messages with timestamps.')} />
      <Tabs label={t('Scope')} value={scope} onChange={setScope} tabs={[{ id: 'mine', label: 'For me' }, { id: 'all', label: 'Everyone (demo)' }]} />
      <Tabs label={t('Channel')} value={ch} onChange={setCh} tabs={[{ id: 'all', label: 'All' }, { id: 'push', label: 'Push' }, { id: 'sms', label: 'SMS' }, { id: 'whatsapp', label: 'WhatsApp' }]} />
      {list.length === 0 ? <Card><EmptyState icon={Bell} title="No messages yet" /></Card> : (
        <ul className="space-y-2">{list.slice(0, 300).map((n) => <NotificationItem key={n.id} n={n} />)}</ul>
      )}
    </div>
  );
}
