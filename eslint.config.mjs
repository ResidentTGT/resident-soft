// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import unusedImports from 'eslint-plugin-unused-imports';

export default [
	{
		ignores: ['node_modules', 'dist/**', 'build/**', '**/*.js'],
	},
	...tseslint.config(eslint.configs.recommended, tseslint.configs.strict, tseslint.configs.stylistic, {
		plugins: { 'unused-imports': unusedImports },

		rules: {
			'@typescript-eslint/no-extraneous-class': 'off', // классы должны иметь не только статические члены
			'@typescript-eslint/prefer-for-of': 'warn', // предпочтение for-of циклам
			'@typescript-eslint/no-explicit-any': 'off', // использование any в типизации
			'no-unused-vars': 'off',
			'@typescript-eslint/no-unused-vars': 'off',
			'unused-imports/no-unused-imports': 'error',
			'unused-imports/no-unused-vars': [
				'warn',
				{
					vars: 'all',
					varsIgnorePattern: '^_',
					args: 'after-used',
					argsIgnorePattern: '^_',
				},
			],
		},
	}),
];
