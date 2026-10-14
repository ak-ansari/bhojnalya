// Stub of the super admin console (design: AdminConsole). The outlet list,
// plan changes, view-as and the needs-attention queue land with the
// platform_admin API.
import { useTranslation } from 'react-i18next';

import { StubPage } from '@/libs/components/StubPage';

export function PlatformOutletsPage() {
  const { t } = useTranslation();
  return <StubPage title={t('platform.outlets.title')} empty={t('platform.outlets.empty')} />;
}
