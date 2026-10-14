// The always-visible count of changes not yet synced (TRD §8.2). It links to
// the device screen, where they can be exported or retried.
import { cn } from '@bhojnalya/ui';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { POS_ROUTES } from '../constants/routes';

import type { OutboxCounts } from '@/libs/sync/outbox';

export interface UnsyncedBadgeProps {
  counts: OutboxCounts | undefined;
}

export function UnsyncedBadge({ counts }: UnsyncedBadgeProps) {
  const { t } = useTranslation();
  if (!counts) return null;
  const waiting = counts.total > 0;

  return (
    <Link
      to={POS_ROUTES.DEVICE}
      className={cn(
        'flex min-h-touch items-center gap-2 rounded-chip px-3 text-body-sm font-semibold',
        waiting ? 'bg-warning-tint text-warning-text' : 'text-fg-muted',
      )}
    >
      {waiting ? t('pos.sync.waiting', { count: counts.total }) : t('pos.sync.allSynced')}
      {counts.rejected > 0 ? (
        <span className="rounded-chip bg-danger-tint px-2 text-danger">
          {t('pos.sync.refused', { count: counts.rejected })}
        </span>
      ) : null}
    </Link>
  );
}
