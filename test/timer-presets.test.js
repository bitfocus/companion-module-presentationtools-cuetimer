import assert from 'node:assert/strict'
import { test } from 'node:test'
import CueTimerInstance from '../src/main.js'
import { getPresets } from '../src/presets.js'
import { getFeedbackDefinitions } from '../src/feedbacks.js'
import { buildEngineCommand } from '../src/engine-commands.js'
import { ALL_CAPABILITIES, emptyState, mapState } from '../src/state.js'

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
	const references = sections.flatMap((section) => section.definitions.map((group) => group.presetId))
	assert.equal(new Set(references).size, references.length)
	for (const key of references) assert.ok(result.presets[key], key)
	assert.deepEqual(
		sections[0].definitions.slice(1, 3).map((group) => group.presetId),
		['timer-id-34-start', 'timer-id-34-duration'],
	)
})

for (const { mode, label: actionLabel, actionId, command } of [
	{ mode: 'start', label: 'Start', actionId: 'FireTimerWithID', command: 'FireTimerByGuid' },
	{ mode: 'cue', label: 'Cue', actionId: 'CueTimerWithID', command: 'SetNextByGuid' },
]) {
	const sectionOf = (result) => result.structure.find((section) => section.id === `${mode}-timer-with-id`)
	test(`${actionLabel}: changing one local ID retargets the action, editable display and background`, () => {
		for (const capabilities of [ALL_CAPABILITIES, []]) {
			const result = getPresets('Stage A', capabilities, timers)
			const section = sectionOf(result)
			const eligible = timers.filter((timer) => timer.visibleID)
			assert.equal(section.definitions.length, eligible.length * 2 + 1)
			assert.equal(section.definitions[0].name, `${actionLabel} with ID — enter ID manually`)
			const definitions = getFeedbackDefinitions(mapState({ timers }))
			for (const [index, group] of section.definitions.entries()) {
				const expectedId = index === 0 ? '' : eligible[Math.floor((index - 1) / 2)].visibleID
				if (index > 0) {
					assert.equal(
						group.name,
						`ID ${expectedId} – ${eligible[Math.floor((index - 1) / 2)].name} (${index % 2 ? `Name / ${actionLabel}` : 'Duration'})`,
					)
				}
				for (const key of [group.presetId]) {
					const preset = result.presets[key]
					const editable = preset.localVariables.filter((variable) => variable.variableType === 'simple')
					assert.equal(editable.length, 1)
					assert.equal(editable[0].variableName, 'timer_id')
					assert.equal(editable[0].startupValue, expectedId)
					assert.equal(group.type, 'template')
					assert.equal(group.templateVariableName, editable[0].variableName)
					assert.deepEqual(group.templateValues, [{ name: preset.name, value: expectedId }])
					assert.equal(group.commonVariableValues, undefined) // Expose only Timer ID, never the display variable.
					const display = preset.localVariables.find((variable) => variable.variableType === 'feedback')
					assert.ok(definitions[display.feedbackId])
					const duration = display.variableName === 'timer_duration'
					assert.equal(display.feedbackId, duration ? 'timerDurationValue' : 'timerNameValue')
					assert.equal(preset.style.text, `$(local:${display.variableName})`)
					assert.equal(preset.feedbacks.length, 1) // No text override: custom labels stay editable.
					assert.equal(preset.feedbacks[0].feedbackId, 'timerBackground')
					if (duration) assert.deepEqual(preset.steps, [{ down: [], up: [] }])
					else {
						assert.equal(preset.steps[0].down[0].actionId, actionId)
					}
					// Companion resolves this expression before invoking callbacks. Verify every
					// consumer shares it, then exercise callbacks with numeric, text and Unicode IDs.
					const resolve = (entry, id) => {
						assert.deepEqual(entry.options.Key, { isExpression: true, value: '$(local:timer_id)' })
						return { ...entry, options: { Key: id } }
					}
					for (const timer of eligible) {
						const id = timer.visibleID
						assert.equal(
							definitions[display.feedbackId].callback(resolve(display, id)),
							duration ? timer.duration : timer.name,
						)
						assert.deepEqual(definitions.timerBackground.callback(resolve(preset.feedbacks[0], id)), {
							bgcolor: timer.isActive ? 0xff0000 : timer.isNext ? 0x77bed2 : 0,
						})
						if (!duration)
							assert.deepEqual(
								buildEngineCommand(resolve(preset.steps[0].down[0], id), { snapshot: { timers }, capabilities }),
								{
									command,
									data: { guid: timer.guid },
								},
							)
					}
					assert.equal(
						definitions[display.feedbackId].callback(resolve(display, 'not assigned')),
						'ID: not assigned\nNot found',
					)
					assert.deepEqual(definitions.timerBackground.callback(resolve(preset.feedbacks[0], 'not assigned')), {
						bgcolor: 0,
					})
					if (!duration)
						assert.equal(
							buildEngineCommand(resolve(preset.steps[0].down[0], 'not assigned'), {
								snapshot: { timers },
								capabilities,
							}),
							null,
						)
				}
			}
		}
	})

	test(`${actionLabel}: preset identities stay stable when timers are renamed, reordered or other IDs are removed`, () => {
		const first = getPresets('cuetimer', [], timers)
		const changedTimers = [...timers].reverse().map((timer) => ({ ...timer, name: `${timer.name} renamed` }))
		const changed = getPresets('cuetimer', [], changedTimers)
		assert.deepEqual(
			sectionOf(changed)
				.definitions.slice(1)
				.map((group) => group.id),
			sectionOf(first)
				.definitions.slice(1)
				.reduce(
					(pairs, group, index, groups) => (index % 2 === 0 ? [...pairs, [group.id, groups[index + 1].id]] : pairs),
					[],
				)
				.reverse()
				.flat(),
		)
		for (const group of sectionOf(first).definitions) {
			for (const key of [group.presetId]) {
				assert.deepEqual(changed.presets[key].steps, first.presets[key].steps)
				assert.deepEqual(changed.presets[key].style, first.presets[key].style)
			}
		}
		const single = getPresets('cuetimer', [], [timers[0]])
		assert.deepEqual(sectionOf(single).definitions[1], sectionOf(first).definitions[1])
	})

	test(`${actionLabel}: empty and conflicting IDs never produce unusable or ambiguous preset pairs`, () => {
		assert.deepEqual(sectionOf(getPresets('cuetimer')).definitions[0].presetId, actionId)
		assert.equal(sectionOf(getPresets('cuetimer', [], [{ visibleID: '' }, {}])).definitions.length, 1)
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
			[`${actionLabel} with ID — enter ID manually`, `ID OK (Name / ${actionLabel})`, 'ID OK (Duration)'],
		)
	})

	test(`${actionLabel}: live preset catalog refreshes on relevant list changes, keeps generic presets offline, and returns on reconnect`, async () => {
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
		assert.equal(sectionOf(publications.at(-1)).definitions.length, 11)
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
		assert.match(sectionOf(publications.at(-1)).definitions[1].name, /Renamed/)
		snapshot = { ...snapshot, timers: [{ guid: 'new', visibleID: 'B', name: 'New timer' }] }
		inst.applyState(snapshot)
		assert.equal(publications.length, 4)
		assert.deepEqual(
			sectionOf(publications.at(-1)).definitions.map((group) => group.name),
			[
				`${actionLabel} with ID — enter ID manually`,
				`ID B – New timer (Name / ${actionLabel})`,
				'ID B – New timer (Duration)',
			],
		)
		snapshot = { ...snapshot, list: { id: 'list-2' } }
		inst.applyState(snapshot)
		assert.equal(publications.length, 5)
		inst.resetLiveState()
		assert.deepEqual(sectionOf(publications.at(-1)).definitions[0].presetId, actionId)
		assert.equal(sectionOf(publications.at(-1)).definitions.length, 1)
		inst.applyState(snapshot)
		assert.equal(sectionOf(publications.at(-1)).definitions.length, 3)
		inst.applyState({ ...snapshot, timers: [] })
		assert.deepEqual(sectionOf(publications.at(-1)).definitions[0].presetId, actionId)
		assert.equal(sectionOf(publications.at(-1)).definitions.length, 1)
		inst.applyState(snapshot)
		await inst.configUpdated({ mode: 'cloud', listId: 'another-list' })
		assert.deepEqual(sectionOf(publications.at(-1)).definitions[0].presetId, actionId)
		assert.equal(sectionOf(publications.at(-1)).definitions.length, 1)
	})
}
