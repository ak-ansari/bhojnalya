// The POS route tree's frame. Loaded lazily, so a KDS device never downloads it.
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router';

import { PosRail } from './PosRail';

import { ScreenShell } from '@/libs/components/ScreenShell';

export function PosLayout() {
  const { t } = useTranslation();
  return (
    <ScreenShell role="pos" title={t('pos.title')} rail={<PosRail />}>
      <Outlet />
    </ScreenShell>
  );
}
