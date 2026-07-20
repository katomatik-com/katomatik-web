/** @type {import("prettier").Config} */
export default {
	useTabs: true,
	singleQuote: true,
	semi: true,

	// prettier-plugin-tailwindcss MUST be last — it wraps the other plugins.
	// Anywhere else and Tailwind class sorting silently stops running.
	plugins: ['prettier-plugin-astro', 'prettier-plugin-tailwindcss'],

	overrides: [
		{
			files: '*.astro',
			options: { parser: 'astro' },
		},
	],
};
