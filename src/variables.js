import { sanitizeVariable } from '@companion-module/base'

const VARIABLE_ID_REGEX = /^[a-zA-Z0-9-_.!]+$/

/** 32-bit FNV-1a over the UTF-8 bytes of `input`, as 8 lowercase zero-padded hex digits */

export function fnv1a32Hex(input) {
	let hash = 0x811c9dc5
	for (const byte of Buffer.from(String(input), 'utf8')) {
		hash ^= byte
		hash = Math.imul(hash, 0x01000193) >>> 0
	}
	return hash.toString(16).padStart(8, '0')
}

/**
 * Variable-id base for one raw CueTimer timer ID. Depends on that string only.
 * Companion only accepts variable ids matching VARIABLE_ID_REGEX; valid IDs are used unchanged,
 * any other ID is sanitised and gets a hash suffix so that "A B", "AB" and "A#B" stay distinct.
 */

export function timerVariableBase(visibleId) {
	const id = String(visibleId)
	if (VARIABLE_ID_REGEX.test(id)) return id
	return `${sanitizeVariable(id, { ' ': '_' })}_${fnv1a32Hex(id)}`
}

/**
 * Map every raw timer ID of a frame to its variable-id base.
 * Timers whose base collides (with each other, or a raw valid ID equal to a derived id) are left out
 * and reported, so two timers present at the same time never share a variable. The map is stateless:
 * once a timer is removed, another timer deriving to the same base takes that variable over, exactly
 * as a new timer reusing a deleted timer's ID would.
 * @returns {{ bases: Map<string, string>, collisions: { base: string, ids: string[] }[] }}
 */

export function timerVariableMap(rawIds) {
	const byBase = new Map()
	for (const rawId of rawIds) {
		const id = String(rawId)
		const b = timerVariableBase(id)
		if (!byBase.has(b)) byBase.set(b, [])
		byBase.get(b).push(id)
	}
	const bases = new Map()
	const collisions = []
	for (const [b, ids] of byBase) {
		if (ids.length === 1) bases.set(ids[0], b)
		else collisions.push({ base: b, ids: [...ids].sort() })
	}
	collisions.sort((x, y) => (x.base < y.base ? -1 : x.base > y.base ? 1 : 0))
	return { bases, collisions }
}

export function getListVariableDefinitions(lists) {
	const variables = {
		listName: { name: 'List Name' },
		listNumber: { name: 'List Number' },
		listGUID: { name: 'List GUID' },
		listDisplayLink: { name: 'List Display Link' },
		listControlLink: { name: 'List Control Link' },
	}

	for (let i = 1; i <= (lists?.length ?? 0); i++) {
		variables[`list_${i}_name`] = { name: `List ${i} Name` }
		variables[`list_${i}_display_link`] = { name: `List ${i} Display Link` }
		variables[`list_${i}_control_link`] = { name: `List ${i} Control Link` }
	}

	return variables
}

export function getVariableDefinitions(ctx) {
	const variables = {
		hours: { name: 'Hours' },
		minutes: { name: 'Minutes' },
		seconds: { name: 'Seconds' },
		name: { name: 'Name' },
		speed: { name: 'Speed' },
		endTime: { name: 'End Time' },
		nextTimerName: { name: 'Next Timer Name' },
		nextTimerDuration: { name: 'Next Timer Duration' },
		scheduleOffset: { name: 'Schedule Offset' },
		scheduleOffsetStatus: { name: 'Schedule Offset Status' },
	}

	for (const [visibleId, base] of timerVariableMap(Object.keys(ctx.timers ?? {})).bases) {
		variables[`timer_${base}_name`] = { name: `Timer ${visibleId} Name` }
		variables[`timer_${base}_duration`] = { name: `Timer ${visibleId} Duration` }
	}

	return { ...variables, ...getListVariableDefinitions(ctx.lists) }
}
