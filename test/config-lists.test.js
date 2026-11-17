import assert from 'node:assert/strict'
import { test } from 'node:test'
import CueTimerInstance from '../src/main.js'
import { emptyState } from '../src/state.js'

const config = { mode: 'app', host: '127.0.0.1', port: '31609', list: '' }
const lists = [
	{ id: 'opening', title: 'Opening' },
	{ id: 'show', title: 'Main show' },
]

function choices(inst) {
	return inst.getConfigFields().find((field) => field.id === 'list').choices
}

function instance() {
	const inst = Object.create(CueTimerInstance.prototype)
	const publications = []
	Object.assign(inst, emptyState(), {
		config: { ...config },
		log() {},
		actions() {},
		feedbacks() {},
		presets() {},
		variables() {},
		setVariableValues() {},
		checkFeedbacks() {},
		connect() {
			this.resetLiveState()
		},
		saveConfig(value) {
			publications.push({ value: structuredClone(value), choices: choices(this) })
		},
	})
	return { inst, publications }
}

test('the first snapshot refreshes an already open list menu without changing settings', () => {
	const { inst, publications } = instance()
	assert.equal(choices(inst)[1].id, '1')
	inst.applyState({ lists })
	assert.equal(publications.length, 1)
	assert.equal(publications[0].value, undefined)
	assert.deepEqual(publications[0].choices.slice(1, 3), [
		{ id: 'opening', label: '1- Opening' },
		{ id: 'show', label: '2- Main show' },
	])
	assert.deepEqual(inst.config, config)
})

test('rename, reorder, add and remove refresh the menu, but timer ticks and active-list changes do not', () => {
	const { inst, publications } = instance()
	inst.applyState({ lists })
	inst.applyState({ lists, timer: { displayTime: '00:01' } })
	inst.applyState({ lists: lists.map((list) => ({ ...list, isActive: true, controlLink: 'new-link' })) })
	assert.equal(publications.length, 1)
	const renamed = [lists[0], { ...lists[1], title: 'Renamed show' }]
	inst.applyState({ lists: renamed })
	assert.equal(publications.at(-1).choices[2].label, '2- Renamed show')
	inst.applyState({ lists: [...renamed].reverse() })
	assert.equal(publications.at(-1).choices[1].id, 'show')
	inst.applyState({ lists: [...lists, { id: 'closing', title: 'Closing' }] })
	assert.equal(publications.at(-1).choices[3].id, 'closing')
	inst.applyState({ lists: [] })
	assert.equal(publications.at(-1).choices[1].id, '1')
	assert.equal(publications.length, 5)
})

test('a disconnect or save on the same computer retains names until fresh data arrives', async () => {
	const { inst, publications } = instance()
	inst.applyState({ lists })
	inst.resetLiveState()
	assert.deepEqual(inst.lists, [], 'live state is still cleared')
	assert.equal(choices(inst)[1].id, 'opening')
	inst.applyState({ lists })
	await inst.configUpdated({ ...config, list: 'show', timeZone: 'schedule' })
	assert.equal(choices(inst)[2].id, 'show')
	inst.applyState({ lists })
	assert.equal(publications.length, 1, 'the menu already has the current names')
	inst.resetLiveState()
	inst.applyState({ lists: [{ id: 'new', title: 'New list' }] })
	assert.equal(publications.at(-1).choices[1].id, 'new')
})

test('changing computer or switching to Cloud clears the previous computer catalog', async () => {
	for (const next of [
		{ ...config, host: '192.168.1.81' },
		{ ...config, port: '31610' },
		{ ...config, bonjourHost: '192.168.1.81:31610' },
		{ ...config, mode: 'cloud', listId: 'cloud-list' },
		{ ...config, host: '' },
	]) {
		const { inst, publications } = instance()
		inst.applyState({ lists })
		await inst.configUpdated(next)
		assert.equal(choices(inst)[1].id, '1')
		assert.equal(publications.length, 2)
		assert.equal(publications[1].value, undefined)
		inst.applyState({ lists: [{ id: 'other', title: 'Other computer' }] })
		assert.equal(publications.at(-1).choices[1].label, '1- Other computer')
	}
})

test('a new connection publishes names before pinning its numbered list and keeps them during reconnect', () => {
	const { inst, publications } = instance()
	inst.config.list = '2'
	inst.applyState({ lists })
	assert.equal(inst.config.list, 'show')
	assert.equal(publications.length, 2)
	assert.equal(publications[0].value, undefined)
	assert.equal(publications[1].value.list, 'show')
	assert.equal(inst.snapshot, null, 'pinning reconnects and clears live state')
	assert.equal(choices(inst)[2].label, '2- Main show')
	inst.applyState({ lists, list: lists[1] })
	assert.equal(publications.length, 2)
})
