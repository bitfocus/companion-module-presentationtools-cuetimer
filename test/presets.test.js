import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getActionDefinitions } from '../src/actions.js'
import { getFeedbackDefinitions } from '../src/feedbacks.js'
import { getPresets } from '../src/presets.js'

const stub = {
	config: { list: '' },
	lists: [],
	timers: {},
	buttonStates: {},
	actionCallback() {},
}

const actions = getActionDefinitions(stub)
const feedbacks = getFeedbackDefinitions(stub)
const { structure, presets } = getPresets('cuetimer')

test('on the Cloud the output and list presets are left out and no section is empty', () => {
	const cloud = getPresets('cuetimer', [])
	const cloudActions = getActionDefinitions({ ...stub, capabilities: [] })
	assert.deepEqual(
		cloud.structure.map((section) => section.id),
		['commands', 'feedbacks'],
	)
	for (const section of cloud.structure) assert.ok(section.definitions.length > 0, `${section.id} is empty`)
	for (const [id, preset] of Object.entries(cloud.presets)) {
		assert.equal(preset.requires, undefined, `${id} leaks its requirement`)
		for (const step of preset.steps) {
			for (const action of [...step.down, ...step.up]) {
				assert.ok(cloudActions[action.actionId], `${id} uses app-only action ${action.actionId}`)
			}
		}
		for (const feedback of preset.feedbacks) assert.notEqual(feedback.feedbackId, 'activeList', id)
	}
	const outputPresets = [
		'Fullscreen',
		'Preview',
		'Presenter',
		'NDI',
		'MultitimerPreview',
		'MultitimerFullscreen',
		'MultitimerNDI',
	]
	for (const id of [...outputPresets, 'PrevList', 'NextList', 'List1', 'List10'])
		assert.equal(cloud.presets[id], undefined, id)
	for (const id of outputPresets) assert.ok(presets[id], `${id} exists with the app`)
	assert.equal(Object.keys(presets).length - Object.keys(cloud.presets).length, outputPresets.length + 12)
})

const optionIds = (definition) => new Set(definition.options.map((option) => option.id))

test('the structure has the three sections and references only existing presets', () => {
	assert.deepEqual(
		structure.map((section) => section.id),
		['commands', 'list-control', 'feedbacks'],
	)
	const referenced = new Set()
	for (const section of structure) {
		assert.ok(section.definitions.length > 0, `${section.id} is empty`)
		for (const id of section.definitions) {
			assert.ok(presets[id], `${section.id} references unknown preset ${id}`)
			assert.ok(!referenced.has(id), `${id} is listed twice`)
			referenced.add(id)
		}
	}
	for (const id of Object.keys(presets)) {
		assert.ok(referenced.has(id), `preset ${id} is not in the structure`)
	}
})

test('every preset is a simple preset with a complete style and no category', () => {
	for (const [id, preset] of Object.entries(presets)) {
		assert.equal(preset.type, 'simple', id)
		assert.equal(preset.category, undefined, id)
		assert.equal(preset.requires, undefined, id)
		for (const key of ['text', 'size', 'color', 'bgcolor']) {
			assert.notEqual(preset.style[key], undefined, `${id} style.${key}`)
		}
		assert.ok(Array.isArray(preset.steps), id)
		assert.ok(Array.isArray(preset.feedbacks), id)
	}
})

test('every preset action references a known action and only its declared option keys', () => {
	for (const [id, preset] of Object.entries(presets)) {
		for (const step of preset.steps) {
			for (const action of [...step.down, ...step.up]) {
				const definition = actions[action.actionId]
				assert.ok(definition, `${id} uses unknown action ${action.actionId}`)
				assert.ok(action.options, `${id} action ${action.actionId} has no options`)
				for (const key of Object.keys(action.options)) {
					assert.ok(optionIds(definition).has(key), `${id} action ${action.actionId} has unknown option ${key}`)
				}
			}
		}
	}
})

test('every preset feedback references a known feedback, its option keys, and has a style when boolean', () => {
	for (const [id, preset] of Object.entries(presets)) {
		for (const feedback of preset.feedbacks) {
			const definition = feedbacks[feedback.feedbackId]
			assert.ok(definition, `${id} uses unknown feedback ${feedback.feedbackId}`)
			assert.ok(feedback.options, `${id} feedback ${feedback.feedbackId} has no options`)
			for (const key of Object.keys(feedback.options)) {
				assert.ok(optionIds(definition).has(key), `${id} feedback ${feedback.feedbackId} has unknown option ${key}`)
			}
			if (definition.type === 'boolean') {
				assert.ok(feedback.style, `${id} boolean feedback ${feedback.feedbackId} has no style`)
			} else {
				assert.equal(feedback.style, undefined, `${id} non-boolean feedback ${feedback.feedbackId} has a style`)
			}
		}
	}
})

test('list presets use string option values matching the dropdown choice ids', () => {
	const choiceIds = new Set(actions.ActivateListByNumber.options[0].choices.map((choice) => choice.id))
	for (let i = 1; i <= 10; i++) {
		const preset = presets[`List${i}`]
		assert.equal(preset.steps[0].down[0].options.Key, String(i))
		assert.ok(choiceIds.has(String(i)))
		assert.equal(preset.feedbacks[0].options.Key, String(i))
	}
})

test('advanced feedbacks declare affectedProperties', () => {
	for (const [id, definition] of Object.entries(feedbacks)) {
		if (definition.type === 'advanced') {
			assert.ok(Array.isArray(definition.affectedProperties) && definition.affectedProperties.length > 0, id)
		}
	}
})
