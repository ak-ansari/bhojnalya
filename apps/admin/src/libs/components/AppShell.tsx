// The frame both route groups share: a side nav, the impersonation banner
// whenever the token carries it, and the routed screen.
import { NavLink, Outlet } from 'react-router';

import { ImpersonationBanner } from './ImpersonationBanner';

export interface NavItem {
  to: string;
  label: string;
}

export function AppShell({
  brand,
  navLabel,
  items,
}: {
  brand: string;
  navLabel: string;
  items: NavItem[];
}) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-fg">
      <ImpersonationBanner />
      <div className="flex flex-1 flex-col md:flex-row">
        <aside className="bg-ink p-4 text-ink-soft md:w-60">
          <p className="mb-4 px-3 text-base font-bold text-white">{brand}</p>
          <nav aria-label={navLabel} className="flex flex-row flex-wrap gap-1 md:flex-col">
            {items.map((item) => (
              <NavLink key={item.to} to={item.to} className={navLinkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function navLinkClass({ isActive }: { isActive: boolean }): string {
  const base = 'flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold';
  return isActive
    ? `${base} bg-saffron text-white`
    : `${base} hover:bg-ink-raised hover:text-white`;
}
