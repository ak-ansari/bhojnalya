import { useTranslation } from 'react-i18next';

import type { MenuCategory } from '../domain/menu.js';

interface CategoryChipsProps {
  categories: MenuCategory[];
  selectedId: string;
  onSelect: (categoryId: string) => void;
}

export function CategoryChips({ categories, selectedId, onSelect }: CategoryChipsProps) {
  const { t } = useTranslation();
  return (
    <nav aria-label={t('menu.categories')} className="-mx-4 flex gap-2 overflow-x-auto px-4">
      {categories.map((category) => {
        const selected = category.id === selectedId;
        return (
          <button
            key={category.id}
            type="button"
            aria-pressed={selected}
            onClick={() => {
              onSelect(category.id);
            }}
            className={`h-11 flex-none rounded-full border px-4 text-sm font-semibold ${selected ? 'border-brand bg-brand text-white' : 'border-chip-line bg-white text-ink'}`}
          >
            {category.name}
          </button>
        );
      })}
    </nav>
  );
}
