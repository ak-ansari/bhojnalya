// Says billing is paused while the device clock is behind its last bill (ADR 0007).
import { Banner } from '@bhojnalya/ui';
import { useTranslation } from 'react-i18next';

import { useClockBehind } from '../hooks/useClockBehind';

export function ClockBehindBanner() {
  const { t } = useTranslation();
  const { behind } = useClockBehind();
  if (!behind) return null;
  return (
    <Banner tone="danger" title={t('pos.clock.title')}>
      {t('pos.clock.body')}
    </Banner>
  );
}
