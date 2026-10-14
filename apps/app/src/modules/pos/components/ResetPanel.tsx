// Clear data and reset the device, both blocked while anything has not
// synced (ADR 0006). The buttons are disabled with the count; the wipe
// itself re-checks inside its transaction, so a change made meanwhile still
// blocks it.
import { Button } from '@bhojnalya/ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { ROUTES } from '@/app/paths';
import { useLocalDb } from '@/libs/local-db/LocalDbContext';
import type { OutboxCounts } from '@/libs/sync/outbox';
import { clearLocalData, OutboxNotEmptyError } from '@/libs/sync/safetyRails';
import { useDeviceStore } from '@/modules/device/store/deviceStore';

export interface ResetPanelProps {
  counts: OutboxCounts;
}

export function ResetPanel({ counts }: ResetPanelProps) {
  const { t } = useTranslation();
  const db = useLocalDb();
  const navigate = useNavigate();
  const unregister = useDeviceStore((state) => state.unregister);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const blocked = counts.total > 0;

  const clear = async (andReset: boolean) => {
    setBusy(true);
    setMessage(null);
    try {
      await clearLocalData(db);
      if (andReset) {
        unregister();
        void navigate(ROUTES.REGISTER, { replace: true });
        return;
      }
      setMessage(t('pos.device.reset.cleared'));
    } catch (error) {
      if (!(error instanceof OutboxNotEmptyError)) throw error;
      setMessage(t('pos.device.reset.blocked', { count: error.waiting }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="flex flex-col gap-3 rounded-card bg-surface p-5">
      <h2 className="text-body font-bold">{t('pos.device.reset.heading')}</h2>
      {blocked ? (
        <p role="alert" className="text-body-sm text-danger">
          {t('pos.device.reset.blocked', { count: counts.total })}
        </p>
      ) : null}
      <div className="flex flex-col gap-1">
        <Button variant="danger" disabled={blocked || busy} onClick={() => void clear(false)}>
          {t('pos.device.reset.clear')}
        </Button>
        <p className="text-caption text-fg-muted">{t('pos.device.reset.clearHint')}</p>
      </div>
      <div className="flex flex-col gap-1">
        <Button variant="danger" disabled={blocked || busy} onClick={() => void clear(true)}>
          {t('pos.device.reset.reset')}
        </Button>
        <p className="text-caption text-fg-muted">{t('pos.device.reset.resetHint')}</p>
      </div>
      {message ? (
        <p role="status" className="text-body-sm">
          {message}
        </p>
      ) : null}
    </section>
  );
}
