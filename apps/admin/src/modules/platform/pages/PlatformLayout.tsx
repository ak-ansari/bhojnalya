import { useTranslation } from 'react-i18next';

import { AppShell } from '@/libs/components/AppShell';
import { ROUTE_PATHS } from '@/libs/routing/routePaths';

export function PlatformLayout() {
  const { t } = useTranslation();
  return (
    <AppShell
      brand={t('platform.nav.brand')}
      navLabel={t('platform.nav.label')}
      items={[{ to: ROUTE_PATHS.PLATFORM.OUTLETS, label: t('platform.nav.outlets') }]}
    />
  );
}
