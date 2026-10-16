// The POS route tree's frame. Loaded lazily, so a KDS device never downloads
// it or the local database it opens. It runs the sync loop for as long as the
// till's screens are open.
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router';

import { ClockBehindBanner } from './ClockBehindBanner';
import { PosRail } from './PosRail';
import { StorageWarning } from './StorageWarning';
import { UnsyncedBadge } from './UnsyncedBadge';

import { ScreenShell } from '@/libs/components/ScreenShell';
import { LocalDbScope } from '@/libs/local-db/LocalDbScope';
import { useOutboxCounts } from '@/libs/sync/useOutboxCounts';
import { useSyncRunner } from '@/libs/sync/useSyncRunner';

export function PosLayout() {
  return (
    <LocalDbScope>
      <PosFrame />
    </LocalDbScope>
  );
}

function PosFrame() {
  const { t } = useTranslation();
  useSyncRunner();
  const counts = useOutboxCounts();

  return (
    <ScreenShell
      role="pos"
      title={t('pos.title')}
      rail={<PosRail />}
      actions={<UnsyncedBadge counts={counts} />}
      waiting={counts?.total}
      banners={
        <>
          <ClockBehindBanner />
          <StorageWarning />
        </>
      }
    >
      <Outlet />
    </ScreenShell>
  );
}
