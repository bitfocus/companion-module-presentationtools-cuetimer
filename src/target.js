/**
 * Where the app connection goes: the CueTimer computer picked from Companion's discovery
 * list (the `bonjourHost` field), or the manual Target IP and Target Port. Pure.
 */

/** The config field Companion fills from the discovery list; must match `bonjourQueries` in companion/manifest.json */
export const DISCOVERY_FIELD = 'bonjourHost'

/**
 * Companion stores a discovered computer as "address:port", an IPv6 address in brackets.
 * Returns { host, port }, or null for anything else.
 */
export function parseBonjourTarget(value) {
	if (typeof value !== 'string') return null
	const separator = value.lastIndexOf(':')
	if (separator <= 0) return null
	const host = value
		.slice(0, separator)
		.trim()
		.replace(/^\[(.*)\]$/, '$1')
	if (!host || host.includes('[') || host.includes(']')) return null
	const portText = value.slice(separator + 1).trim()
	if (!/^\d+$/.test(portText)) return null
	const port = Number(portText)
	if (port < 1 || port > 65535) return null
	return { host, port }
}

/** True when a computer is picked from the discovery list ("Manual" is null) */
export function usesDiscovery(config) {
	const value = config?.[DISCOVERY_FIELD]
	return value !== undefined && value !== null && value !== ''
}

/**
 * The engine base URL for the app connection, or the reason there is none. A discovery
 * selection that cannot be read is an error: the manual fields are hidden while a computer
 * is picked, so falling back to them would connect somewhere the user cannot see.
 */
export function resolveAppTarget(config) {
	if (usesDiscovery(config)) {
		const target = parseBonjourTarget(config[DISCOVERY_FIELD])
		if (!target) return { error: 'Select the CueTimer computer again or choose Manual' }
		const host = target.host.includes(':') ? `[${target.host}]` : target.host
		return { base: `http://${host}:${target.port}` }
	}
	if (!config?.host || !config?.port) return { error: 'Host and port are required' }
	return { base: `http://${config.host}:${config.port}` }
}
