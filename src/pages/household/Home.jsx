
import { Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle2, UserSearch, AlertTriangle, MapPin, Backpack, Users, RotateCcw, ChevronRight, Truck, HeartHandshake, DoorClosed, Sun,
} from 'lucide-react';
import { useStore } from '../../store/useStore.js';
import { useMyHousehold, useInEvent } from '../../store/hooks.js';
import { useT } from '../../i18n/index.js';
import { StatusChip, EmptyState } from '../../components/ui.jsx';
import SOSButton from '../../components/SOSButton.jsx';
import RescueProgress from '../../components/RescueProgress.jsx';
import AlertSetup from '../../components/AlertSetup.jsx';
import { Call999Button } from '../../components/CallScreen.jsx';
import { displayStatus } from '../../utils/priority.js';
import { initials } from '../../utils/format.js';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning, {name}' : h < 19 ? 'Good afternoon, {name}' : 'Good evening, {name}';
};
/** Friendly first name. Keeps short Malaysian name prefixes such as "Ah Fook" or "Kak Yah" together. */
export const firstName = (n = '') => {
  const w = n.replace(/^(Puan|Encik|Cik|Dr\.?|Mr\.?|Mrs\.?|Ms\.?)\s+/i, '').split(' ');
  return w[1] && (w[0].length <= 2 || ['Kak', 'Pak', 'Mak', 'Tok'].includes(w[0])) ? `${w[0]} ${w[1]}` : w[0];
};

function NeighbourAsk({ coll, e, me }) {
  const t = useT();
  const report = useStore((s) => s.neighbourReport);
  const send = (r) => report(coll, e.id, me.id, r, '');
  return (
    <section className="card p-5 border-l-8 border-l-caution" aria-label={t('Neighbour check')}>
      <p className="text-lg font-bold flex items-center gap-2"><HeartHandshake className="h-6 w-6" aria-hidden />{t('Can you check on your neighbour?')}</p>
      <p className="mt-1">{t('{name} at {addr} has not answered yet. Only go if it is safe for you.', { name: e.name, addr: e.shortAddress })}</p>
      <div className="grid gap-2 mt-4">
        <button type="button" className="btn btn-green btn-lg" onClick={() => send('ok')}><CheckCircle2 className="h-6 w-6" aria-hidden />{t('They are OK')}</button>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn btn-ghost" onClick={() => send('no_answer')}><DoorClosed className="h-5 w-5" aria-hidden />{t('No answer')}</button>
          <button type="button" className="btn btn-red" onClick={() => send('needs_help')}><AlertTriangle className="h-5 w-5" aria-hidden />{t('They need help')}</button>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const t = useT();
  const nav = useNavigate();
  const h = useMyHousehold();
  const inEvent = useInEvent(h);
  const phase = useStore((s) => s.phase);
  const respond = useStore((s) => s.respondHousehold);
  const households = useStore((s) => s.households);
  const businesses = useStore((s) => s.businesses);
  const alerts = useStore((s) => s.missingAlerts);
  if (!h) return <EmptyState title="No household found">{t('Please sign up first.')}</EmptyState>;

  const me = firstName(h.members[0]?.name);
  const status = displayStatus(h);
  const pending = inEvent && h.checkin.status === 'pending';
  const active = alerts.filter((a) => a.status === 'active');
  const nearbyAlerts = active.filter((a) => a.entityId !== h.id && a.notified.includes(h.id));
  const ownAlert = active.find((a) => a.entityId === h.id);
  const asks = [
    ...households.filter((x) => x.neighbourChecks.some((c) => c.neighbourId === h.id && c.result === 'requested')).map((e) => ({ coll: 'households', e })),
    ...businesses.filter((x) => x.neighbourChecks.some((c) => c.neighbourId === h.id && c.result === 'requested')).map((e) => ({ coll: 'businesses', e })),
  ];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-3xl font-extrabold">{t(greeting(), { name: me })}</h1>
        <p className="muted text-lg">{h.shortAddress}</p>
      </header>

      {/* 1. The one thing that matters right now */}
      {pending ? (
        <section className="card p-6 border-4 border-emergency" aria-labelledby="ask">
          <h2 id="ask" className="text-2xl font-extrabold leading-snug">{t('Is everyone in your family safe?')}</h2>
          {h.members.some((m) => m.age < 13) && <p className="text-lg mt-1">{t('Are the children with you?')}</p>}
          <div className="grid gap-3 mt-5">
            <button type="button" className="btn btn-green btn-lg w-full text-xl" onClick={() => respond(h.id, 'safe')}><CheckCircle2 className="h-7 w-7" aria-hidden />{t('Yes, everyone is safe')}</button>
            <button type="button" className="btn btn-purple btn-lg w-full text-xl" onClick={() => nav('/home/checkin?mode=missing')}><UserSearch className="h-7 w-7" aria-hidden />{t('Someone is missing')}</button>
            <button type="button" className="btn btn-red btn-lg w-full text-xl" onClick={() => nav('/home/checkin?mode=help')}><AlertTriangle className="h-7 w-7" aria-hidden />{t('We need help')}</button>
          </div>
        </section>
      ) : inEvent ? (
        <section className="card p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xl font-bold">
              {status === 'safe' && t('Thank you, {name}. Everyone knows you are safe.', { name: me })}
              {status === 'rescued' && t('You are safe now. Take care, {name}.', { name: me })}
              {status === 'missing' && t('We are looking. Your neighbours and rescuers have been told.')}
              {status === 'needs_help' && t('Help is on its way. Stay where you are if it is safe.')}
              {status === 'no_response' && t('We could not reach you. Please tell us you are safe.')}
            </p>
            <StatusChip status={status} />
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-2 mt-4" aria-label={t('My family')}>
            {h.members.map((m) => (
              <li key={m.id} className="flex items-center gap-2">
                <span className="h-10 w-10 rounded-full bg-brand/30 text-ink grid place-items-center font-extrabold" aria-hidden>{initials(m.name)}</span>
                <span className="font-semibold">{firstName(m.name)}</span>
                <StatusChip status={m.status} size="sm" />
              </li>
            ))}
          </ul>
          <Link to="/home/checkin" className="btn btn-ghost w-full mt-4">{t('Change my answer')}<ChevronRight className="h-5 w-5" aria-hidden /></Link>
        </section>
      ) : phase === 'recovery' ? (
        <Link to="/home/recovery" className="card p-5 flex items-center gap-4 border-l-8 border-l-safe">
          <RotateCcw className="h-9 w-9 text-safe" aria-hidden />
          <span className="flex-1"><span className="block text-xl font-bold">{t('The emergency is over')}</span><span className="block muted">{t('Check your belongings and see how to replace lost documents.')}</span></span>
          <ChevronRight className="h-6 w-6" aria-hidden />
        </Link>
      ) : (
        <section className="card p-5 flex items-center gap-4">
          <Sun className="h-10 w-10 text-safe shrink-0" aria-hidden />
          <div>
            <p className="text-xl font-bold">{t('All is calm today.')}</p>
            <p className="muted">{t('We will alert you if anything happens in your area.')}</p>
          </div>
        </section>
      )}

      {h.rescue && (
        <section className="card p-5 border-l-8 border-l-safe">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-3"><Truck className="h-6 w-6" aria-hidden />{t('Help is on the way')}</h2>
          <RescueProgress rescue={h.rescue} />
        </section>
      )}

      {ownAlert && (
        <Link to="/home/alerts" className="card p-5 flex items-center gap-3 border-l-8 border-l-missing">
          <UserSearch className="h-8 w-8 text-missing shrink-0" aria-hidden />
          <span className="flex-1"><span className="block font-bold text-lg">{t('We are searching for {name}', { name: firstName(ownAlert.name) })}</span><span className="block muted">{t('{n} neighbours have replied.', { n: ownAlert.responses.length })}</span></span>
          <ChevronRight className="h-6 w-6" aria-hidden />
        </Link>
      )}

      {asks.map((a) => <NeighbourAsk key={a.e.id} {...a} me={h} />)}

      {nearbyAlerts.length > 0 && (
        <Link to="/home/alerts" className="card p-5 flex items-center gap-3 border-l-8 border-l-missing">
          <UserSearch className="h-8 w-8 text-missing shrink-0" aria-hidden />
          <span className="flex-1"><span className="block font-bold text-lg">{t('A neighbour is missing: {name}', { name: nearbyAlerts[0].name })}</span><span className="block muted">{t('Tap to see how you can help.')}</span></span>
          <ChevronRight className="h-6 w-6" aria-hidden />
        </Link>
      )}

      {/* 2. SOS */}
      <section className="card p-6 flex flex-col items-center" aria-label={t('Emergency SOS')}>
        <SOSButton household={h} />
        <p className="muted mt-3 text-center">{t('Press only if someone is in danger now. You can cancel within 5 seconds.')}</p>
        <Call999Button className="mt-4" />
      </section>

      <AlertSetup compact />

      {/* 3. Three big shortcuts */}
      <nav aria-label={t('Quick actions')} className="grid gap-3">
        {[
          { to: '/safe-places', icon: MapPin, label: 'Nearest safe place', sub: 'Hospitals, relief centres and safe roads' },
          { to: '/home/grab', icon: Backpack, label: 'My grab list', sub: 'What to take, and where it is' },
          { to: '/home/members', icon: Users, label: 'My family', sub: '{n} people at home' },
        ].map((x) => (
          <Link key={x.to} to={x.to} className="card p-5 flex items-center gap-4 min-h-[88px] hover:border-brand">
            <span className="rounded-2xl bg-brand text-neutral-900 p-3"><x.icon className="h-7 w-7" aria-hidden /></span>
            <span className="flex-1"><span className="block text-xl font-bold">{t(x.label)}</span><span className="block muted">{t(x.sub, { n: h.members.length })}</span></span>
            <ChevronRight className="h-6 w-6" aria-hidden />
          </Link>
        ))}
      </nav>
    </div>
  );
}
