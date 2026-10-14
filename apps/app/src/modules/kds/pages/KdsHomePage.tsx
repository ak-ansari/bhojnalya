import { useTranslation } from 'react-i18next';

/** The KDS landing screen; the ticket board replaces this placeholder. */
export function KdsHomePage() {
  const { t } = useTranslation();
  return <p className="p-5 text-body text-fg-muted">{t('kds.home.empty')}</p>;
}
