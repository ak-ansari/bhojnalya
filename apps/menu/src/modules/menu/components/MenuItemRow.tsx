import { useTranslation } from 'react-i18next';

import { formatINR } from '@/libs/money/formatINR.js';

import type { MenuItem } from '../domain/menu.js';
import { VegMark } from './VegMark.js';

/** One dish. Adding it to a cart is not built yet, so the row only shows it. */
export function MenuItemRow({ item }: { item: MenuItem }) {
  const { t } = useTranslation();
  return (
    <li
      className={`flex gap-4 border-b border-surface-muted py-4 ${item.inStock ? '' : 'opacity-55'}`}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <VegMark diet={item.diet} />
        <h3 className="text-base font-bold">{item.name}</h3>
        <span className="font-bold">{formatINR(item.pricePaise)}</span>
        <p className="text-sm leading-snug text-fg-muted">
          {item.inStock ? item.description : t('menu.item.soldOut')}
        </p>
      </div>
      <div className="flex w-26 flex-none flex-col items-center justify-center gap-1">
        {!item.inStock && (
          <span className="rounded-lg bg-surface-muted px-2.5 py-2 text-xs font-bold text-fg-muted">
            {t('menu.item.unavailable')}
          </span>
        )}
        {item.inStock && item.customisable && (
          <span className="text-xs text-fg-muted">{t('menu.item.customisable')}</span>
        )}
      </div>
    </li>
  );
}
