import { timerVariableMap } from './variables.js'

/** Keep list order, including numeric IDs; ignore values that change on every timer tick. */
export function getTimerPresetCatalog(timers = []) {
	return timers
		.filter((timer) => timer.visibleID)
		.map((timer) => ({
			id: String(timer.visibleID),
			name: String(timer.name ?? ''),
		}))
}

export function getTimerPresets(timers, mode = 'start') {
	const cue = mode === 'cue'
	const actionLabel = cue ? 'Cue' : 'Start'
	const actionId = cue ? 'CueTimerWithID' : 'FireTimerWithID'
	const catalog = getTimerPresetCatalog(timers)
	const { bases } = timerVariableMap(catalog.map((timer) => timer.id))
	const manualTitle = `${actionLabel} with ID — enter ID manually`
	const presets = {
		[actionId]: timerPreset('', actionId, manualTitle),
	}
	const groups = [
		{
			id: `${mode}-manual-id`,
			type: 'template',
			name: manualTitle,
			description:
				'Generic preset, available offline. Set timer_id directly under Preset variables on the linked button.',
			presetId: actionId,
			templateVariableName: 'timer_id',
			templateValues: [{ name: manualTitle, value: '' }],
		},
	]
	for (const { id, name } of catalog) {
		const base = bases.get(id)
		// Match the variable publisher: do not offer a button pointing at an ambiguous variable.
		if (base === undefined) continue
		const key = `${cue ? 'timer-cue-id' : 'timer-id'}-${Buffer.from(id, 'utf8').toString('hex')}`
		const title = name ? `ID ${id} – ${name}` : `ID ${id}`
		for (const kind of [mode, 'duration']) {
			const nameButton = kind === mode
			const presetId = `${key}-${kind}`
			const presetName = `${title} (${nameButton ? `Name / ${actionLabel}` : 'Duration'})`
			// Each template group references one preset. Both kinds expose only the ID,
			// so Companion can edit it while keeping the button linked to its preset.
			groups.push({
				id: nameButton ? key : presetId,
				type: 'template',
				name: presetName,
				presetId,
				templateVariableName: 'timer_id',
				templateValues: [{ name: presetName, value: id }],
			})
			presets[presetId] = timerPreset(id, actionId, presetName, !nameButton)
		}
	}
	return {
		section: {
			id: `${mode}-timer-with-id`,
			name: `${actionLabel} timer with ID`,
			description: `Use the generic preset to enter an ID manually, including offline. Below it, each assigned ID has a Name / ${actionLabel} button and a matching Duration button.`,
			definitions: groups,
		},
		presets,
	}
}

function timerPreset(id, actionId, name, duration = false) {
	// Expressions also work in feedback ID fields without changing how legacy literal IDs are parsed.
	const idOptions = () => ({ Key: { isExpression: true, value: '$(local:timer_id)' } })
	const valueName = duration ? 'timer_duration' : 'timer_name'
	return {
		type: 'simple',
		name,
		notes: `Change timer_id under Preset variables on this linked button. Its ${duration ? 'duration and background' : 'action, name and background'} all follow that value. No need to click Edit. If you unlink or copy the button, change Timer ID in Local Variables instead.${duration ? ' This button has no press action.' : ''}`,
		localVariables: [
			{ variableType: 'simple', variableName: 'timer_id', headline: 'Timer ID — edit this value', startupValue: id },
			{
				variableType: 'feedback',
				variableName: valueName,
				headline: duration ? 'Timer duration — follows Timer ID' : 'Timer name — follows Timer ID',
				feedbackId: duration ? 'timerDurationValue' : 'timerNameValue',
				options: idOptions(),
			},
		],
		style: {
			text: `$(local:${valueName})`,
			size: '14',
			color: 16777215,
			bgcolor: 0,
			alignment: 'center:center',
		},
		steps: [{ down: duration ? [] : [{ actionId, options: idOptions() }], up: [] }],
		feedbacks: [{ feedbackId: 'timerBackground', options: idOptions() }],
	}
}
