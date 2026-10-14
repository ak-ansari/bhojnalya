// The red banner a super admin sees on every screen while acting as an owner
// (TRD §13). It is driven by the token's `impersonated_by` claim alone, so no
// screen can forget to show it.
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { ROUTE_PATHS } from '@/libs/routing/routePaths';
import { isImpersonating } from '@/libs/auth/accessClaims';
import { useSession } from '@/libs/auth/session';

export function ImpersonationBanner() {
  const { t } = useTranslation();
  const { claims, setAccessToken } = useSession();
  const navigate = useNavigate();
  if (!isImpersonating(claims)) return null;

  // Ending the view-as on the server lands with the platform_admin API; until
  // then exiting drops the short-lived token.
  const exit = () => {
    setAccessToken(null);
    void navigate(ROUTE_PATHS.PLATFORM.OUTLETS);
  };

  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 bg-danger px-6 py-3 text-sm text-white"
    >
      <strong>{t('common.impersonation.title')}</strong>
      <span className="flex-1">{t('common.impersonation.body')}</span>
      <button
        type="button"
        onClick={exit}
        className="min-h-11 rounded-lg border border-white px-4 font-semibold"
      >
        {t('common.impersonation.exit')}
      </button>
    </div>
  );
}
