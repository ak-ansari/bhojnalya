// The KDS route tree's frame. Loaded lazily and imports nothing from the POS.
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router';

import { ScreenShell } from '@/libs/components/ScreenShell';

export function KdsLayout() {
  const { t } = useTranslation();
  return (
    <ScreenShell role="kds" title={t('kds.title')}>
      <Outlet />
    </ScreenShell>
  );
}
