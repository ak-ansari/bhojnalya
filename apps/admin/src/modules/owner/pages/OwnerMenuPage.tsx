// Stub of menu and stock (design: OwnerMenu). Categories, items, variants and
// the in-stock toggle land with the menu API.
import { useTranslation } from 'react-i18next';

import { StubPage } from '@/libs/components/StubPage';

export function OwnerMenuPage() {
  const { t } = useTranslation();
  return <StubPage title={t('owner.menu.title')} empty={t('owner.menu.empty')} />;
}
