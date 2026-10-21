import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getListVariableDefinitions, getVariableDefinitions } from '../index.js'

const HOST_VARIABLE_ID_REGEX = /^([a-zA-Z0-9-_.!]+)$/

test('valid timer ids are used unchanged', () => {
	const defs = getVariableDefinitions({ timers: { 1: {}, Speaker1: {}, 'a-b_c.d!': {} }, lists: [] })
	for (const id of ['timer_1_name', 'timer_1_duration', 'timer_Speaker1_name', 'timer_a-b_c.d!_duration']) {
		assert.ok(defs[id], id)
	}
})

test('timer ids with unsupported characters become valid, distinct ids', () => {
	const defs = getVariableDefinitions({ timers: { 'A B': {}, 'Speaker #2': {} }, lists: [] })
	assert.ok(defs['timer_A_B_546d26b2_name'])
	assert.ok(defs[`timer_Speaker_2_${fnv1a32Hex('Speaker #2')}_duration`])
	for (const id of Object.keys(defs)) assert.match(id, HOST_VARIABLE_ID_REGEX)
})

test('the fixed variables are always present', () => {
	const defs = getVariableDefinitions({ timers: {}, lists: [] })
	for (const id of [
		'hours',
		'minutes',
		'seconds',
		'name',
		'speed',
		'endTime',
		'nextTimerName',
		'nextTimerDuration',
		'scheduleOffset',
		'scheduleOffsetStatus',
		'listName',
		'listNumber',
		'listGUID',
		'listDisplayLink',
		'listControlLink',
	]) {
		assert.ok(defs[id], id)
	}
})

test('list variables are produced for each list', () => {
	const lists = [{ title: 'One' }, { title: 'Two' }, { title: 'Three' }]
	const variables = getListVariableDefinitions(lists)
	for (let i = 1; i <= 3; i++) {
		assert.ok(variables[`list_${i}_name`])
		assert.ok(variables[`list_${i}_display_link`])
		assert.ok(variables[`list_${i}_control_link`])
	}
	assert.equal(variables.list_4_name, undefined)
	assert.equal(Object.keys(getListVariableDefinitions([])).length, 5)
})

import { fnv1a32Hex, timerVariableBase, timerVariableMap } from '../index.js'

test('fnv1a32Hex is the reference FNV-1a 32-bit hash', () => {
	assert.equal(fnv1a32Hex(''), '811c9dc5')
	assert.equal(fnv1a32Hex('a'), 'e40c292c')
	assert.equal(fnv1a32Hex('foobar'), 'bf9cf968')
})

test('timerVariableBase keeps valid ids and derives distinct ids for the rest', () => {
	for (const id of ['1', 'Speaker1', 'a-b_c.d!']) assert.equal(timerVariableBase(id), id)
	assert.equal(timerVariableBase('A B'), 'A_B_546d26b2')
	const derived = ['A B', 'AB', 'A#B', 'A  B', 'A-B'].map(timerVariableBase)
	assert.equal(new Set(derived).size, derived.length)
	for (const id of ['مرحبا', '计时器', '嬻一', '棖一', '   ', '#', 'Speaker #2']) {
		const b = timerVariableBase(id)
		assert.match(b, HOST_VARIABLE_ID_REGEX, id)
		assert.match(`timer_${b}_name`, HOST_VARIABLE_ID_REGEX, id)
	}
	assert.notEqual(timerVariableBase('嬻一'), timerVariableBase('棖一'))
})

test('timerVariableMap maps a normal set without collisions', () => {
	const { bases, collisions } = timerVariableMap(['1', '2', 'A B', 'Speaker1'])
	assert.deepEqual(collisions, [])
	assert.equal(bases.get('1'), '1')
	assert.equal(bases.get('A B'), 'A_B_546d26b2')
	assert.equal(bases.size, 4)
})

test('timerVariableMap suppresses every timer involved in a collision and reports it', () => {
	const literal = 'A_B_546d26b2' // a valid raw ID equal to the derived id of 'A B'
	const { bases, collisions } = timerVariableMap(['1', 'A B', literal])
	assert.equal(bases.get('1'), '1')
	assert.equal(bases.has('A B'), false)
	assert.equal(bases.has(literal), false)
	assert.deepEqual(collisions, [{ base: literal, ids: ['A B', literal].sort() }])
})

test('adding or removing a colliding timer never changes or redirects a surviving timer', () => {
	const before = timerVariableMap(['1', 'A B'])
	const during = timerVariableMap(['1', 'A B', 'A_B_546d26b2'])
	const after = timerVariableMap(['1', 'A B'])
	assert.equal(during.bases.get('1'), before.bases.get('1'))
	assert.equal(after.bases.get('A B'), before.bases.get('A B'))
	for (const { base } of during.collisions) {
		for (const b of during.bases.values()) assert.notEqual(b, base)
	}
})

test('after the original timer is removed, a timer deriving to the same base takes the variable over', () => {
	// Stateless by design: this is the same semantics as deleting timer "1" and creating a new timer "1".
	const literal = 'A_B_546d26b2'
	const withOriginal = timerVariableMap(['A B'])
	const both = timerVariableMap(['A B', literal])
	const afterRemoval = timerVariableMap([literal])
	assert.equal(withOriginal.bases.get('A B'), literal)
	assert.equal(both.bases.size, 0)
	assert.equal(afterRemoval.bases.get(literal), literal)
})

test('timerVariableMap does not depend on input order', () => {
	const a = timerVariableMap(['1', 'A B', 'x', 'A#B'])
	const b = timerVariableMap(['A#B', 'x', 'A B', '1'])
	assert.deepEqual([...a.bases.entries()].sort(), [...b.bases.entries()].sort())
	assert.deepEqual(a.collisions, b.collisions)
})

test('getVariableDefinitions leaves suppressed timers out', () => {
	const defs = getVariableDefinitions({ timers: { 1: {}, 'A B': {}, ['A_B_546d26b2']: {} }, lists: [] })
	assert.ok(defs.timer_1_name)
	assert.equal(defs['timer_A_B_546d26b2_name'], undefined)
	const mapped = getVariableDefinitions({ timers: { 1: {}, 'A B': {} }, lists: [] })
	assert.ok(mapped['timer_A_B_546d26b2_name'])
})
