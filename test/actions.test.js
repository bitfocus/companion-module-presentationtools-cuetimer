import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getActionDefinitions } from '../src/actions.js'

const stub = (capabilities) => ({ config: { list: '' }, lists: [], capabilities, actionCallback() {} })

const SHARED = [
	'FireNext',
	'CueNext',
	'CueCurrent',
	'Pause',
	'Restart',
	'Undo',
	'AddSpeed',
	'SubSpeed',
	'AddMinute',
	'SubMinute',
	'Blackout',
	'Message',
	'Clock',
	'STM',
	'MoveNextUp',
	'MoveNextDown',
	'FireTimerWithID',
	'CueTimerWithID',
	'SetDuration',
	'AddXMinutes',
	'SubXMinutes',
	'InitList',
]
const OUTPUTS = [
	'Fullscreen',
	'Preview',
	'Presenter',
	'NDI',
	'MultitimerPreview',
	'MultitimerFullscreen',
	'MultitimerNDI',
]
const LISTS = ['ActivateNextList', 'ActivatePreviousList', 'ActivateThisList', 'ActivateListByNumber']

test('with the app every action of module 2.x exists, except the dead EndTime one', () => {
	const actions = getActionDefinitions(stub(['outputs', 'lists', 'links']))
	assert.deepEqual(Object.keys(actions).sort(), [...SHARED, ...OUTPUTS, ...LISTS].sort())
	assert.equal(actions.InitEndTimeTimer, undefined)
})

test('on the Cloud the output and list actions are left out', () => {
	const actions = getActionDefinitions(stub([]))
	assert.deepEqual(Object.keys(actions).sort(), [...SHARED].sort())
})

test('a stub without capabilities gets everything (presets are validated against the full set)', () => {
	const actions = getActionDefinitions({ config: {}, lists: [], actionCallback() {} })
	assert.ok(actions.Fullscreen && actions.ActivateListByNumber)
})

test('every action keeps the option id Key and the on/off/toggle choices', () => {
	const actions = getActionDefinitions(stub(['outputs', 'lists', 'links']))
	for (const id of ['Fullscreen', 'Preview', 'Presenter', 'MultitimerPreview', 'MultitimerFullscreen']) {
		assert.deepEqual(
			actions[id].options[0].choices.map((c) => c.id),
			['on', 'off', 'toggle'],
		)
		assert.equal(actions[id].options[0].id, 'Key')
	}
	for (const id of ['FireTimerWithID', 'CueTimerWithID', 'SetDuration', 'AddXMinutes', 'SubXMinutes']) {
		assert.equal(actions[id].options[0].id, 'Key')
		assert.equal(actions[id].options[0].useVariables, true)
	}
})
