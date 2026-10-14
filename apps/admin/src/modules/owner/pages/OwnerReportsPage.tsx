// Stub of reports (design: OwnerReports). Day-end, GST summary and exports
// land with the reports API.
import { useTranslation } from 'react-i18next';

import { StubPage } from '@/libs/components/StubPage';

export function OwnerReportsPage() {
  const { t } = useTranslation();
  return <StubPage title={t('owner.reports.title')} empty={t('owner.reports.empty')} />;
}
