// Stub of the owner dashboard (design: OwnerDashboard). KPIs, sales by hour
// and channel, and the needs-review strip land with the reports API.
import { useTranslation } from 'react-i18next';

import { StubPage } from '@/libs/components/StubPage';

export function OwnerDashboardPage() {
  const { t } = useTranslation();
  return <StubPage title={t('owner.dashboard.title')} empty={t('owner.dashboard.empty')} />;
}
