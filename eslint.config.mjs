import { generateEslintConfig } from '@companion-module/tools/eslint/config.mjs'

const base = await generateEslintConfig({})

export default [
	...base,
	{
		// The tools preset marks only *.mjs as modules; this package is ESM throughout
		files: ['**/*.js'],
		languageOptions: { sourceType: 'module' },
	},
	{
		// Tests may use dev dependencies (a Socket.IO server stands in for CueTimer)
		files: ['test/**/*.js'],
		rules: { 'n/no-unpublished-import': 'off' },
	},
]
