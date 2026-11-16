import { useState } from 'react';
import { KanbanSquare, ChevronRight, ScrollText, Store } from 'lucide-react';
import { useStore, RESCUE_LABEL } from '../../store/useStore.js';
import { useMyOrg } from '../../store/hooks.js';
import { useT } from '../../i18n/index.js';
import { PageHeader, StatusChip, Progress, Card } from '../../components/ui.jsx';
import { suggestTeams } from '../../utils/priority.js';
import { clock, cx } from '../../utils/format.js';
import { useRankedEntities, OrgGate, NoEventNotice } from './shared.jsx';
import DetailPanel from './DetailPanel.jsx';

const COLS = [
  { id: 'unassigned', label: 'Needs a team' },
  { id: 'dispatched', label: 'Dispatched' },
  { id: 'on_the_way', label: 'On the way' },
  { id: 'reached', label: 'Reached' },
  { id: 'rescued', label: 'Rescued' },
  { id: 'further_help', label: 'Needs further help' },
];
const NEXT = { dispatched: 'on_the_way', on_the_way: 'reached', reached: 'rescued', further_help: 'rescued' };

function Inner() {
  const t = useT();
  const org = useMyOrg();
  const st = useStore();
  const ranked = useRankedEntities();
  const [sel, setSel] = useState(null);
  const active = st.phase === 'active' && st.event;
  const board = ranked.filter((x) => x.e.rescue || (x.score >= 60 && x.status !== 'safe'));
  const col = (id) => board.filter((x) => (id === 'unassigned' ? !x.e.rescue : x.e.rescue?.status === id));
  const reached = board.filter((x) => ['reached', 'rescued'].includes(x.e.rescue?.status)).length;
  const busy = new Set(org.teams.filter((x) => x.assignment).map((x) => x.id));

  return (
    <div className="space-y-4">
      <PageHeader icon={KanbanSquare} title={t('Rescue workflow board')} subtitle={t('Priority households and businesses, from claim to rescue.')} />
      {!active && <NoEventNotice />}
      {active && <Card className="!p-4"><Progress value={reached} max={board.length} label={t('Priority households reached')} /></Card>}
      {active && (
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6 items-start">
          {COLS.map((c) => (
            <section key={c.id} className="rounded-card bg-surface border border-line p-3" aria-labelledby={`col-${c.id}`}>
              <h2 id={`col-${c.id}`} className="font-extrabold mb-2 flex justify-between">{t(c.label)}<span className="chip bg-canvas text-xs">{col(c.id).length}</span></h2>
              <ul className="space-y-2">
                {col(c.id).map((x) => {
                  const best = !x.e.rescue && suggestTeams(x.e, x.kind, org.teams, st.event, busy).find((s) => !s.busy);
                  return (
                    <li key={x.e.id} className="rounded-xl border-2 border-line bg-canvas p-3 text-sm">
                      <button type="button" className="text-left w-full" onClick={() => setSel({ coll: x.coll, id: x.e.id })}>
                        <span className="font-bold flex items-center gap-1">{x.kind === 'business' && <Store className="h-4 w-4" aria-hidden />}{x.e.shortAddress}</span>
                        <span className="block muted">{x.e.name}</span>
                        <span className="block mt-1"><StatusChip status={x.status} size="sm" /> <span className="font-bold tabular-nums">{x.score}</span></span>
                        <span className="block mt-1 text-xs">{x.reasons.slice(0, 3).map((r) => t(r)).join(', ')}</span>
                        {x.e.rescue && <span className="block mt-1 text-xs font-semibold">{x.e.rescue.teamName} · {clock(x.e.rescue.history[x.e.rescue.history.length - 1].at)}</span>}
                      </button>
                      {!x.e.rescue && best && (
                        <button type="button" className="btn btn-primary btn-sm w-full mt-2" onClick={() => st.claim(x.coll, x.e.id, org.id, best.team.id)}>{t('Claim for {team}', { team: best.team.name })}</button>
                      )}
                      {x.e.rescue && NEXT[x.e.rescue.status] && (
                        <button type="button" className={cx('btn btn-sm w-full mt-2', NEXT[x.e.rescue.status] === 'rescued' ? 'btn-green' : 'btn-blue')} onClick={() => st.updateRescue(x.coll, x.e.id, NEXT[x.e.rescue.status])}>
                          {t(RESCUE_LABEL[NEXT[x.e.rescue.status]])}<ChevronRight className="h-4 w-4" aria-hidden />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
      <Card>
        <h2 className="h2 flex items-center gap-2 mb-3"><ScrollText className="h-6 w-6" aria-hidden />{t('Activity log')}</h2>
        <ol className="space-y-1 text-sm max-h-[360px] overflow-y-auto">
          {st.activity.map((a) => (
            <li key={a.id} className="flex gap-3 border-b border-line py-1.5 last:border-0">
              <span className="tabular-nums muted w-24 shrink-0">{clock(a.at)}</span>
              <span className={cx(a.type === 'critical' && 'font-bold', a.type === 'missing' && 'font-bold')}>{t(a.text, a.vars)}</span>
            </li>
          ))}
          {st.activity.length === 0 && <li className="muted">{t('Nothing yet.')}</li>}
        </ol>
      </Card>
      {sel && active && <DetailPanel coll={sel.coll} id={sel.id} onClose={() => setSel(null)} />}
    </div>
  );
}

export default function Board() {
  return <OrgGate><Inner /></OrgGate>;
}
