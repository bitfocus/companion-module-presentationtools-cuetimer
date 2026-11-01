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
