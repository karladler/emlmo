import eslint from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	eslint.configs.recommended,
	tseslint.configs.recommended,
	{
		ignores: ['dist/*', 'lib/*', 'test/**', 'rollup.config.js'],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'module',
			globals: { window: 'readonly', document: 'readonly' },
		},
		plugins: {
			'@stylistic': stylistic,
		},
		rules: {
			'no-console': 0,
			'no-var': 'warn',
			'no-useless-escape': 'off',
			'no-extra-boolean-cast': 'off',
			'no-prototype-builtins': 'off',
			'no-unused-vars': 'off',
			'prefer-const': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unused-expressions': 'off',
			'@typescript-eslint/no-unused-vars': 'off',
			'@typescript-eslint/no-wrapper-object-types': 'off',
			'@stylistic/indent': ['error', 'tab'],
			'@stylistic/quotes': ['error', 'single'],
			'@stylistic/semi': ['error', 'always'],
			'@stylistic/comma-dangle': ['error', 'always-multiline'],
			'@stylistic/max-len': ['error', { code: 140, ignoreUrls: true, ignoreStrings: true }],
		},
	},
);
