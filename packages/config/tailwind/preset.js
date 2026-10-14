// Tailwind preset: the design tokens from design/ui-board/project/Foundations.
// A Tailwind v4 app loads it with `@config`, a v3 app lists it in `presets`.
// A component uses these names, never a raw hex or pixel value. A value the
// tokens lack is added here first.
/** @type {{ theme: { extend: Record<string, unknown> } }} */
export default {
  theme: {
    extend: {
      colors: {
        // Core
        saffron: { DEFAULT: '#C2410C', strong: '#9A3412', tint: '#FFF1E8', ring: '#FFE1CF' },
        ink: { DEFAULT: '#1E2638', raised: '#2A3449', soft: '#AEB6C6' },
        canvas: '#F4F5F7',
        surface: { DEFAULT: '#FFFFFF', sunken: '#FAFBFC', muted: '#EEF0F4' },
        fg: { DEFAULT: '#1B2230', body: '#3B4456', muted: '#5B6577' },
        line: { DEFAULT: '#E3E6EB', strong: '#D9DDE4' },
        // Status: they also differ in lightness, not only hue
        success: { DEFAULT: '#15803D', tint: '#E8F7EE', text: '#166534' },
        warning: { DEFAULT: '#B45309', tint: '#FFF4DE', text: '#92400E' },
        danger: { DEFAULT: '#B91C1C', tint: '#FDECEC', line: '#F3C4C4' },
        info: { DEFAULT: '#2563EB', tint: '#EAF1FF', text: '#1D4ED8' },
        qr: { DEFAULT: '#6D28D9', tint: '#EFE7FF', text: '#5B21B6' },
        // Connection pill and offline strip
        online: { DEFAULT: '#16A34A', tint: '#EDF9F0', line: '#BBE5C8', text: '#166534' },
        offline: { DEFAULT: '#D97706', tint: '#FFF7E6', line: '#F5D08A', text: '#78350F' },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        caption: ['12px', '16px'],
        'body-sm': ['13px', '18px'],
        body: ['15px', '20px'],
        title: ['22px', '28px'],
        display: ['36px', '44px'],
      },
      borderRadius: {
        chip: '8px',
        control: '12px',
        card: '14px',
        dialog: '20px',
      },
      spacing: {
        // 48 px is the minimum touch height for every control
        touch: '48px',
        'touch-lg': '52px',
        rail: '76px',
        topbar: '64px',
      },
    },
  },
};
