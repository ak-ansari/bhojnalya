// The frame every POS and KDS screen sits in: optional side rail, top bar,
// the offline strip, then the page. Layouts pass the parts; this holds none.
import type { DeviceRole } from '@bhojnalya/contracts';
import type { ReactNode } from 'react';

import { ConnectionBanner } from './ConnectionBanner';

export interface ScreenShellProps {
  role: DeviceRole;
  title: string;
  rail?: ReactNode;
  children: ReactNode;
}

export function ScreenShell({ role, title, rail, children }: ScreenShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-canvas font-sans tabular-nums text-fg">
      {rail}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-topbar flex-none items-center gap-4 border-b border-line bg-surface px-5">
          <h1 className="text-body font-bold">{title}</h1>
        </header>
        <ConnectionBanner role={role} />
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
