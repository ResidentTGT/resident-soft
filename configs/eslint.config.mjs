// @ts-check
import path from 'node:path';

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';

const ROOT = process.cwd();
const TS_PROJECTS = [
	path.join(ROOT, 'tsconfig.json'), // бэкенд
	path.join(ROOT, 'frontend', 'tsconfig.app.json'), // React app
	path.join(ROOT, 'frontend', 'tsconfig.node.json'), // Vite config
];

const parserOptionsBlock = {
	files: ['**/*.{ts,tsx}'],
	languageOptions: {
		globals: {
			...globals.node,
		},
		parserOptions: {
			project: [TS_PROJECTS],
			tsconfigRootDir: ROOT,
			sourceType: 'module',
			ecmaVersion: 'latest',
		},
	},
};

export default [
	{
		ignores: ['node_modules', 'dist/**', 'build/**', '**/*.js', 'configs/eslint.config.mjs'],
	},
	parserOptionsBlock,
	...tseslint.config(eslint.configs.recommended, tseslint.configs.strict, tseslint.configs.stylistic, {
		plugins: { 'unused-imports': unusedImports },

		rules: {
			'@typescript-eslint/no-extraneous-class': 'off',
			'@typescript-eslint/prefer-for-of': 'warn',
			'@typescript-eslint/no-explicit-any': 'off',
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
