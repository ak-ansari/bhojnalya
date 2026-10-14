import config from '@bhojnalya/config/eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

// The app runs in the browser: browser globals replace the shared Node set, and
// the hooks rules catch effects with missing dependencies.
export default [
  { ignores: ['dev-dist/**'] },
  ...config({ tsconfigRootDir: import.meta.dirname }),
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    ...reactHooks.configs['recommended-latest'],
  },
];
