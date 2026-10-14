import { useTranslation } from 'react-i18next';

/** Shown while a role's lazy route chunk loads. */
export function RouteFallback() {
  const { t } = useTranslation();
  return (
    <p role="status" className="p-5 font-sans text-body text-fg-muted">
      {t('common.loading')}
    </p>
  );
}
