import config from '@bhojnalya/config/eslint';

export default [
  ...config({ tsconfigRootDir: import.meta.dirname }),
  {
    // A Nest module is an empty class that its decorator describes.
    rules: { '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }] },
  },
];
