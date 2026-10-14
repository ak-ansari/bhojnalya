// A full-width strip that states a fact about the whole screen (offline,
// suspended). It is a polite live region, so a screen reader hears it once
// when it appears. Copy comes from the caller's i18n; this file holds none.
import type { ReactNode } from 'react';

import { cn } from '../lib/cn.js';

export type BannerTone = 'offline' | 'info' | 'danger';

export interface BannerProps {
  tone: BannerTone;
  /** The fact, in bold: "You're offline." */
  title: ReactNode;
  /** The consequence and what to do. */
  children?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function Banner({ tone, title, children, icon, className }: BannerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-none items-center gap-2.5 border-b px-5 py-2.5 text-body-sm',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {icon}
      <span>
        <strong>{title}</strong>
        {children ? <> {children}</> : null}
      </span>
    </div>
  );
}

const TONE_CLASSES: Record<BannerTone, string> = {
  offline: 'border-offline-line bg-offline-tint text-offline-text',
  info: 'border-info bg-info-tint text-info-text',
  danger: 'border-danger-line bg-danger-tint text-danger',
};
