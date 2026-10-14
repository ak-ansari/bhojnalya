import { useTranslation } from 'react-i18next';

import type { Diet } from '../domain/menu.js';

const BOX: Record<Diet, string> = {
  veg: 'border-veg',
  egg: 'border-egg-line',
  non_veg: 'border-non-veg',
};

const DOT: Record<Diet, string> = {
  veg: 'size-1.5 rounded-full bg-veg',
  egg: 'size-1.5 rounded-full bg-egg',
  non_veg: 'size-2 bg-non-veg clip-triangle',
};

/** The Indian veg / egg / non-veg square, labelled for screen readers. */
export function VegMark({ diet }: { diet: Diet }) {
  const { t } = useTranslation();
  return (
    <span
      role="img"
      aria-label={t(`menu.diet.${diet}`)}
      className={`inline-flex size-3.5 flex-none items-center justify-center rounded-sm border-mark bg-white ${BOX[diet]}`}
    >
      <i className={DOT[diet]} />
    </span>
  );
}
