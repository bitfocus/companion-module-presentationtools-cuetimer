import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildCommand } from '../index.js'

const lists = [{ guid: 'guid-1' }, { guid: 'guid-2' }]
const logs = []
const ctx = { config: { list: 'guid-2' }, lists, log: (level, message) => logs.push([level, message]) }

test('an action without options sends only its id and one terminator', () => {
	assert.equal(buildCommand({ actionId: 'FireNext', options: {} }, ctx), 'FireNext$')
	assert.equal(buildCommand({ actionId: 'FireNext' }, ctx), 'FireNext$')
})

test('a Key option is appended after #', () => {
	assert.equal(buildCommand({ actionId: 'SetDuration', options: { Key: '00:10:00' } }, ctx), 'SetDuration#00:10:00$')
	assert.equal(buildCommand({ actionId: 'Fullscreen', options: { Key: 'toggle' } }, ctx), 'Fullscreen#toggle$')
	assert.equal(buildCommand({ actionId: 'FireTimerWithID', options: { Key: 3 } }, ctx), 'FireTimerWithID#3$')
})

test('ActivateThisList uses the configured GUID, or sends nothing', () => {
	assert.equal(buildCommand({ actionId: 'ActivateThisList', options: {} }, ctx), 'ActivateListByGUID#guid-2$')
	assert.equal(buildCommand({ actionId: 'ActivateThisList', options: {} }, { ...ctx, config: { list: '' } }), null)
	assert.equal(buildCommand({ actionId: 'ActivateThisList', options: {} }, { lists }), null)
})

test('ActivateListByNumber handles Previous, Next, a number and out of range', () => {
	assert.equal(
		buildCommand({ actionId: 'ActivateListByNumber', options: { Key: 'Previous' } }, ctx),
		'ActivatePreviousList$',
	)
	assert.equal(buildCommand({ actionId: 'ActivateListByNumber', options: { Key: 'Next' } }, ctx), 'ActivateNextList$')
	assert.equal(
		buildCommand({ actionId: 'ActivateListByNumber', options: { Key: '2' } }, ctx),
		'ActivateListByGUID#guid-2$',
	)
	assert.equal(
		buildCommand({ actionId: 'ActivateListByNumber', options: { Key: 1 } }, ctx),
		'ActivateListByGUID#guid-1$',
	)
	assert.equal(buildCommand({ actionId: 'ActivateListByNumber', options: { Key: '3' } }, ctx), null)
	assert.equal(buildCommand({ actionId: 'ActivateListByNumber', options: { Key: 'abc' } }, ctx), null)
	assert.equal(
		buildCommand({ actionId: 'ActivateListByNumber', options: { Key: '1' } }, { config: {}, lists: [] }),
		null,
	)
})

test('every emitted command ends in exactly one terminator', () => {
	const commands = [
		buildCommand({ actionId: 'ActivateNextList', options: {} }, ctx),
		buildCommand({ actionId: 'ActivateThisList', options: {} }, ctx),
		buildCommand({ actionId: 'ActivateListByNumber', options: { Key: 'Next' } }, ctx),
		buildCommand({ actionId: 'AddXMinutes', options: { Key: '5' } }, ctx),
	]
	for (const cmd of commands) {
		assert.match(cmd, /[^$]\$$/)
	}
})
