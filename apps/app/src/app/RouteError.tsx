// Shown instead of React Router's raw error page when a screen fails to load
// or render: most often a route chunk that could not be fetched (offline
// before it was cached, or a stale tab after a deploy). The only way out is a
// plain reload; nothing here clears storage, so unsynced bills stay on the
// device.
import { Button } from '@bhojnalya/ui';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouteError } from 'react-router';

import { reloadPage } from '@/libs/browser/reloadPage';

export function RouteError() {
  const { t } = useTranslation();
  const error = useRouteError();
  // Kept for the console; the screen says the same thing whatever the cause.
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas p-6 font-sans text-fg">
      <div
        role="alert"
        className="flex w-full max-w-xl flex-col gap-4 rounded-dialog bg-surface p-8"
      >
        <span className="text-title font-bold">{t('common.brand')}</span>
        <h1 className="text-title font-bold">{t('common.routeError.title')}</h1>
        <p className="text-body text-fg-muted">{t('common.routeError.body')}</p>
        <Button variant="primary" size="lg" onClick={reloadPage}>
          {t('common.routeError.reload')}
        </Button>
      </div>
    </main>
  );
}
