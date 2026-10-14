import { useTranslation } from 'react-i18next';

/** The POS landing screen; the order screen replaces this placeholder. */
export function PosHomePage() {
  const { t } = useTranslation();
  return <p className="p-5 text-body text-fg-muted">{t('pos.home.empty')}</p>;
}
