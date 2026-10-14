// What has not synced, with the emergency export and the retry for refused
// changes (TRD §8.2).
import { Button } from '@bhojnalya/ui';
import { useTranslation } from 'react-i18next';

import { readMeta } from '@/libs/local-db/db';
import { useLocalDb } from '@/libs/local-db/LocalDbContext';
import { downloadText, outboxToCsv, outboxToJson } from '@/libs/sync/exportOutbox';
import { retryRejected, type OutboxCounts } from '@/libs/sync/outbox';

export interface UnsyncedPanelProps {
  counts: OutboxCounts;
}

export function UnsyncedPanel({ counts }: UnsyncedPanelProps) {
  const { t } = useTranslation();
  const db = useLocalDb();

  const exportAs = async (format: 'json' | 'csv') => {
    const ops = await db.outbox.orderBy('deviceSeq').toArray();
    const exportedAt = new Date().toISOString();
    const stamp = exportedAt.replaceAll(':', '-');
    if (format === 'csv') {
      downloadText(`unsynced-${stamp}.csv`, 'text/csv', outboxToCsv(ops));
      return;
    }
    const deviceId = (await readMeta(db, 'device'))?.deviceId ?? null;
    const json = outboxToJson({ deviceId, exportedAt, ops });
    downloadText(`unsynced-${stamp}.json`, 'application/json', json);
  };

  return (
    <section className="flex flex-col gap-3 rounded-card bg-surface p-5">
      <h2 className="text-body font-bold">{t('pos.device.unsynced.heading')}</h2>
      {counts.total === 0 ? (
        <p className="text-body-sm text-fg-muted">{t('pos.device.unsynced.none')}</p>
      ) : (
        <>
          <p className="text-body-sm">
            {t('pos.device.unsynced.count', { count: counts.total })}
            {counts.rejected > 0
              ? ` ${t('pos.device.unsynced.refused', { count: counts.rejected })}`
              : null}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => void exportAs('json')}>
              {t('pos.device.unsynced.exportJson')}
            </Button>
            <Button onClick={() => void exportAs('csv')}>
              {t('pos.device.unsynced.exportCsv')}
            </Button>
            {counts.rejected > 0 ? (
              <Button variant="dark" onClick={() => void retryRejected(db)}>
                {t('pos.device.unsynced.retry')}
              </Button>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}
