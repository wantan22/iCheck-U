import { Bell, MessageSquare, Users, LifeBuoy, CheckCircle2 } from 'lucide-react';
import { useStore, totalEscalationMs, NB_LABEL } from '../store/useStore.js';
import { useT } from '../i18n/index.js';
import { elapsed, cx } from '../utils/format.js';

const STEPS = [
  { step: 0, icon: Bell, label: 'We asked: are you safe?' },
  { step: 1, icon: MessageSquare, label: 'We reminded you by SMS and WhatsApp' },
  { step: 2, icon: Users, label: 'We asked your neighbours to check on you' },
  { step: 3, icon: LifeBuoy, label: 'We told the rescue team' },
];

/** Plain-language view of what happens when someone does not answer. */
export default function EscalationTimeline({ entity }) {
  const t = useT();
  const now = useStore((s) => s.now);
  const T = useStore((s) => totalEscalationMs(s));
  if (!entity) return null;
  const notifiedAt = entity.checkin.notifiedAt;
  if (!notifiedAt) return <p className="muted text-lg">{t('Nothing to show. There is no emergency in this area right now.')}</p>;

  const answered = !['pending', 'no_response'].includes(entity.checkin.status);
  const done = (n) => entity.escalation.some((e) => e.step === n);
  const nextStep = STEPS.find((s) => !done(s.step));
  const checks = (entity.neighbourChecks || []).filter((c) => c.result !== 'requested');

  return (
    <div className="space-y-4">
      {answered && (
        <p className="rounded-2xl bg-safe/10 border-2 border-safe/40 p-4 font-bold text-lg flex items-center gap-2">
          <CheckCircle2 className="h-6 w-6 text-safe shrink-0" aria-hidden />{t('Answered — no more steps needed.')}
        </p>
      )}
      <ol className="space-y-3" aria-label={t('Steps')}>
        {STEPS.map((s) => {
          const isDone = done(s.step);
          const isNext = !answered && nextStep?.step === s.step;
          const skipped = !isDone && answered;
          const due = notifiedAt + (s.step * T) / 3;
          return (
            <li key={s.step} className={cx('flex items-center gap-4 rounded-2xl p-3 border-2', isDone ? 'border-brand bg-brand/10' : isNext ? 'border-caution' : 'border-line opacity-60')}>
              <span className={cx('h-12 w-12 rounded-full grid place-items-center shrink-0', isDone ? 'bg-brand text-neutral-900' : 'bg-line')}>
                {isDone ? <CheckCircle2 className="h-6 w-6" aria-hidden /> : <s.icon className="h-6 w-6" aria-hidden />}
              </span>
              <span className="flex-1">
                <span className="block font-bold text-lg leading-snug">{t(s.label)}</span>
                <span className="block muted">
                  {isDone ? t('Done') : skipped ? t('Not needed') : isNext ? (now < due ? t('In {time}', { time: elapsed(due - now) }) : t('Now')) : t('Later, if still no answer')}
                </span>
                {s.step === 2 && checks.map((c) => (
                  <span key={c.neighbourId} className="block text-sm mt-1">{c.name}: <b>{t(NB_LABEL[c.result])}</b></span>
                ))}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
