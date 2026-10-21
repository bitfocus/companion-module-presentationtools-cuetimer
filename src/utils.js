// Terminates every outgoing command and every incoming telemetry frame on the CueTimer TCP link
export const TERMINATOR = '$'

export function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
	return result
		? {
				r: parseInt(result[1], 16),
				g: parseInt(result[2], 16),
				b: parseInt(result[3], 16),
			}
		: null
}

/** The twelve on/off states CueTimer reports, in the order shown to users (status feedback) */
export const BUTTON_STATES = [
	{ id: 'Fullscreen', label: 'Fullscreen' },
	{ id: 'Preview', label: 'Preview' },
	{ id: 'Presenter', label: 'Presenter' },
	{ id: 'NDI', label: 'NDI' },
	{ id: 'Message', label: 'Message' },
	{ id: 'STM', label: 'Single Timer Mode' },
	{ id: 'Clock', label: 'Clock' },
	{ id: 'Pause', label: 'Pause' },
	{ id: 'Blackout', label: 'Blackout' },
	{ id: 'MultitimerPreview', label: 'Multitimer Preview' },
	{ id: 'MultitimerFullscreen', label: 'Multitimer Fullscreen' },
	{ id: 'MultitimerNDI', label: 'Multitimer NDI' },
]
export const BUTTON_STATE_KEYS = BUTTON_STATES.map((state) => state.id)

export function emptyButtonStates() {
	return Object.fromEntries(BUTTON_STATE_KEYS.map((key) => [key, false]))
}
