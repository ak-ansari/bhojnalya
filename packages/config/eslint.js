// Shared ESLint flat config. Each workspace's eslint.config.js calls this with
// its own directory so type-aware rules find the right tsconfig.
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * @param {{ tsconfigRootDir: string }} options
 * @returns {import('typescript-eslint').ConfigArray}
 */
export default function config({ tsconfigRootDir }) {
  return tseslint.config(
    { ignores: ['dist/**', 'coverage/**', '.turbo/**'] },
    js.configs.recommended,
    ...tseslint.configs.strictTypeChecked,
    {
      languageOptions: {
        globals: { ...globals.node },
        parserOptions: {
          projectService: {
            allowDefaultProject: ['*.config.js', '*.config.ts'],
          },
          tsconfigRootDir,
        },
      },
      rules: {
        '@typescript-eslint/consistent-type-imports': 'error',
        '@typescript-eslint/no-floating-promises': 'error',
      },
    },
    {
      files: ['**/*.js'],
      ...tseslint.configs.disableTypeChecked,
    },
  );
}
