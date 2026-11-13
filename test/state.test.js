import assert from 'node:assert/strict'
import { test } from 'node:test'
import { combineRgb } from '@companion-module/base'
import {
	ALL_CAPABILITIES,
	capabilitiesForConfig,
	capabilitiesForMode,
	emptyState,
	mapState,
	splitDisplayTime,
} from '../src/state.js'

const snapshot = {
	list: { id: 'list-1', title: 'Main', number: 2 },
	timer: { displayTime: '-1:02', name: 'Opening', speed: '100', endTime: '23:00:00' },
	next: { name: 'Keynote', duration: '00:45:00' },
	colors: { fg: '#FEFFFFFF', bg: '#FF2600FF' },
	flags: {
		message: true,
		messageEnabled: true,
		singleMode: true,
		clock: false,
		presentation: false,
		paused: false,
		blackout: false,
	},
	outputs: {
		fullscreen: true,
		preview: false,
		presenter: true,
		ndi: false,
		multitimerPreview: false,
		multitimerFullscreen: false,
		multitimerNDI: true,
	},
	schedule: { offset: '00:01:00', status: 'Delayed' },
	timers: [
		{ guid: 'g1', visibleID: 'A', name: 'Opening', duration: '00:15:00', isActive: true },
		{ guid: 'g2', visibleID: 'B', name: 'Keynote', duration: '00:45:00', isNext: true },
		{ guid: 'g4', visibleID: 'D', name: 'Break', duration: '00:10:00' },
	],
	lists: [
		{
			id: 'list-0',
			title: 'First',
			isActive: false,
			controlLink: 'http://x/?id=list-0',
			displayLink: 'http://x/display/?id=list-0',
		},
		{
			id: 'list-1',
			title: 'Main',
			isActive: true,
			controlLink: 'http://x/?id=list-1',
			displayLink: 'http://x/display/?id=list-1',
		},
	],
}

test('the counter is split as the TCP frame was, with the overtime sign rule', () => {
	assert.deepEqual(splitDisplayTime('01:02:03'), { hours: '01', minutes: '02', seconds: '03' })
	assert.deepEqual(splitDisplayTime('02:03'), { hours: '', minutes: '02', seconds: '03' })
	assert.deepEqual(splitDisplayTime('45'), { hours: '', minutes: '', seconds: '45' })
	assert.deepEqual(splitDisplayTime(undefined), { hours: '', minutes: '', seconds: '' })
	const { variables } = mapState(snapshot)
	assert.deepEqual([variables.hours, variables.minutes, variables.seconds], ['', '+1', '02'])
	const plain = mapState({ ...snapshot, timer: { ...snapshot.timer, displayTime: '1:29:59' } }).variables
	assert.deepEqual([plain.hours, plain.minutes, plain.seconds], ['1', '29', '59'])
	// Overtime with hours shown: "-00" is minus zero, the sign still goes on the first part
	const overHours = mapState({ ...snapshot, timer: { ...snapshot.timer, displayTime: '-00:01:30' } }).variables
	assert.deepEqual([overHours.hours, overHours.minutes, overHours.seconds], ['+00', '01', '30'])
	const unsigned = mapState({ ...snapshot, timer: { ...snapshot.timer, displayTime: '12:34' } }).variables
	assert.deepEqual([unsigned.hours, unsigned.minutes, unsigned.seconds], ['', '12', '34'])
	const overSeconds = mapState({ ...snapshot, timer: { ...snapshot.timer, displayTime: '-7' } }).variables
	assert.deepEqual([overSeconds.hours, overSeconds.minutes, overSeconds.seconds], ['', '', '+7'])
})

test('the legacy variables keep their values', () => {
	const { variables } = mapState(snapshot)
	assert.equal(variables.name, 'Opening')
	assert.equal(variables.speed, '100')
	assert.equal(variables.endTime, '23:00:00')
	assert.equal(variables.nextTimerName, 'Keynote')
	assert.equal(variables.nextTimerDuration, '00:45:00')
	assert.equal(variables.scheduleOffset, '00:01:00')
	assert.equal(variables.scheduleOffsetStatus, 'Delayed')
	assert.deepEqual(Object.keys(variables).sort(), [
		'endTime',
		'hours',
		'minutes',
		'name',
		'nextTimerDuration',
		'nextTimerName',
		'scheduleOffset',
		'scheduleOffsetStatus',
		'seconds',
		'speed',
	])
})

test('button states follow the engine snapshot', () => {
	const { buttonStates } = mapState(snapshot)
	assert.deepEqual(buttonStates, {
		Fullscreen: true,
		Preview: false,
		Presenter: true,
		NDI: false,
		Message: true,
		STM: true,
		Clock: false,
		Pause: false,
		Blackout: false,
		MultitimerPreview: false,
		MultitimerFullscreen: false,
		MultitimerNDI: true,
	})
	const web = mapState({ ...snapshot, outputs: null })
	assert.equal(web.buttonStates.Fullscreen, false)
})

test('Message feedback stays on while enabled and idle, and turns off when disabled', () => {
	for (const messageEnabled of [true, false]) {
		const idle = mapState({
			...snapshot,
			flags: { ...snapshot.flags, message: false, messageEnabled },
		})
		assert.equal(idle.buttonStates.Message, messageEnabled)
	}
})

test('colours drop the alpha byte; timers are keyed by visible ID with the legacy row colours', () => {
	const mapped = mapState(snapshot)
	assert.equal(mapped.fgColor, combineRgb(0xfe, 0xff, 0xff))
	assert.equal(mapped.bgColor, combineRgb(0xff, 0x26, 0x00))
	assert.deepEqual(Object.keys(mapped.timers), ['A', 'B', 'D'])
	assert.equal(mapped.timers.A.bg, '#FF0000')
	assert.equal(mapped.timers.B.bg, '#77BED2')
	assert.equal(mapped.timers.D.bg, '#000000')
	assert.equal(mapped.timers.B.guid, 'g2')
	const blackout = mapState({ ...snapshot, colors: { fg: '#000000', bg: '#000000' } })
	assert.equal(blackout.fgColor, combineRgb(0, 0, 0))
	const broken = mapState({ ...snapshot, colors: { fg: 'nope', bg: undefined } })
	assert.equal(broken.fgColor, combineRgb(255, 255, 255))
	assert.equal(broken.bgColor, combineRgb(0, 0, 0))
})

test('lists, the current list and the sync error are exposed; the web has no lists', () => {
	const mapped = mapState(snapshot)
	assert.equal(mapped.listId, 'list-1')
	assert.equal(mapped.listNumber, 2)
	assert.equal(mapped.listTitle, 'Main')
	assert.deepEqual(
		mapped.lists.map((l) => [l.id, l.isActive]),
		[
			['list-0', false],
			['list-1', true],
		],
	)
	assert.equal(mapped.syncError, undefined)
	const web = mapState({
		...snapshot,
		lists: null,
		list: { id: 'room', title: 'Room', number: 0 },
		syncError: 'Cloud synchronization was interrupted.',
	})
	assert.deepEqual(web.lists, [])
	assert.equal(web.listNumber, 0)
	assert.equal(web.syncError, 'Cloud synchronization was interrupted.')
})

test('empty state and capabilities', () => {
	const empty = emptyState()
	assert.equal(empty.snapshot, null)
	assert.deepEqual(empty.lists, [])
	assert.equal(empty.buttonStates.Fullscreen, false)
	assert.deepEqual(capabilitiesForMode('desktop'), ['outputs', 'lists', 'links'])
	assert.deepEqual(capabilitiesForMode('web'), [])
	assert.deepEqual(capabilitiesForMode(undefined), [])
})

test('the configured target decides the capabilities before any handshake, so app buttons stay valid offline', () => {
	assert.deepEqual(capabilitiesForConfig({ mode: 'app' }), ALL_CAPABILITIES)
	assert.deepEqual(capabilitiesForConfig({ mode: 'cloud' }), [])
	assert.deepEqual(capabilitiesForConfig({}), ALL_CAPABILITIES)
	assert.deepEqual(capabilitiesForConfig(undefined), ALL_CAPABILITIES)
})
