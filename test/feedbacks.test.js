import assert from 'node:assert/strict'
import { test } from 'node:test'
import CueTimerInstance from '../src/main.js'
import { getFeedbackDefinitions } from '../src/feedbacks.js'
import { emptyState } from '../src/state.js'

test('saved 2.2.2 text feedbacks keep working through updates, removal and disconnect', () => {
	const inst = Object.create(CueTimerInstance.prototype)
	const rendered = {}
	const savedFeedbacks = [
		{ feedbackId: 'timerName', options: { Key: 'Opening' } },
		{ feedbackId: 'timerDuration', options: { Key: 'Opening' } },
	]
	Object.assign(inst, emptyState(), {
		setVariableDefinitions() {},
		setVariableValues() {},
		presets() {},
		log() {},
		checkFeedbacks(...ids) {
			const definitions = getFeedbackDefinitions(this)
			for (const feedback of savedFeedbacks) {
				if (ids.includes(feedback.feedbackId)) {
					rendered[feedback.feedbackId] = definitions[feedback.feedbackId].callback(feedback)
				}
			}
		},
	})
	const timer = { visibleID: 'Opening', name: 'Welcome', duration: '00:10:00' }
	inst.applyState({ timers: [timer] })
	assert.deepEqual(rendered, { timerName: { text: 'Welcome' }, timerDuration: { text: '00:10:00' } })
	inst.applyState({ timers: [{ ...timer, name: 'Introduction', duration: '00:09:00' }] })
	assert.deepEqual(rendered, { timerName: { text: 'Introduction' }, timerDuration: { text: '00:09:00' } })
	inst.applyState({ timers: [] })
	assert.deepEqual(rendered, { timerName: {}, timerDuration: {} })
	inst.applyState({ timers: [timer] })
	inst.resetLiveState()
	assert.deepEqual(rendered, { timerName: {}, timerDuration: {} })
})

test('local name and duration values refresh on timer updates, removal, disconnect and reconnect', () => {
	const inst = Object.create(CueTimerInstance.prototype)
	const rendered = {}
	Object.assign(inst, emptyState(), {
		setVariableDefinitions() {},
		setVariableValues() {},
		presets() {},
		log() {},
		checkFeedbacks(...ids) {
			const definitions = getFeedbackDefinitions(this)
			for (const id of ['timerNameValue', 'timerDurationValue']) {
				if (ids.includes(id)) rendered[id] = definitions[id].callback({ options: { Key: 'Speaker A' } })
			}
		},
	})
	const timer = { visibleID: 'Speaker A', name: 'Opening', duration: '00:10:00' }
	inst.applyState({ timers: [timer] })
	assert.deepEqual(rendered, { timerNameValue: 'Opening', timerDurationValue: '00:10:00' })
	inst.applyState({ timers: [{ ...timer, name: 'Renamed', duration: '00:09:59' }] })
	assert.deepEqual(rendered, { timerNameValue: 'Renamed', timerDurationValue: '00:09:59' })
	inst.applyState({ timers: [] })
	assert.deepEqual(rendered, {
		timerNameValue: 'ID: Speaker A\nNot found',
		timerDurationValue: 'ID: Speaker A\nNot found',
	})
	inst.applyState({ timers: [timer] })
	inst.resetLiveState()
	assert.deepEqual(rendered, {
		timerNameValue: 'ID: Speaker A\nOffline',
		timerDurationValue: 'ID: Speaker A\nOffline',
	})
	inst.applyState({ timers: [timer] })
	assert.deepEqual(rendered, { timerNameValue: 'Opening', timerDurationValue: '00:10:00' })
})

test('ID preset displays distinguish missing IDs, offline state and unnamed matching timers', () => {
	const ctx = { ...emptyState(), snapshot: { timers: [] } }
	const definitions = getFeedbackDefinitions(ctx)
	for (const feedbackId of ['timerNameValue', 'timerDurationValue']) {
		const value = (id) => definitions[feedbackId].callback({ options: { Key: id } })
		for (const id of ['3', 'Speaker A', '计时器', 'constructor']) {
			ctx.snapshot = { timers: [] }
			assert.equal(value(id), `ID: ${id}\nNot found`)
			ctx.snapshot = null
			assert.equal(value(id), `ID: ${id}\nOffline`)
		}
		for (const id of ['', '   ', undefined]) assert.equal(value(id), 'Set timer ID')
	}
	ctx.snapshot = { timers: [{ visibleID: '3' }] }
	ctx.timers = { 3: { name: '', duration: '00:00:00' } }
	assert.equal(definitions.timerNameValue.callback({ options: { Key: '3' } }), 'Unnamed timer')
	assert.equal(definitions.timerDurationValue.callback({ options: { Key: '3' } }), '00:00:00')
})

test('the timer state feedback is on only for the state CueTimer reports', () => {
	const inst = Object.create(CueTimerInstance.prototype)
	const values = {}
	const checked = []
	Object.assign(inst, emptyState(), {
		setVariableDefinitions() {},
		setVariableValues(v) {
			Object.assign(values, v)
		},
		presets() {},
		log() {},
		checkFeedbacks(...ids) {
			checked.push(ids)
		},
	})
	const definitions = () => getFeedbackDefinitions(inst)
	const on = (Key) => definitions().timerState.callback({ feedbackId: 'timerState', options: { Key } })
	const states = ['idle', 'normal', 'alert1', 'alert2', 'overtime']

	assert.equal(definitions().timerState.type, 'boolean')
	assert.equal(definitions().timerState.options[0].default, 'overtime')
	assert.deepEqual(
		definitions().timerState.options[0].choices.map((c) => c.id),
		states,
	)
	// Before any snapshot nothing matches
	assert.deepEqual(states.map(on), [false, false, false, false, false])

	for (const state of states) {
		inst.applyState({ timer: { state }, timers: [] })
		assert.equal(values.state, state)
		assert.ok(checked.at(-1).includes('timerState'), 'the feedback is re-checked on every snapshot')
		assert.deepEqual(
			states.map(on),
			states.map((s) => s === state),
			state,
		)
	}

	// A CueTimer from before the state: the variable is empty and the feedback off
	inst.applyState({ timer: {}, timers: [] })
	assert.equal(values.state, '')
	assert.deepEqual(states.map(on), [false, false, false, false, false])

	// After a disconnect the last state is not kept
	inst.applyState({ timer: { state: 'overtime' }, timers: [] })
	assert.equal(on('overtime'), true)
	inst.resetLiveState()
	assert.equal(values.state, '')
	assert.ok(checked.at(-1).includes('timerState'))
	assert.equal(on('overtime'), false)
})
