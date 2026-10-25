/**
 * Translate a Companion action into the engine command the control page would send.
 * Pure: `ctx` holds the config, the last snapshot, the capabilities and a logger.
 * Returns `{ command, data }` or null when nothing should be sent.
 */

const OUTPUT_TYPES = {
	Fullscreen: 'fullscreen',
	Preview: 'preview',
	Presenter: 'presenter',
	NDI: 'ndi',
	MultitimerPreview: 'multitimerPreview',
	MultitimerFullscreen: 'multitimerFullscreen',
	MultitimerNDI: 'ndiMultitimer',
}

const TOGGLES = {
	Blackout: ['SetBlackout', 'blackout'],
	Message: ['SetMessageEnabled', 'messageEnabled'],
	Clock: ['SetClock', 'clock'],
	STM: ['SetSingleMode', 'singleMode'],
}

const SAME_NAME = new Set(['CueNext', 'Restart', 'Undo', 'MoveNextUp', 'MoveNextDown', 'InitList'])

/** `hh:mm:ss` or `mm:ss` to minutes, as the legacy TCP handler read it; null when unreadable */
export function durationToMinutes(text) {
	const trimmed = String(text ?? '').trim()
	if (!/^\d+:\d{1,2}(:\d{1,2})?$/.test(trimmed)) return null
	const parts = trimmed.split(':').map(Number)
	return parts.length === 3 ? parts[0] * 60 + parts[1] + parts[2] / 60 : parts[0] + parts[1] / 60
}

/** A list setting that is still a list number (chosen before the catalog was known), not a list id */
export function isPlaceholderList(value) {
	return /^-?\d+$/.test(String(value ?? ''))
}

function guidForVisibleId(snapshot, visibleId) {
	const wanted = String(visibleId ?? '').trim()
	if (!wanted) return null
	return snapshot?.timers?.find((t) => t.visibleID === wanted)?.guid ?? null
}

function adjacentListId(lists, delta) {
	if (!lists?.length) return null
	let index = lists.findIndex((l) => l.isActive)
	if (index === -1) index = 0
	const target = (index + delta + lists.length) % lists.length
	return lists[target].id
}

export function buildEngineCommand(action, ctx) {
	const id = action.actionId
	const options = action.options ?? {}
	const log = ctx.log ?? (() => {})
	const snapshot = ctx.snapshot ?? null
	const flags = snapshot?.flags ?? {}
	const capabilities = ctx.capabilities ?? []
	const lists = ctx.lists ?? []
	const needs = (capability) => {
		if (capabilities.includes(capability)) return true
		log('warn', `${id} needs the CueTimer app (${capability}); not available on this connection`)
		return false
	}

	if (id === 'FireNext') return { command: 'StartNext', data: {} }
	if (id === 'CueCurrent') return { command: 'StopAndCueCurrent', data: {} }
	if (SAME_NAME.has(id)) return { command: id, data: {} }
	if (id === 'Pause') return { command: flags.paused ? 'Resume' : 'Pause', data: {} }

	if (id === 'AddSpeed' || id === 'SubSpeed') {
		return { command: 'ChangeSpeed', data: { percentageDelta: id === 'AddSpeed' ? 5 : -5 } }
	}
	if (id === 'AddMinute' || id === 'SubMinute') {
		return { command: 'ChangeDuration', data: { minutesDelta: id === 'AddMinute' ? 1 : -1 } }
	}
	if (id === 'AddXMinutes' || id === 'SubXMinutes') {
		const minutes = parseFloat(options.Key)
		if (!Number.isFinite(minutes) || minutes === 0) {
			log('warn', `${id}: "${options.Key}" is not a number of minutes`)
			return null
		}
		return { command: 'ChangeDuration', data: { minutesDelta: id === 'AddXMinutes' ? minutes : -minutes } }
	}

	if (TOGGLES[id]) {
		const [command, flag] = TOGGLES[id]
		return { command, data: { enabled: !flags[flag] } }
	}

	if (id === 'SetDuration') {
		const durationMinutes = durationToMinutes(options.Key)
		if (durationMinutes === null || durationMinutes < 0) {
			log('warn', `SetDuration: "${options.Key}" is not hh:mm:ss`)
			return null
		}
		return { command: 'SetDuration', data: { durationMinutes } }
	}

	if (id === 'FireTimerWithID' || id === 'CueTimerWithID') {
		const guid = guidForVisibleId(snapshot, options.Key)
		if (!guid) {
			log('warn', `${id}: no timer with ID "${options.Key}" in the current list`)
			return null
		}
		return { command: id === 'FireTimerWithID' ? 'FireTimerByGuid' : 'SetNextByGuid', data: { guid } }
	}

	if (OUTPUT_TYPES[id]) {
		if (!needs('outputs')) return null
		const listId = snapshot?.list?.id
		if (!listId) {
			log('warn', `${id}: no list known yet`)
			return null
		}
		const type = OUTPUT_TYPES[id]
		const state = String(options.Key ?? 'toggle').toLowerCase()
		if (state === 'on') return { command: 'SetOutput', data: { type, listId, enabled: true } }
		if (state === 'off') return { command: 'SetOutput', data: { type, listId, enabled: false } }
		return { command: 'ToggleOutput', data: { type, listId } }
	}

	if (id === 'ActivateThisList') {
		if (!needs('lists')) return null
		const listId = ctx.config?.list
		if (!listId || isPlaceholderList(listId)) {
			log('debug', 'No list configured, nothing to activate')
			return null
		}
		return { command: 'ActivateList', data: { listId } }
	}

	if (id === 'ActivateNextList' || id === 'ActivatePreviousList' || id === 'ActivateListByNumber') {
		if (!needs('lists')) return null
		let listId = null
		const selection = id === 'ActivateNextList' ? 'Next' : id === 'ActivatePreviousList' ? 'Previous' : options.Key
		if (selection === 'Next' || selection === 'Previous') {
			listId = adjacentListId(lists, selection === 'Next' ? 1 : -1)
		} else {
			const index = parseInt(selection, 10) - 1
			if (Number.isInteger(index) && index >= 0 && index < lists.length) listId = lists[index].id
		}
		if (!listId) {
			log('warn', `${id}: list "${selection}" is not available`)
			return null
		}
		return { command: 'ActivateList', data: { listId } }
	}

	log('warn', `Unknown action ${id}`)
	return null
}
