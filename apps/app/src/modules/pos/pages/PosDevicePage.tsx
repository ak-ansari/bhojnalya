// The till's device screen: what has not synced, the emergency export, and
// clear/reset behind the safety rails (TRD §8.2).
import { useTranslation } from 'react-i18next';

import { ResetPanel } from '../components/ResetPanel';
import { UnsyncedPanel } from '../components/UnsyncedPanel';

import { useOutboxCounts } from '@/libs/sync/useOutboxCounts';

export function PosDevicePage() {
  const { t } = useTranslation();
  const counts = useOutboxCounts();

  return (
    <div className="flex max-w-2xl flex-col gap-4 p-5">
      <h2 className="text-title font-bold">{t('pos.device.title')}</h2>
      {counts ? (
        <>
          <UnsyncedPanel counts={counts} />
          <ResetPanel counts={counts} />
        </>
      ) : (
        <p className="text-body-sm text-fg-muted">{t('common.loading')}</p>
      )}
    </div>
  );
}
