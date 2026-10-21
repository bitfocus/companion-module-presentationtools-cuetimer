import { generateEslintConfig } from '@companion-module/tools/eslint/config.mjs'

const base = await generateEslintConfig({})

export default [
	...base,
	{
		// The tools preset marks only *.mjs as modules; this package is ESM throughout
		files: ['**/*.js'],
		languageOptions: { sourceType: 'module' },
	},
]
