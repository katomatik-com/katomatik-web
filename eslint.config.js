import js from '@eslint/js';
import astro from 'eslint-plugin-astro';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import ts from 'typescript-eslint';

export default [
	{
		ignores: ['dist/', '.astro/', 'node_modules/'],
	},

	js.configs.recommended,
	...ts.configs.recommended,
	...astro.configs['flat/recommended'],

	{
		// Client-side scripts in .astro files run in the browser.
		files: ['**/*.astro'],
		languageOptions: {
			globals: globals.browser,
		},
	},

	// Must stay last: turns off every stylistic rule so ESLint and Prettier
	// don't issue contradictory errors about the same line.
	prettier,
];
