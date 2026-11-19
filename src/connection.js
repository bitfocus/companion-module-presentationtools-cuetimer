import { EventEmitter } from 'node:events'
import { get as httpGet } from 'node:http'
import { io } from 'socket.io-client'
import { CLIENT_IDENTITY, COMPANION_API_VERSION } from './state.js'

/** Handshake refusals after which trying again cannot help until the configuration changes */
const TERMINAL_CODES = new Set(['COMPANION_API_VERSION_MISMATCH', 'NETWORK_NOT_ALLOWED'])
/** Cloud errors that are terminal for the session; the user fixes the cue list and reconnects */
const ROOM_ERRORS = new Set(['ROOM_NOT_FOUND', 'ROOM_DELETED', 'TRIAL_EXPIRED', 'SERVER_UPGRADE_REQUIRED'])

/** The refusal as the status message: the code, and the engine's reason when it gave one */
function refusalText(code, err) {
	return `${code}: ${err?.data?.message ?? ''}`.trim().replace(/:$/, '')
}

/** CueTimer's Companion port (for module version 2) answered: the port to use is the LAN port */
export const LEGACY_PORT_TEXT =
	"This is CueTimer's port for Companion module version 2 (31601 by default). " +
	"Set Target Port to CueTimer's LAN port, shown under Preferences / Network (31609 by default)"
/** Something sends module version 2 frames here, but it did not say which CueTimer it is */
export const LEGACY_PROTOCOL_TEXT =
	'This port speaks the protocol of Companion module version 2. For CueTimer 5, set Target Port to the LAN port ' +
	'shown under Preferences / Network (31609 by default). CueTimer 4 and older need module version 2'

/** `{…}$` frames pushed into the WebSocket handshake: the peer is a module version 2 port */
function sentLegacyFrames(err) {
	const cause = err?.description?.error
	return typeof cause?.code === 'string' && cause.code.startsWith('HPE_') && cause.rawPacket?.[0] === 0x7b
}

/** The answer CueTimer's Companion port gives to HTTP, though any server can answer 426 */
function refusedUpgrade(err) {
	return err?.description?.message === 'Unexpected server response: 426'
}

const LEGACY_PORT_HEADER = 'x-cuetimer-port'
const LEGACY_PORT_HEADER_VALUE = 'companion-legacy'
const PROBE_TIMEOUT_MS = 2000
/** How long an answer about a port is trusted before asking again */
const PROBE_CACHE_MS = 30000

const ACK_TIMEOUT_MS = 5000
const SNAPSHOT_GUARD_MS = 5000
const BACKOFF_MIN_MS = 2000
const BACKOFF_MAX_MS = 30000

/**
 * One Socket.IO connection to the engine's `/companion` namespace.
 *
 * Events: `status(status, message)` with the strings ok | connecting | disconnected |
 * connection_failure | unknown_error, `connectResponse(data)`, `state(snapshot)`.
 * Socket.IO reconnects by itself after a dropped transport only; a refused handshake and
 * a disconnect by the server are retried here with a backoff, unless they are terminal.
 */
export class CueTimerConnection extends EventEmitter {
	constructor({ log = () => {}, ioFactory = io } = {}) {
		super()
		this.log = log
		this.ioFactory = ioFactory
		this.socket = null
		this.ready = false
		this.connectResponse = null
		this.mode = null
		this.backoffAttempt = 0
		this.backoffTimer = null
		this.guardTimer = null
		this.base = ''
		/** Counts status events, so a late answer can tell whether anything happened since */
		this.statusCount = 0
		/** The pending request asking a port that answered 426 whether it is CueTimer's */
		this.probe = null
		/** Per base URL: `{ at, legacy }`, whether it is CueTimer's module version 2 port */
		this.probed = new Map()
	}

	emit(event, ...args) {
		if (event === 'status') this.statusCount++
		return super.emit(event, ...args)
	}

	/** `base` is `http://host:port` or the Cloud URL; `query` the handshake fields */
	connect(base, query) {
		this.disconnect()
		this.base = String(base).replace(/\/+$/, '')
		const url = `${this.base}/companion`
		this.log('debug', `Connecting to ${url} (${JSON.stringify(query)})`)
		this.emit('status', 'connecting', 'Connecting')
		const socket = this.ioFactory(url, {
			auth: { apiVersion: COMPANION_API_VERSION, client: { ...CLIENT_IDENTITY } },
			query,
			transports: ['websocket'],
			forceNew: true,
			reconnection: true,
			reconnectionDelay: 1000,
			reconnectionDelayMax: 5000,
		})
		this.socket = socket

		socket.on('connect', () => {
			if (socket !== this.socket) return
			this.backoffAttempt = 0
			this.emit('status', 'connecting', 'Waiting for CueTimer')
		})

		socket.on('message', (raw) => {
			if (socket !== this.socket) return
			let message
			try {
				message = typeof raw === 'string' ? JSON.parse(raw) : raw
			} catch {
				this.log('debug', 'Ignoring a message that is not JSON')
				return
			}
			this.handleMessage(message)
		})

		socket.on('disconnect', (reason) => {
			if (socket !== this.socket) return
			this.clearReady()
			this.log('debug', `Disconnected: ${reason}`)
			this.emit('status', 'disconnected', 'Disconnected')
			// Socket.IO does not reconnect after the server closed the socket.
			if (reason === 'io server disconnect') this.scheduleReconnect()
		})

		socket.on('connect_error', (err) => {
			if (socket !== this.socket) return
			this.clearReady()
			this.handleConnectError(err)
		})
	}

	handleMessage(message) {
		switch (message?.command) {
			case 'serverTime':
				return
			case 'ConnectResponse': {
				const data = message.data ?? {}
				this.connectResponse = data
				if (typeof data.mode === 'string') this.mode = data.mode
				this.emit('connectResponse', data)
				if (data.success === false) {
					this.clearReady()
					const text = data.details?.message || data.error || 'CueTimer refused the connection'
					if (data.error === 'SERVER_DISCONNECTED') {
						this.emit('status', 'disconnected', 'Cloud server unreachable, retrying')
					} else if (ROOM_ERRORS.has(data.error)) {
						this.emit(
							'status',
							'connection_failure',
							`${text}. Fix the cue list in CueTimer Cloud, then save or re-enable this connection`,
						)
					} else {
						this.emit('status', 'connection_failure', text)
					}
					return
				}
				this.startGuard()
				return
			}
			case 'companionState':
				// After a refused ConnectResponse the session is over; a snapshot still in flight is not live data
				if (this.connectResponse?.success === false) return
				this.clearGuard()
				// The snapshot first, so a status refresh sees the state it describes
				this.emit('state', message.data)
				if (!this.ready) {
					this.ready = true
					this.emit('status', 'ok')
				}
				return
			default:
				return
		}
	}

	handleConnectError(err) {
		const code = err?.data?.code ?? (err?.message === 'Invalid namespace' ? 'NO_COMPANION_API' : null)
		if (code === 'NO_COMPANION_API') {
			this.stopRetrying()
			this.emit(
				'status',
				'connection_failure',
				'CueTimer does not support the Companion API (needs CueTimer 5.x with the Companion API); use module version 2 for older versions',
			)
			return
		}
		if (code && (TERMINAL_CODES.has(code) || err?.data?.recoverable === false)) {
			this.stopRetrying()
			this.emit(
				'status',
				'connection_failure',
				`${refusalText(code, err)}. Fix the cause in CueTimer, then save or re-enable this connection`,
			)
			return
		}
		if (code) {
			// A refused handshake is not retried by Socket.IO; try again later.
			this.emit('status', 'connection_failure', refusalText(code, err))
			this.scheduleReconnect()
			return
		}
		// Transport-level error: Socket.IO keeps reconnecting on its own.
		if (sentLegacyFrames(err)) {
			this.log('debug', 'Connection error: the port sends Companion module version 2 frames')
			this.emit('status', 'connection_failure', LEGACY_PROTOCOL_TEXT)
			return
		}
		if (refusedUpgrade(err)) {
			const known = this.probed.get(this.base)
			const fresh = known && Date.now() - known.at < PROBE_CACHE_MS
			if (fresh && known.legacy) {
				this.emit('status', 'connection_failure', LEGACY_PORT_TEXT)
				return
			}
			// The generic text below stands until the port has said whether it is CueTimer's.
			if (!fresh) queueMicrotask(() => this.probeLegacyPort())
		}
		const detail = err?.description?.message ?? (typeof err?.description === 'string' ? err.description : '')
		this.log('debug', `Connection error: ${err?.message}${detail ? ` (${detail})` : ''}`)
		this.emit('status', 'connection_failure', `${err?.message || 'Connection failed'}${detail ? `: ${detail}` : ''}`)
	}

	/**
	 * Ask the port that refused the upgrade with 426 whether it is CueTimer's module version 2
	 * port: the status code alone does not say. A plain request, which CueTimer answers with
	 * its header and does not take for a module. The answer is used only if this connection
	 * is still the one that asked and nothing else has been reported since.
	 */
	probeLegacyPort() {
		const base = this.base
		const socket = this.socket
		if (this.probe || !socket || !base.startsWith('http://')) return
		const asked = this.statusCount
		const settle = (legacy) => {
			if (this.probe !== request) return
			this.probe = null
			this.probed.set(base, { at: Date.now(), legacy })
			if (legacy && this.socket === socket && this.base === base && this.statusCount === asked) {
				this.emit('status', 'connection_failure', LEGACY_PORT_TEXT)
			}
		}
		const request = httpGet(`${base}/`, { timeout: PROBE_TIMEOUT_MS, agent: false }, (response) => {
			response.resume()
			settle(response.headers[LEGACY_PORT_HEADER] === LEGACY_PORT_HEADER_VALUE)
		})
		request.on('timeout', () => request.destroy(new Error('timeout')))
		request.on('error', () => settle(false))
		this.probe = request
	}

	/** True once the engine accepted the connection and sent the first snapshot */
	get isReady() {
		return this.ready && !!this.socket?.connected
	}

	/**
	 * Send one command and wait for its result. Nothing is queued while disconnected:
	 * Socket.IO would otherwise replay a Start pressed during an outage on reconnect.
	 */
	async sendCommand({ command, data = {} }) {
		if (!this.isReady) {
			return { success: false, error: 'NOT_CONNECTED', message: 'Not connected to CueTimer' }
		}
		try {
			const result = await this.socket.timeout(ACK_TIMEOUT_MS).emitWithAck('message', JSON.stringify({ command, data }))
			if (result && typeof result === 'object' && typeof result.success === 'boolean') return result
			return { success: false, error: 'INVALID_ACK', message: 'CueTimer returned an invalid acknowledgement' }
		} catch {
			return { success: false, error: 'ACK_TIMEOUT', message: 'CueTimer did not acknowledge the command' }
		}
	}

	scheduleReconnect() {
		if (this.backoffTimer || !this.socket) return
		const delay = Math.min(BACKOFF_MIN_MS * 2 ** this.backoffAttempt, BACKOFF_MAX_MS)
		this.backoffAttempt++
		this.log('debug', `Reconnecting in ${delay / 1000} s`)
		this.backoffTimer = setTimeout(() => {
			this.backoffTimer = null
			if (this.socket && !this.socket.connected) this.socket.connect()
		}, delay)
	}

	stopRetrying() {
		if (this.backoffTimer) clearTimeout(this.backoffTimer)
		this.backoffTimer = null
		if (this.socket) {
			this.socket.io.reconnection(false)
			this.socket.disconnect()
		}
	}

	startGuard() {
		this.clearGuard()
		if (this.ready) return
		this.guardTimer = setTimeout(() => {
			this.guardTimer = null
			if (!this.ready) this.emit('status', 'unknown_error', 'No Companion data from CueTimer')
		}, SNAPSHOT_GUARD_MS)
	}

	clearGuard() {
		if (this.guardTimer) clearTimeout(this.guardTimer)
		this.guardTimer = null
	}

	clearReady() {
		this.ready = false
		this.clearGuard()
	}

	disconnect() {
		if (this.backoffTimer) clearTimeout(this.backoffTimer)
		this.backoffTimer = null
		this.backoffAttempt = 0
		this.clearReady()
		this.connectResponse = null
		if (this.probe) {
			const request = this.probe
			this.probe = null
			request.destroy()
		}
		if (this.socket) {
			const socket = this.socket
			this.socket = null
			socket.removeAllListeners()
			socket.io.reconnection(false)
			socket.disconnect()
		}
	}

	destroy() {
		this.disconnect()
		this.removeAllListeners()
	}
}
