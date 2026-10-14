import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useMenu } from '../api/useMenu.js';
import { CategoryChips } from '../components/CategoryChips.js';
import { MenuHeader } from '../components/MenuHeader.js';
import { MenuItemRow } from '../components/MenuItemRow.js';
import { brandingStyle } from '../domain/branding.js';
import { visibleItems } from '../domain/menu.js';

/** `/t/:qrToken`: the menu of the table the guest scanned, in the outlet's colours. */
export function MenuPage() {
  const { t } = useTranslation();
  const menu = useMenu();
  const [categoryId, setCategoryId] = useState(menu.categories[0]?.id ?? '');
  const [vegOnly, setVegOnly] = useState(false);
  const items = visibleItems(menu, { categoryId, vegOnly });
  const category = menu.categories.find((c) => c.id === categoryId);

  return (
    <div
      style={brandingStyle(menu.branding)}
      className="flex min-h-dvh flex-col bg-surface-sunken font-sans text-fg tabular-nums"
    >
      <header className="flex flex-col gap-3 border-b border-surface-muted bg-surface px-4 pt-4 pb-3">
        <MenuHeader
          menu={menu}
          vegOnly={vegOnly}
          onToggleVeg={() => {
            setVegOnly(!vegOnly);
          }}
        />
        <CategoryChips
          categories={menu.categories}
          selectedId={categoryId}
          onSelect={setCategoryId}
        />
      </header>
      <main className="flex-1 px-4 pt-2 pb-24">
        <h2 className="mt-2.5 mb-1 text-lg font-bold">{category?.name}</h2>
        {items.length === 0 ? (
          <p className="py-6 text-sm text-fg-muted">{t('menu.empty')}</p>
        ) : (
          <ul>
            {items.map((item) => (
              <MenuItemRow key={item.id} item={item} />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
