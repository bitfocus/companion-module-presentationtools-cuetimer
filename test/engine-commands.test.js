import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildEngineCommand, durationToMinutes, isPlaceholderList } from '../src/engine-commands.js'

const lists = [
	{ id: 'guid-1', title: 'One', isActive: false },
	{ id: 'guid-2', title: 'Two', isActive: true },
	{ id: 'guid-3', title: 'Three', isActive: false },
]
const snapshot = {
	list: { id: 'guid-2' },
	flags: { paused: false, blackout: false, message: true, messageEnabled: true, clock: false, singleMode: true },
	timers: [
		{ guid: 'g1', visibleID: '1' },
		{ guid: 'g2', visibleID: 'A B' },
	],
}
const logs = []
const ctx = {
	config: { list: 'guid-2' },
	snapshot,
	lists,
	capabilities: ['outputs', 'lists', 'links'],
	log: (level, message) => logs.push([level, message]),
}
const build = (actionId, options = {}, overrides = {}) =>
	buildEngineCommand({ actionId, options }, { ...ctx, ...overrides })

test('plain actions map to the engine command names', () => {
	assert.deepEqual(build('FireNext'), { command: 'StartNext', data: {} })
	assert.deepEqual(build('CueNext'), { command: 'CueNext', data: {} })
	assert.deepEqual(build('CueCurrent'), { command: 'StopAndCueCurrent', data: {} })
	for (const id of ['Restart', 'Undo', 'MoveNextUp', 'MoveNextDown', 'InitList']) {
		assert.deepEqual(build(id), { command: id, data: {} })
	}
	assert.deepEqual(build('AddSpeed'), { command: 'ChangeSpeed', data: { percentageDelta: 5 } })
	assert.deepEqual(build('SubSpeed'), { command: 'ChangeSpeed', data: { percentageDelta: -5 } })
	assert.deepEqual(build('AddMinute'), { command: 'ChangeDuration', data: { minutesDelta: 1 } })
	assert.deepEqual(build('SubMinute'), { command: 'ChangeDuration', data: { minutesDelta: -1 } })
})

test('toggles are decided from the last snapshot, as the control page does', () => {
	assert.deepEqual(build('Pause'), { command: 'Pause', data: {} })
	assert.deepEqual(build('Pause', {}, { snapshot: { ...snapshot, flags: { ...snapshot.flags, paused: true } } }), {
		command: 'Resume',
		data: {},
	})
	assert.deepEqual(build('Blackout'), { command: 'SetBlackout', data: { enabled: true } })
	assert.deepEqual(build('Message'), { command: 'SetMessageEnabled', data: { enabled: false } })
	// Idle list with the message enabled: flags.message is false (no timer active) but the toggle still turns it off
	const idleEnabled = { snapshot: { ...snapshot, flags: { ...snapshot.flags, message: false, messageEnabled: true } } }
	assert.deepEqual(build('Message', {}, idleEnabled), { command: 'SetMessageEnabled', data: { enabled: false } })
	const idleDisabled = {
		snapshot: { ...snapshot, flags: { ...snapshot.flags, message: false, messageEnabled: false } },
	}
	assert.deepEqual(build('Message', {}, idleDisabled), { command: 'SetMessageEnabled', data: { enabled: true } })
	assert.deepEqual(build('Clock'), { command: 'SetClock', data: { enabled: true } })
	assert.deepEqual(build('STM'), { command: 'SetSingleMode', data: { enabled: false } })
	// Without a snapshot every flag reads as off
	assert.deepEqual(build('Blackout', {}, { snapshot: null }), { command: 'SetBlackout', data: { enabled: true } })
	assert.deepEqual(build('Pause', {}, { snapshot: null }), { command: 'Pause', data: {} })
})

test('durations and minute spans are parsed like the legacy TCP handler', () => {
	assert.equal(durationToMinutes('00:10:00'), 10)
	assert.equal(durationToMinutes('01:30:30'), 90.5)
	assert.equal(durationToMinutes('02:30'), 2.5)
	assert.equal(durationToMinutes('abc'), null)
	assert.equal(durationToMinutes('1:2:3:4'), null)
	assert.equal(durationToMinutes('1:30'), 1.5)
	assert.equal(durationToMinutes(' 01:02:03 '), 62.05)
	for (const junk of [':', '::', '1:-30', '1:', ':30', '1:300', '']) {
		assert.equal(durationToMinutes(junk), null, `"${junk}" is not a duration`)
	}
	assert.deepEqual(build('SetDuration', { Key: '00:10:00' }), { command: 'SetDuration', data: { durationMinutes: 10 } })
	assert.equal(build('SetDuration', { Key: 'ten' }), null)
	assert.deepEqual(build('AddXMinutes', { Key: '2.5' }), { command: 'ChangeDuration', data: { minutesDelta: 2.5 } })
	assert.deepEqual(build('SubXMinutes', { Key: 3 }), { command: 'ChangeDuration', data: { minutesDelta: -3 } })
	assert.equal(build('AddXMinutes', { Key: '0' }), null)
	assert.equal(build('AddXMinutes', { Key: 'x' }), null)
})

test('timers addressed by visible ID resolve to their guid from the snapshot', () => {
	assert.deepEqual(build('FireTimerWithID', { Key: '1' }), { command: 'FireTimerByGuid', data: { guid: 'g1' } })
	assert.deepEqual(build('CueTimerWithID', { Key: 'A B' }), { command: 'SetNextByGuid', data: { guid: 'g2' } })
	assert.deepEqual(build('FireTimerWithID', { Key: 1 }), { command: 'FireTimerByGuid', data: { guid: 'g1' } })
	assert.equal(build('FireTimerWithID', { Key: '9' }), null)
	assert.equal(build('FireTimerWithID', { Key: '1' }, { snapshot: null }), null)
})

test('outputs use the same commands as the control page', () => {
	assert.deepEqual(build('Fullscreen', { Key: 'on' }), {
		command: 'SetOutput',
		data: { type: 'fullscreen', listId: 'guid-2', enabled: true },
	})
	assert.deepEqual(build('Presenter', { Key: 'off' }), {
		command: 'SetOutput',
		data: { type: 'presenter', listId: 'guid-2', enabled: false },
	})
	assert.deepEqual(build('Preview', { Key: 'toggle' }), {
		command: 'ToggleOutput',
		data: { type: 'preview', listId: 'guid-2' },
	})
	assert.deepEqual(build('NDI'), { command: 'ToggleOutput', data: { type: 'ndi', listId: 'guid-2' } })
	assert.deepEqual(build('MultitimerNDI'), {
		command: 'ToggleOutput',
		data: { type: 'ndiMultitimer', listId: 'guid-2' },
	})
	assert.deepEqual(build('MultitimerPreview', { Key: 'on' }).data.type, 'multitimerPreview')
	assert.deepEqual(build('MultitimerFullscreen', { Key: 'on' }).data.type, 'multitimerFullscreen')
	assert.equal(build('Fullscreen', { Key: 'on' }, { snapshot: null }), null)
})

test('list activation: this list, by number, previous and next with wrap-around', () => {
	assert.deepEqual(build('ActivateThisList'), { command: 'ActivateList', data: { listId: 'guid-2' } })
	assert.equal(build('ActivateThisList', {}, { config: { list: '' } }), null)
	assert.equal(build('ActivateThisList', {}, { config: { list: '1' } }), null, 'a placeholder number is not a list')
	assert.equal(
		build('ActivateThisList', {}, { config: { list: '-1' } }),
		null,
		'a negative placeholder is not a list either',
	)
	assert.equal(isPlaceholderList('-1'), true)
	assert.equal(isPlaceholderList('guid-2'), false)
	assert.equal(isPlaceholderList(''), false)
	assert.deepEqual(build('ActivateListByNumber', { Key: '3' }), { command: 'ActivateList', data: { listId: 'guid-3' } })
	assert.deepEqual(build('ActivateListByNumber', { Key: 1 }), { command: 'ActivateList', data: { listId: 'guid-1' } })
	assert.equal(build('ActivateListByNumber', { Key: '4' }), null)
	assert.deepEqual(build('ActivateListByNumber', { Key: 'Next' }), {
		command: 'ActivateList',
		data: { listId: 'guid-3' },
	})
	assert.deepEqual(build('ActivateListByNumber', { Key: 'Previous' }), {
		command: 'ActivateList',
		data: { listId: 'guid-1' },
	})
	assert.deepEqual(build('ActivateNextList'), { command: 'ActivateList', data: { listId: 'guid-3' } })
	assert.deepEqual(build('ActivatePreviousList'), { command: 'ActivateList', data: { listId: 'guid-1' } })
	const lastActive = lists.map((l, i) => ({ ...l, isActive: i === 2 }))
	assert.deepEqual(build('ActivateNextList', {}, { lists: lastActive }).data.listId, 'guid-1', 'wraps forward')
	const firstActive = lists.map((l, i) => ({ ...l, isActive: i === 0 }))
	assert.deepEqual(build('ActivatePreviousList', {}, { lists: firstActive }).data.listId, 'guid-3', 'wraps backward')
	assert.equal(build('ActivateNextList', {}, { lists: [] }), null)
	assert.deepEqual(
		build('ActivateNextList', {}, { lists: lists.map((l) => ({ ...l, isActive: false })) }).data.listId,
		'guid-2',
		'no active list counts as the first',
	)
})

test('app-only actions are refused without the capability, with a warning', () => {
	logs.length = 0
	assert.equal(build('Fullscreen', { Key: 'on' }, { capabilities: [] }), null)
	assert.equal(build('ActivateNextList', {}, { capabilities: [] }), null)
	assert.equal(build('ActivateThisList', {}, { capabilities: ['outputs'] }), null)
	assert.equal(logs.filter(([level]) => level === 'warn').length, 3)
	assert.equal(build('Unknown'), null)
})
