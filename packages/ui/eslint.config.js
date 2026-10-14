import config from '@bhojnalya/config/eslint';
import globals from 'globals';

// Components run in the browser, so browser globals replace the shared Node set.
export default [
  ...config({ tsconfigRootDir: import.meta.dirname }),
  { files: ['src/**/*.{ts,tsx}'], languageOptions: { globals: globals.browser } },
];
