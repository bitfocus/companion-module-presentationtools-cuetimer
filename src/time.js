/**
 * Times of day. CueTimer sends them as UTC instants ("YYYY-MM-DD HH:MM:SS.mmm"); the module
 * reads them in the zone chosen in its settings. Pure, built on Intl like the engine's helpers.
 */

/** The "Time zone" setting: this Companion device's zone, or the list's schedule zone from CueTimer */
export const TIME_ZONE_DEVICE = 'device'
export const TIME_ZONE_SCHEDULE = 'schedule'

const UTC_TEXT = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})\.(\d{3})$/

/** The instant of a UTC wire string, or null when it is empty or malformed */
export function parseUtc(text) {
	const match = typeof text === 'string' ? UTC_TEXT.exec(text) : null
	if (!match) return null
	const [, year, month, day, hour, minute, second, ms] = match.map(Number)
	const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second, ms))
	return Number.isNaN(date.getTime()) ? null : date
}

const formatters = new Map()

/** A formatter for a named zone, or null for a name this runtime does not know */
function formatterFor(zone) {
	let formatter = formatters.get(zone)
	if (formatter !== undefined) return formatter
	try {
		formatter = new Intl.DateTimeFormat('en-US', {
			timeZone: zone,
			hourCycle: 'h23',
			hour: 'numeric',
			minute: 'numeric',
			second: 'numeric',
		})
	} catch {
		formatter = null
	}
	formatters.set(zone, formatter)
	return formatter
}

/**
 * The wall-clock time of day of an instant in the zone (an IANA name). Without one, or with a
 * name this runtime does not know, it is the device's zone, read from the Date itself and never
 * from a cached formatter, so a zone changed while Companion runs is followed.
 */
export function timeOfDayIn(date, zone) {
	const formatter = zone ? formatterFor(zone) : null
	if (!formatter) return { hours: date.getHours(), minutes: date.getMinutes(), seconds: date.getSeconds() }
	const parts = { hour: 0, minute: 0, second: 0 }
	for (const part of formatter.formatToParts(date)) {
		if (part.type in parts) parts[part.type] = parseInt(part.value, 10)
	}
	return { hours: parts.hour, minutes: parts.minute, seconds: parts.second }
}

/** The zone to read times in: the list's for the "schedule" setting when CueTimer sent one, else the device's (undefined) */
export function zoneFor(setting, listTimeZone) {
	return setting === TIME_ZONE_SCHEDULE && listTimeZone ? listTimeZone : undefined
}

const pad = (n) => String(n).padStart(2, '0')

/** `HH:mm:ss`, always 24-hour and zero-padded: the End Time variable */
export function formatHms({ hours, minutes, seconds }) {
	return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

/**
 * The clock as the hours, minutes and seconds variables, with CueTimer's clock preferences:
 * 12 or 24 hours (no AM/PM marker), leading zero of the hour, and seconds ('' when hidden).
 */
export function clockParts({ hours, minutes, seconds }, prefs = {}) {
	const hour = prefs.hour24 === false ? hours % 12 || 12 : hours
	return {
		hours: prefs.hideZeros ? String(hour) : pad(hour),
		minutes: pad(minutes),
		seconds: prefs.seconds === false ? '' : pad(seconds),
	}
}
