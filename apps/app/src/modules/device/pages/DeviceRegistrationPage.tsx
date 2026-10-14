// Stub device registration: pick what this screen is for. Owner sign-in and
// pairing with the server replace the stub in a later ticket.
import type { DeviceRole } from '@bhojnalya/contracts';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { RoleOption } from '../components/RoleOption';
import { useDeviceStore } from '../store/deviceStore';

const ROLES: readonly DeviceRole[] = ['pos', 'kds'];

export function DeviceRegistrationPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const register = useDeviceStore((state) => state.register);

  const choose = (role: DeviceRole) => {
    register(role);
    void navigate(`/${role}`, { replace: true });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas p-6 font-sans text-fg">
      <div className="flex w-full max-w-xl flex-col gap-6 rounded-dialog bg-surface p-8">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-control bg-saffron text-title font-bold text-white">
            B
          </span>
          <span className="text-title font-bold">{t('common.brand')}</span>
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-title font-bold">{t('device.register.title')}</h1>
          <p className="text-body-sm text-fg-muted">{t('device.register.intro')}</p>
        </div>
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-body font-semibold">{t('device.register.question')}</legend>
          {ROLES.map((role) => (
            <RoleOption
              key={role}
              name={t(`device.register.${role}.name`)}
              hint={t(`device.register.${role}.hint`)}
              onChoose={() => {
                choose(role);
              }}
            />
          ))}
        </fieldset>
        <p className="text-caption text-fg-muted">{t('device.register.stubNote')}</p>
      </div>
    </main>
  );
}
