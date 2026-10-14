// Wiring only: translations and the routes (TRD §10). Tests pass a memory location hook.
import type { i18n } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { Route, Router, Switch, type BaseLocationHook } from 'wouter';

import { MenuPage } from '@/modules/menu/pages/MenuPage.js';
import { NotFoundPage } from '@/modules/not-found/pages/NotFoundPage.js';

export const ROUTES = {
  TABLE_MENU: '/t/:qrToken',
} as const;

interface AppProps {
  i18n: i18n;
  locationHook?: BaseLocationHook;
}

export function App({ i18n, locationHook }: AppProps) {
  return (
    <I18nextProvider i18n={i18n}>
      <Router {...(locationHook ? { hook: locationHook } : {})}>
        <Switch>
          <Route path={ROUTES.TABLE_MENU}>
            <MenuPage />
          </Route>
          <Route>
            <NotFoundPage />
          </Route>
        </Switch>
      </Router>
    </I18nextProvider>
  );
}
