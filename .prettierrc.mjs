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
		{
			// devcontainer.json and the .vscode files are JSON with comments.
			// The default `json` parser rejects them outright.
			files: ['.devcontainer/devcontainer.json', '.vscode/*.json'],
			// jsonc allows the comments; trailingComma: none keeps the files
			// parseable by stricter readers than VS Code's.
			options: { parser: 'jsonc', trailingComma: 'none' },
		},
	],
};
