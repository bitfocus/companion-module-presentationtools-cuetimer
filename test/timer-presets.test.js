import assert from 'node:assert/strict'
import { test } from 'node:test'
import CueTimerInstance from '../src/main.js'
import { getPresets } from '../src/presets.js'
import { getFeedbackDefinitions } from '../src/feedbacks.js'
import { buildEngineCommand } from '../src/engine-commands.js'
import { ALL_CAPABILITIES, emptyState, mapState } from '../src/state.js'
import { getVariableDefinitions, timerVariableBase } from '../src/variables.js'

const timers = [
	{ guid: 'g4', visibleID: '4', name: 'First', duration: '00:10:00', isActive: true },
	{ guid: 'none', visibleID: '', name: 'No ID' },
	{ guid: 'g1', visibleID: '1', name: 'Second', duration: '00:20:00', isNext: true },
	{ guid: 'ga', visibleID: 'A', name: 'Third', duration: '00:30:00' },
	{ guid: 'gs', visibleID: 'Speaker A', name: 'Fourth', duration: '00:40:00' },
	{ guid: 'gu', visibleID: '计时器', name: 'Fifth', duration: '00:50:00' },
]

test('start and cue sections have distinct preset identities and preserve existing start presets', () => {
	const result = getPresets('cuetimer', [], timers)
	const sections = result.structure.filter((section) =>
		['start-timer-with-id', 'cue-timer-with-id'].includes(section.id),
	)
	assert.deepEqual(
		sections.map((section) => section.id),
		['start-timer-with-id', 'cue-timer-with-id'],
	)
	const references = sections.flatMap((section) => section.definitions.flatMap((group) => group.presets))
	assert.equal(new Set(references).size, references.length)
	for (const key of references) assert.ok(result.presets[key], key)
	assert.deepEqual(sections[0].definitions[0].presets, ['timer-id-34-start', 'timer-id-34-duration'])
})

for (const { mode, label: actionLabel, actionId, command } of [
	{ mode: 'start', label: 'Start', actionId: 'FireTimerWithID', command: 'FireTimerByGuid' },
	{ mode: 'cue', label: 'Cue', actionId: 'CueTimerWithID', command: 'SetNextByGuid' },
]) {
	const sectionOf = (result) => result.structure.find((section) => section.id === `${mode}-timer-with-id`)
	test(`${actionLabel}: each assigned ID has an ordered name and duration pair with matching actions, variables and feedback`, () => {
		for (const capabilities of [ALL_CAPABILITIES, []]) {
			const label = 'Stage A'
			const result = getPresets(label, capabilities, timers)
			const section = sectionOf(result)
			assert.equal(section.name, `${actionLabel} timer with ID`)
			const eligible = timers.filter((timer) => timer.visibleID)
			assert.equal(section.definitions.length, eligible.length)
			const mapped = mapState({ timers })
			const variables = getVariableDefinitions(mapped)
			const feedback = getFeedbackDefinitions(mapped).timerBackground
			for (const [index, group] of section.definitions.entries()) {
				const timer = eligible[index]
				const id = timer.visibleID
				assert.equal(group.name, `ID ${id} – ${timer.name}`)
				assert.equal(group.type, 'simple')
				assert.equal(group.presets.length, 2)
				const [start, duration] = group.presets.map((key) => result.presets[key])
				const base = timerVariableBase(id)
				assert.ok(variables[`timer_${base}_name`])
				assert.ok(variables[`timer_${base}_duration`])
				assert.equal(start.style.text, `${id} – $(${label}:timer_${base}_name)`)
				assert.equal(duration.style.text, `$(${label}:timer_${base}_duration)`)
				assert.deepEqual(start.steps, [{ down: [{ actionId, options: { Key: id } }], up: [] }])
				assert.deepEqual(duration.steps, [{ down: [], up: [] }])
				assert.deepEqual(buildEngineCommand(start.steps[0].down[0], { snapshot: { timers }, capabilities }), {
					command,
					data: { guid: timer.guid },
				})
				for (const preset of [start, duration]) {
					assert.equal(preset.type, 'simple')
					for (const property of ['text', 'size', 'color', 'bgcolor'])
						assert.notEqual(preset.style[property], undefined)
					assert.deepEqual(preset.feedbacks, [{ feedbackId: 'timerBackground', options: { Key: id } }])
					assert.deepEqual(feedback.callback(preset.feedbacks[0]), {
						bgcolor: timer.isActive ? 0xff0000 : timer.isNext ? 0x77bed2 : 0,
					})
				}
			}
		}
	})

	test(`${actionLabel}: preset identities stay stable when timers are renamed, reordered or other IDs are removed`, () => {
		const first = getPresets('cuetimer', [], timers)
		const changedTimers = [...timers].reverse().map((timer) => ({ ...timer, name: `${timer.name} renamed` }))
		const changed = getPresets('cuetimer', [], changedTimers)
		assert.deepEqual(
			sectionOf(changed).definitions.map((group) => group.id),
			sectionOf(first)
				.definitions.map((group) => group.id)
				.reverse(),
		)
		for (const group of sectionOf(first).definitions) {
			for (const key of group.presets) {
				assert.deepEqual(changed.presets[key].steps, first.presets[key].steps)
				assert.deepEqual(changed.presets[key].style, first.presets[key].style)
			}
		}
		const single = getPresets('cuetimer', [], [timers[0]])
		assert.deepEqual(sectionOf(single).definitions[0], sectionOf(first).definitions[0])
	})

	test(`${actionLabel}: empty and conflicting IDs never produce unusable or ambiguous preset pairs`, () => {
		assert.equal(sectionOf(getPresets('cuetimer')), undefined)
		assert.equal(sectionOf(getPresets('cuetimer', [], [{ visibleID: '' }, {}])), undefined)
		const result = getPresets(
			'cuetimer',
			[],
			[
				{ visibleID: 'A B' },
				{ visibleID: 'A_B_546d26b2' },
				{ visibleID: 'duplicate' },
				{ visibleID: 'duplicate' },
				{ visibleID: 'OK' },
			],
		)
		assert.deepEqual(
			sectionOf(result).definitions.map((group) => group.name),
			['ID OK'],
		)
	})

	test(`${actionLabel}: live preset catalog refreshes on relevant list changes, clears offline, and returns on reconnect`, async () => {
		const inst = Object.create(CueTimerInstance.prototype)
		Object.defineProperty(inst, 'label', { value: 'cuetimer' })
		const publications = []
		Object.assign(inst, emptyState(), {
			config: { mode: 'app', list: '' },
			capabilities: ALL_CAPABILITIES,
			setPresetDefinitions: (structure, presets) => publications.push({ structure, presets }),
			setVariableDefinitions() {},
			setVariableValues() {},
			setActionDefinitions() {},
			setFeedbackDefinitions() {},
			checkFeedbacks() {},
			connect() {},
			log() {},
		})
		let snapshot = { list: { id: 'list-1' }, timers }
		inst.applyState(snapshot)
		assert.equal(publications.length, 1)
		assert.equal(sectionOf(publications.at(-1)).definitions.length, 5)
		// Running time, duration and background updates use variables/feedbacks, not a catalog rebuild.
		inst.applyState({
			...snapshot,
			timers: timers.map((timer) => ({ ...timer, duration: '00:09:59', isActive: false })),
		})
		assert.equal(publications.length, 1)
		snapshot = { ...snapshot, timers: [...timers].reverse() }
		inst.applyState(snapshot)
		assert.equal(publications.length, 2)
		snapshot = { ...snapshot, timers: snapshot.timers.map((timer) => ({ ...timer, name: 'Renamed' })) }
		inst.applyState(snapshot)
		assert.equal(publications.length, 3)
		assert.match(sectionOf(publications.at(-1)).definitions[0].name, /Renamed/)
		snapshot = { ...snapshot, timers: [{ guid: 'new', visibleID: 'B', name: 'New timer' }] }
		inst.applyState(snapshot)
		assert.equal(publications.length, 4)
		assert.deepEqual(
			sectionOf(publications.at(-1)).definitions.map((group) => group.name),
			['ID B – New timer'],
		)
		snapshot = { ...snapshot, list: { id: 'list-2' } }
		inst.applyState(snapshot)
		assert.equal(publications.length, 5)
		inst.resetLiveState()
		assert.equal(sectionOf(publications.at(-1)), undefined)
		inst.applyState(snapshot)
		assert.equal(sectionOf(publications.at(-1)).definitions.length, 1)
		inst.applyState({ ...snapshot, timers: [] })
		assert.equal(sectionOf(publications.at(-1)), undefined)
		inst.applyState(snapshot)
		await inst.configUpdated({ mode: 'cloud', listId: 'another-list' })
		assert.equal(sectionOf(publications.at(-1)), undefined)
	})
}
