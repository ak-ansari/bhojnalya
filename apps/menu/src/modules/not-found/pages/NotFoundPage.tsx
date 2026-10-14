import { useTranslation } from 'react-i18next';

/** Any path that is not a table's QR link. */
export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <main className="flex min-h-dvh flex-col justify-center gap-2 bg-surface px-6 font-sans text-ink">
      <h1 className="text-lg font-bold">{t('notFound.title')}</h1>
      <p className="text-sm text-muted">{t('notFound.body')}</p>
    </main>
  );
}
