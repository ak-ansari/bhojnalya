// Asks for persistent storage when the till opens and warns when bills could
// be evicted: storage not granted, or an iPad not opened from the Home Screen
// (TRD §8.2, ADR 0006).
import { Banner } from '@bhojnalya/ui';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  needsHomeScreenInstall,
  requestPersistentStorage,
  type StorageProtection,
} from '@/libs/storage/persistStorage';

export function StorageWarning() {
  const { t } = useTranslation();
  const [protection, setProtection] = useState<StorageProtection | null>(null);
  const [needsInstall] = useState(needsHomeScreenInstall);

  useEffect(() => {
    let live = true;
    void requestPersistentStorage().then((result) => {
      if (live) setProtection(result);
    });
    return () => {
      live = false;
    };
  }, []);

  if (!needsInstall && (protection === null || protection === 'persisted')) return null;
  return (
    <Banner tone="info" title={t('pos.storage.title')}>
      {needsInstall ? t('pos.storage.install') : t('pos.storage.persist')}
    </Banner>
  );
}
