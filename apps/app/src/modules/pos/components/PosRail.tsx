import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';

/** The dark left rail of the POS: brand mark, then one link per section. */
export function PosRail() {
  const { t } = useTranslation();
  return (
    <nav
      aria-label={t('pos.nav.label')}
      className="flex w-rail flex-none flex-col items-center gap-1.5 bg-ink py-3.5"
    >
      <span
        aria-hidden="true"
        className="mb-3.5 flex size-10 items-center justify-center rounded-control bg-saffron text-title font-bold text-white"
      >
        B
      </span>
      <NavLink
        to="/pos"
        end
        className={({ isActive }) =>
          `flex min-h-touch w-14 flex-col items-center justify-center rounded-control text-caption font-semibold ${
            isActive
              ? 'bg-saffron text-white'
              : 'text-ink-soft hover:bg-ink-raised hover:text-white'
          }`
        }
      >
        {t('pos.nav.order')}
      </NavLink>
    </nav>
  );
}
