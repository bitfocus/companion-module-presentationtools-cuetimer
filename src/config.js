import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { Regex } from '@companion-module/base'
import { getListsChoices } from './choices.js'

// A `.env` file in the module folder (git-ignored, see .env.example) sets CUETIMER_CLOUD_URL for
// development against a local or staging engine. A packaged module carries no such file.
const envFile = fileURLToPath(new URL('../.env', import.meta.url))
try {
	if (existsSync(envFile)) process.loadEnvFile(envFile)
} catch {
	// unreadable file: keep the environment as it is
}

/** The CueTimer Cloud engine. Not configurable in the UI. */
export const DEFAULT_CLOUD_URL = 'https://backend.cuetimer.io'

/** The Cloud engine to connect to: CUETIMER_CLOUD_URL from the environment or the .env file, else the fixed endpoint */
export function cloudUrl(env = process.env) {
	return String(env.CUETIMER_CLOUD_URL || DEFAULT_CLOUD_URL).trim()
}
export const DEFAULT_LAN_PORT = '31609'

/** @param ctx the instance, or a plain stub with the same fields (tests) */
export function getConfigFields(ctx) {
	return [
		{
			type: 'static-text',
			id: 'info',
			width: 12,
			label: 'Information',
			value:
				'Controls the CueTimer app on your network, or a CueTimer Cloud cue list. ' +
				'Requires CueTimer 5 with the Companion API; for CueTimer 4 or an older CueTimer 5, use module version 2.',
		},
		{
			type: 'dropdown',
			id: 'mode',
			label: 'Connect to',
			default: 'app',
			width: 12,
			choices: [
				{ id: 'app', label: 'CueTimer app on this network' },
				{ id: 'cloud', label: 'CueTimer Cloud' },
			],
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'Target IP',
			description: 'For CueTimer on this computer: 127.0.0.1.',
			default: '127.0.0.1',
			width: 6,
			regex: Regex.IP,
			isVisibleExpression: "$(options:mode) !== 'cloud'",
		},
		{
			type: 'textinput',
			id: 'port',
			label: 'Target Port',
			description:
				'Default: 31609, the LAN port CueTimer shows under Preferences / Network for its display and control links. ' +
				'Port 31601 is only used by old module versions (2 and earlier).',
			default: DEFAULT_LAN_PORT,
			width: 6,
			regex: Regex.PORT,
			isVisibleExpression: "$(options:mode) !== 'cloud'",
		},
		{
			type: 'dropdown',
			id: 'list',
			label: 'List',
			default: '1',
			width: 12,
			choices: [{ id: '', label: 'Active List' }].concat(getListsChoices(ctx.lists)),
			isVisibleExpression: "$(options:mode) !== 'cloud'",
		},
		{
			type: 'textinput',
			id: 'listId',
			label: 'Cue list ID',
			default: '',
			width: 12,
			isVisibleExpression: "$(options:mode) === 'cloud'",
		},
		{
			type: 'textinput',
			id: 'name',
			label: 'Connection name',
			description: "Shown in CueTimer Cloud's dashboard.",
			default: 'Companion',
			width: 12,
			isVisibleExpression: "$(options:mode) === 'cloud'",
		},
	]
}
