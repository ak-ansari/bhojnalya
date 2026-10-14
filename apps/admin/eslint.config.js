import config from '@bhojnalya/config/eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  ...config({ tsconfigRootDir: import.meta.dirname }),
  reactHooks.configs.flat.recommended,
];
