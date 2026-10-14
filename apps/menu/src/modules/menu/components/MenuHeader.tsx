import { useTranslation } from 'react-i18next';

import type { GuestMenu } from '../domain/menu.js';
import { VegMark } from './VegMark.js';

interface MenuHeaderProps {
  menu: GuestMenu;
  vegOnly: boolean;
  onToggleVeg: () => void;
}

export function MenuHeader({ menu, vegOnly, onToggleVeg }: MenuHeaderProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div
          aria-hidden="true"
          className="flex size-12 flex-none items-center justify-center rounded-full bg-brand font-bold text-white"
        >
          {menu.branding.logoText}
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-bold">{menu.outletName}</h1>
          <p className="text-sm text-fg-muted">
            {t('menu.header.table', { table: menu.tableLabel })}
          </p>
        </div>
      </div>
      <button
        type="button"
        aria-pressed={vegOnly}
        onClick={onToggleVeg}
        className={`inline-flex h-11 items-center gap-2 self-end rounded-full border border-veg-line px-3 text-xs font-bold text-veg-ink ${vegOnly ? 'bg-veg-tint' : 'bg-surface'}`}
      >
        <VegMark diet="veg" />
        {t('menu.vegOnly')}
      </button>
    </div>
  );
}
