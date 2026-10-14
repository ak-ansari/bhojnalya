// The offline strip under the top bar. Offline is a state, not an error: the
// till says billing carries on; the kitchen says it is reconnecting (ADR 0006).
import type { DeviceRole } from '@bhojnalya/contracts';
import { Banner } from '@bhojnalya/ui';
import { useTranslation } from 'react-i18next';

import { useOnlineStatus } from '@/libs/connection/useOnlineStatus';

export interface ConnectionBannerProps {
  role: DeviceRole;
}

export function ConnectionBanner({ role }: ConnectionBannerProps) {
  const online = useOnlineStatus();
  const { t } = useTranslation();
  if (online) return null;

  return (
    <Banner tone="offline" title={t('common.offline.title')} icon={<WifiOffIcon />}>
      {t(`${role}.offline.body`)}
    </Banner>
  );
}

function WifiOffIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="flex-none"
    >
      <path d="M1 1l22 22M16.7 11.1A11 11 0 0119 12.6M5 12.6a11 11 0 015.2-2.5M10.7 5A16 16 0 0122.6 9M1.4 9a16 16 0 014.3-2.7M8.5 16.1a5 5 0 017 0M12 20h.01" />
    </svg>
  );
}
