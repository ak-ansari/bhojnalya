// The shared button (shadcn/ui on Radix Slot). Every size is at least the
// 48 px touch height from the design foundations.
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

import { cn } from '../lib/cn.js';

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  /** Render the child element (a link, say) with the button's styling. */
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild = false, type, ...props },
  ref,
) {
  const Component = asChild ? Slot : 'button';
  return (
    <Component
      ref={ref}
      // A button inside a form must never submit it by accident.
      type={asChild ? type : (type ?? 'button')}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
});

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-control border font-bold text-body ' +
    'transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saffron-ring ' +
    'disabled:cursor-not-allowed disabled:opacity-60',
  {
    variants: {
      variant: {
        primary: 'border-saffron bg-saffron text-white hover:bg-saffron-strong',
        dark: 'border-ink bg-ink text-white hover:bg-ink-raised',
        success: 'border-success bg-success text-white',
        outline: 'border-line-strong bg-surface text-fg hover:bg-surface-sunken',
        danger: 'border-danger-line bg-surface text-danger hover:bg-danger-tint',
      },
      size: {
        md: 'min-h-touch px-4',
        lg: 'min-h-touch-lg px-5',
      },
    },
    defaultVariants: { variant: 'outline', size: 'md' },
  },
);
