// Tokens come from the shared preset. Until it carries the design tokens the
// admin uses Tailwind's default palette (see ticket 12's Comments).
import preset from '@bhojnalya/config/tailwind';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [preset],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
};
