import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sanitizeVariable } from '@companion-module/base'
import { getListVariableDefinitions, getVariableDefinitions } from '../index.js'

const HOST_VARIABLE_ID_REGEX = /^([a-zA-Z0-9-_.!]+)$/

test('valid timer ids are used unchanged', () => {
	const defs = getVariableDefinitions({ timers: { 1: {}, Speaker1: {}, 'a-b_c.d!': {} }, lists: [] })
	for (const id of ['timer_1_name', 'timer_1_duration', 'timer_Speaker1_name', 'timer_a-b_c.d!_duration']) {
		assert.ok(defs[id], id)
	}
})

test('timer ids with unsupported characters are sanitised to valid ids', () => {
	const defs = getVariableDefinitions({ timers: { 'A B': {}, 'Speaker #2': {} }, lists: [] })
	assert.ok(defs.timer_AB_name)
	assert.ok(defs.timer_Speaker2_duration)
	for (const id of Object.keys(defs)) assert.match(id, HOST_VARIABLE_ID_REGEX)
	assert.equal(sanitizeVariable('A B'), 'AB')
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
