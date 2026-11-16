import { GitBranch } from 'lucide-react';
import { useMyHousehold } from '../../store/hooks.js';
import { useT } from '../../i18n/index.js';
import { Card, PageHeader } from '../../components/ui.jsx';
import EscalationTimeline from '../../components/EscalationTimeline.jsx';

export default function Escalation() {
  const t = useT();
  const h = useMyHousehold();
  return (
    <div className="space-y-5">
      <PageHeader icon={GitBranch} title={t("If we can't reach you")} subtitle={t('No one is left unchecked. If you do not answer, we keep trying — step by step.')} />
      <Card><EscalationTimeline entity={h} /></Card>
    </div>
  );
}
