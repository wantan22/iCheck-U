import { ScrollText, Flag, Check, Ban } from 'lucide-react';
import { useStore } from '../../store/useStore.js';
import { useT } from '../../i18n/index.js';
import { Card, CardTitle, PageHeader, EmptyState } from '../../components/ui.jsx';
import { clock, cx } from '../../utils/format.js';

export default function AccessLog() {
  const t = useT();
  const log = useStore((s) => s.accessLog);
  const reports = useStore((s) => s.reports);
  const setReport = useStore((s) => s.setReport);
  const orgs = useStore((s) => s.orgs);
  const setOrg = useStore((s) => s.setOrgStatus);
  return (
    <div className="space-y-5">
      <PageHeader icon={ScrollText} title={t('Access log and reports')} subtitle={t('Every time a responder opens a household or business record.')} />
      <Card>
        <CardTitle icon={Flag}>{t('Reports against responders')}</CardTitle>
        {reports.length === 0 ? <p className="muted">{t('No reports.')}</p> : (
          <ul className="space-y-2">
            {reports.map((r) => {
              const org = orgs.find((o) => o.name === r.against);
              return (
                <li key={r.id} className="rounded-xl bg-canvas p-3">
                  <p><b>{r.against}</b> — {r.reason}</p>
                  <p className="text-sm muted">{t('By')} {r.by} · {clock(r.at)} · <span className={cx('font-bold', r.status === 'open' && 'text-emergency dark:text-red-300')}>{t(r.status)}</span></p>
                  {r.status === 'open' && (
                    <div className="flex gap-2 mt-2">
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReport(r.id, 'reviewed')}><Check className="h-4 w-4" aria-hidden />{t('Mark reviewed')}</button>
                      {org && org.status === 'approved' && <button type="button" className="btn btn-red btn-sm" onClick={() => { setOrg(org.id, 'suspended', 'Suspended after a resident report.'); setReport(r.id, 'action taken'); }}><Ban className="h-4 w-4" aria-hidden />{t('Suspend organization')}</button>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <Card>
        <CardTitle icon={ScrollText}>{t('Access log')} ({log.length})</CardTitle>
        {log.length === 0 ? <EmptyState icon={ScrollText} title="No records opened yet">{t('Open a household on the responder dashboard to create an entry.')}</EmptyState> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left border-b-2 border-line"><th className="py-2 pr-3">{t('Time')}</th><th className="py-2 pr-3">{t('Who')}</th><th className="py-2 pr-3">{t('Record')}</th><th className="py-2">{t('Action')}</th></tr></thead>
              <tbody>
                {log.map((a) => (
                  <tr key={a.id} className="border-b border-line">
                    <td className="py-2 pr-3 tabular-nums whitespace-nowrap">{clock(a.at)}</td>
                    <td className="py-2 pr-3 font-semibold">{a.who}</td>
                    <td className="py-2 pr-3">{a.recordLabel} <span className="muted">({t(a.recordType)})</span></td>
                    <td className="py-2">{t(a.action)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
