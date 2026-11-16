import { Truck, ShieldCheck, Navigation, MapPinned, AlertTriangle } from 'lucide-react';
import { useT } from '../i18n/index.js';
import { RESCUE_LABEL } from '../store/useStore.js';
import { clock, cx } from '../utils/format.js';

const STEPS = [
  { id: 'dispatched', icon: Truck },
  { id: 'on_the_way', icon: Navigation },
  { id: 'reached', icon: MapPinned },
  { id: 'rescued', icon: ShieldCheck },
];

export default function RescueProgress({ rescue, compact = false }) {
  const t = useT();
  if (!rescue) return null;
  const idx = rescue.status === 'further_help' ? 2 : STEPS.findIndex((s) => s.id === rescue.status);
  const at = (id) => rescue.history.find((h) => h.status === id)?.at;
  return (
    <div>
      {!compact && <p className="font-bold mb-2">{t('{team} is assigned to you', { team: rescue.teamName })}</p>}
      <ol className="grid grid-cols-4 gap-1" aria-label={t('Rescue progress')}>
        {STEPS.map((s, i) => (
          <li key={s.id} className="flex flex-col items-center text-center gap-1">
            <span className={cx('h-10 w-10 rounded-full grid place-items-center', i <= idx ? 'bg-safe text-white' : 'bg-line muted')}>
              <s.icon className="h-5 w-5" aria-hidden />
            </span>
            <span className={cx('text-xs font-bold', i === idx ? '' : 'muted')}>{t(RESCUE_LABEL[s.id])}</span>
            {!compact && <span className="text-[0.65rem] muted tabular-nums">{at(s.id) ? clock(at(s.id)) : ''}</span>}
          </li>
        ))}
      </ol>
      {rescue.status === 'further_help' && (
        <p className="mt-2 font-bold flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-alert" aria-hidden />{t('Needs further help')}</p>
      )}
    </div>
  );
}
