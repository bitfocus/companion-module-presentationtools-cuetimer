import { combineRgb } from '@companion-module/base'
import { emptyButtonStates, hexToRgb } from './utils.js'

/** The Companion API version this module speaks; the engine refuses another major. */
export const COMPANION_API_VERSION = '1.0'

/** Everything the desktop app offers beyond the Cloud: output windows, the list catalog and its links */
export const ALL_CAPABILITIES = ['outputs', 'lists', 'links']

/** What the connected CueTimer offers, from its ConnectResponse mode */
export function capabilitiesForMode(mode) {
	return mode === 'desktop' ? ALL_CAPABILITIES : []
}

/** What the configured target is expected to offer, before (and without) a handshake */
export function capabilitiesForConfig(config) {
	return config?.mode === 'cloud' ? [] : ALL_CAPABILITIES
}

/** The module's view before the first snapshot, and after every disconnect */
export function emptyState() {
	return {
		snapshot: null,
		lists: [],
		timers: {},
		buttonStates: emptyButtonStates(),
		fgColor: combineRgb(255, 255, 255),
		bgColor: combineRgb(0, 0, 0),
		syncError: undefined,
	}
}

/** The counter parts as the old module showed them: overtime gets a leading + on its first part instead of the - */
function signedParts(displayTime) {
	const text = String(displayTime ?? '')
	const overtime = text.startsWith('-')
	const parts = splitDisplayTime(overtime ? text.slice(1) : text)
	if (overtime) {
		const first = ['hours', 'minutes', 'seconds'].find((k) => parts[k] !== '')
		if (first) parts[first] = `+${parts[first]}`
	}
	return parts
}

/** Split the counter text into hours, minutes and seconds as the TCP frame did (3 parts → h:m:s, 2 → m:s, 1 → s) */
export function splitDisplayTime(displayTime) {
	const parts = String(displayTime ?? '').split(':')
	if (parts.length === 3) return { hours: parts[0], minutes: parts[1], seconds: parts[2] }
	if (parts.length === 2) return { hours: '', minutes: parts[0], seconds: parts[1] }
	return { hours: '', minutes: '', seconds: parts[0] ?? '' }
}

function toColor(hex, fallback) {
	const rgb = typeof hex === 'string' ? hexToRgb(hex.slice(0, 7)) : null
	return rgb ? combineRgb(rgb.r, rgb.g, rgb.b) : fallback
}

/**
 * Map one `companionState` snapshot to the module's variables, feedback inputs and lists.
 * Pure; the variable and feedback ids are those of module 2.x plus a few new ones.
 */
export function mapState(snapshot) {
	const timer = snapshot.timer ?? {}
	const next = snapshot.next ?? {}
	const flags = snapshot.flags ?? {}
	const outputs = snapshot.outputs ?? {}
	const list = snapshot.list ?? {}
	const { hours, minutes, seconds } = signedParts(timer.displayTime)

	const timers = {}
	for (const t of snapshot.timers ?? []) {
		if (!t.visibleID) continue
		timers[t.visibleID] = {
			guid: t.guid,
			name: t.name ?? '',
			duration: t.duration ?? '',
			bg: t.isActive ? '#FF0000' : t.isNext ? '#77BED2' : '#000000',
		}
	}

	const lists = (snapshot.lists ?? []).map((l) => ({
		id: l.id,
		title: l.title ?? '',
		isActive: !!l.isActive,
		controlLink: l.controlLink ?? '',
		displayLink: l.displayLink ?? '',
	}))

	return {
		variables: {
			hours,
			minutes,
			seconds,
			name: timer.name ?? '',
			speed: timer.speed ?? '',
			endTime: timer.endTime ?? '',
			nextTimerName: next.name ?? '',
			nextTimerDuration: next.duration ?? '',
			scheduleOffset: snapshot.schedule?.offset ?? '00:00:00',
			scheduleOffsetStatus: snapshot.schedule?.status ?? '',
		},
		buttonStates: {
			Fullscreen: !!outputs.fullscreen,
			Preview: !!outputs.preview,
			Presenter: !!outputs.presenter,
			NDI: !!outputs.ndi,
			Message: !!flags.messageEnabled,
			STM: !!flags.singleMode,
			Clock: !!flags.clock,
			Pause: !!flags.paused,
			Blackout: !!flags.blackout,
			MultitimerPreview: !!outputs.multitimerPreview,
			MultitimerFullscreen: !!outputs.multitimerFullscreen,
			MultitimerNDI: !!outputs.multitimerNDI,
		},
		fgColor: toColor(snapshot.colors?.fg, combineRgb(255, 255, 255)),
		bgColor: toColor(snapshot.colors?.bg, combineRgb(0, 0, 0)),
		timers,
		lists,
		listId: list.id ?? '',
		listNumber: list.number ?? 0,
		listTitle: list.title ?? '',
		syncError: snapshot.syncError,
	}
}
