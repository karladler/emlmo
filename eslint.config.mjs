import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import stylistic from '@stylistic/eslint-plugin';
import tseslint from 'typescript-eslint';

export default defineConfig(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    ignores: ['dist/*', 'lib/*', 'rollup.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { window: 'readonly', document: 'readonly' },
    },
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      'prefer-template': 'error',
      '@stylistic/indent': ['error', 2],
      '@stylistic/quotes': ['error', 'single'],
      '@stylistic/semi': ['error', 'always'],
      '@stylistic/comma-dangle': ['error', 'always-multiline'],
      '@stylistic/max-len': ['error', { code: 140, ignoreUrls: true, ignoreStrings: true }],
      'padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: 'return' },
        { blankLine: 'always', prev: '*', next: 'if' },
      ],
    },
  },
  {
    files: ['**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
