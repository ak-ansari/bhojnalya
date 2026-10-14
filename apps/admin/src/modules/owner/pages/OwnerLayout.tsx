import { useTranslation } from 'react-i18next';

import { AppShell } from '@/libs/components/AppShell';
import { ROUTE_PATHS } from '@/libs/routing/routePaths';

export function OwnerLayout() {
  const { t } = useTranslation();
  return (
    <AppShell
      brand={t('common.appName')}
      navLabel={t('owner.nav.label')}
      items={[
        { to: ROUTE_PATHS.OWNER.DASHBOARD, label: t('owner.nav.dashboard') },
        { to: ROUTE_PATHS.OWNER.MENU, label: t('owner.nav.menu') },
        { to: ROUTE_PATHS.OWNER.REPORTS, label: t('owner.nav.reports') },
      ]}
    />
  );
}
