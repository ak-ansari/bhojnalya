import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { ROUTE_PATHS } from '@/libs/routing/routePaths';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-2 text-2xl font-bold">{t('common.notFound.title')}</h1>
      <p className="mb-4 text-fg-body">{t('common.notFound.body')}</p>
      <Link
        to={ROUTE_PATHS.OWNER.DASHBOARD}
        className="inline-flex min-h-11 items-center font-semibold text-saffron"
      >
        {t('common.notFound.home')}
      </Link>
    </main>
  );
}
