import assert from 'node:assert/strict'
import { test } from 'node:test'
import { InstanceStatus } from '@companion-module/base'
import CueTimerInstance from '../src/main.js'

/** The instance without Companion's runtime: only what refreshStatus() reads */
function instance() {
	const calls = []
	const inst = Object.create(CueTimerInstance.prototype)
	Object.assign(inst, {
		lastStatus: 'ok',
		config: { mode: 'app', list: '' },
		snapshot: { list: { id: 'abc' } },
		syncError: '',
		updateStatus: (status, message) => calls.push([status, message ?? null]),
	})
	return { inst, calls }
}

test('an unchanged status is reported to Companion once, not on every snapshot', () => {
	const { inst, calls } = instance()
	inst.refreshStatus()
	inst.refreshStatus()
	inst.refreshStatus()
	assert.deepEqual(calls, [[InstanceStatus.Ok, null]])
})

test('a changed status or message is reported, and Ok again when it clears', () => {
	const { inst, calls } = instance()
	inst.refreshStatus()
	inst.syncError = 'Cloud is offline'
	inst.refreshStatus()
	inst.refreshStatus()
	inst.syncError = ''
	inst.refreshStatus()
	assert.deepEqual(calls, [
		[InstanceStatus.Ok, null],
		[InstanceStatus.UnknownWarning, 'Cloud sync needs attention in the CueTimer control page: Cloud is offline'],
		[InstanceStatus.Ok, null],
	])
})

test('a connection status other than ok goes through the same deduplication', () => {
	const { inst, calls } = instance()
	inst.reportStatus(InstanceStatus.Connecting, 'Connecting')
	inst.reportStatus(InstanceStatus.Connecting, 'Connecting')
	inst.reportStatus(InstanceStatus.Connecting, 'Waiting for CueTimer')
	assert.deepEqual(calls, [
		[InstanceStatus.Connecting, 'Connecting'],
		[InstanceStatus.Connecting, 'Waiting for CueTimer'],
	])
})

test('a placeholder list number beyond the catalog warns like a missing list id', () => {
	const { inst, calls } = instance()
	inst.config = { mode: 'app', list: '5' }
	inst.lists = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
	inst.refreshStatus()
	assert.deepEqual(calls, [[InstanceStatus.UnknownWarning, 'Selected list not found, active list will be used']])
	// Within the catalog (or before the catalog is known) the number is fine
	inst.config = { mode: 'app', list: '3' }
	inst.refreshStatus()
	inst.config = { mode: 'app', list: '5' }
	inst.lists = []
	inst.refreshStatus()
	assert.deepEqual(calls.at(-1), [InstanceStatus.Ok, null])
	assert.equal(calls.length, 2)
})
