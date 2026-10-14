// Shared React components and display helpers for the three web apps (TRD §4.3).
// Styled with the Tailwind preset in @bhojnalya/config; an app's stylesheet
// must `@source` this package's src so the classes are generated.
export { formatINR } from './money/formatINR.js';
export { cn } from './lib/cn.js';
export { Button, buttonVariants, type ButtonProps } from './components/Button.js';
export { Banner, type BannerProps, type BannerTone } from './components/Banner.js';
