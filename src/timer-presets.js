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

export function getTimerPresets(instanceLabel, timers, mode = 'start') {
	const cue = mode === 'cue'
	const actionLabel = cue ? 'Cue' : 'Start'
	const actionId = cue ? 'CueTimerWithID' : 'FireTimerWithID'
	const catalog = getTimerPresetCatalog(timers)
	const { bases } = timerVariableMap(catalog.map((timer) => timer.id))
	const presets = {}
	const groups = []
	for (const { id, name } of catalog) {
		const base = bases.get(id)
		// Match the variable publisher: do not offer a button pointing at an ambiguous variable.
		if (base === undefined) continue
		const key = `${cue ? 'timer-cue-id' : 'timer-id'}-${Buffer.from(id, 'utf8').toString('hex')}`
		const title = name ? `ID ${id} – ${name}` : `ID ${id}`
		groups.push({ id: key, type: 'simple', name: title, presets: [`${key}-${mode}`, `${key}-duration`] })
		for (const kind of [mode, 'duration']) {
			const nameButton = kind === mode
			presets[`${key}-${kind}`] = {
				type: 'simple',
				name: `${title} (${nameButton ? `Name / ${actionLabel}` : 'Duration'})`,
				notes: nameButton
					? `${cue ? 'Cues' : 'Starts'} the timer with ID "${id}" in the list this connection follows. Edit the button text to customize its label.`
					: `Shows the duration of the timer with ID "${id}". This button has no press action.`,
				style: {
					text: nameButton
						? `${id} – $(${instanceLabel}:timer_${base}_name)`
						: `$(${instanceLabel}:timer_${base}_duration)`,
					size: '14',
					color: 16777215,
					bgcolor: 0,
					alignment: 'center:center',
				},
				steps: [{ down: nameButton ? [{ actionId, options: { Key: id } }] : [], up: [] }],
				feedbacks: [{ feedbackId: 'timerBackground', options: { Key: id } }],
			}
		}
	}
	return {
		section: {
			id: `${mode}-timer-with-id`,
			name: `${actionLabel} timer with ID`,
			description: `Each assigned ID has a Name / ${actionLabel} button and a matching Duration button. Drag either or both.`,
			definitions: groups,
		},
		presets,
	}
}
