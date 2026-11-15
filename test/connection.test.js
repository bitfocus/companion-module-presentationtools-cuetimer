import assert from 'node:assert/strict'
import { test, after } from 'node:test'
import { createServer } from 'node:http'
import { Server } from 'socket.io'
import { createServer as createTcpServer } from 'node:net'
import { CueTimerConnection, LEGACY_PORT_TEXT, LEGACY_PROTOCOL_TEXT } from '../src/connection.js'

// A bare Socket.IO server stands in for the engine's /companion namespace.

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
async function until(predicate, timeoutMs = 3000) {
	const start = Date.now()
	while (Date.now() - start < timeoutMs) {
		if (predicate()) return
		await sleep(20)
	}
	throw new Error(`timed out: ${predicate}`)
}

const http = createServer()
const io = new Server(http)
await new Promise((resolve) => http.listen(0, '127.0.0.1', resolve))
const base = `http://127.0.0.1:${http.address().port}`
const servers = []
after(async () => {
	for (const s of servers) s.disconnect()
	io.close()
})

/** The engine side: `admit` decides the handshake, `onConnect` drives the connect sequence */
function engine({ admit = () => null, onConnect = () => {} } = {}) {
	const ns = io.of('/companion')
	ns.removeAllListeners('connection')
	ns._fns = []
	ns.use((socket, next) => {
		const refusal = admit(socket)
		if (!refusal) return next()
		const error = new Error(refusal.code)
		error.data = refusal
		next(error)
	})
	const received = []
	ns.on('connection', (socket) => {
		servers.push(socket)
		socket.on('message', (raw, ack) => {
			received.push(JSON.parse(raw))
			ack?.({ success: true })
		})
		onConnect(socket)
	})
	return { ns, received, send: (socket, command, data) => socket.emit('message', { command, data }) }
}

function connection() {
	const statuses = []
	const states = []
	const c = new CueTimerConnection({ log: () => {} })
	c.on('status', (status, message) => statuses.push([status, message]))
	c.on('state', (s) => states.push(s))
	return { c, statuses, states }
}

const snapshot = { v: 1, mode: 'desktop', list: { id: 'l1' }, timer: {}, flags: {}, timers: [] }

test('ready only after ConnectResponse and the first snapshot; nothing is sent before', async () => {
	let server
	const e = engine({
		onConnect: (socket) => {
			server = socket
		},
	})
	const { c, statuses, states } = connection()
	c.connect(base, { scheduleKey: 'l1' })
	assert.deepEqual(await c.sendCommand({ command: 'StartNext' }), {
		success: false,
		error: 'NOT_CONNECTED',
		message: 'Not connected to CueTimer',
	})
	await until(() => server)
	e.send(server, 'ConnectResponse', { success: true, mode: 'desktop' })
	await sleep(50)
	assert.equal(c.isReady, false)
	assert.equal((await c.sendCommand({ command: 'StartNext' })).error, 'NOT_CONNECTED')
	e.send(server, 'companionState', snapshot)
	await until(() => c.isReady)
	assert.equal(states.length, 1)
	assert.equal(statuses.at(-1)[0], 'ok')
	assert.deepEqual(await c.sendCommand({ command: 'StartNext' }), { success: true })
	assert.deepEqual(e.received, [{ command: 'StartNext', data: {} }])
	c.destroy()
})

test('a snapshot that never arrives is reported after the guard', async () => {
	const e = engine({ onConnect: (socket) => e.send(socket, 'ConnectResponse', { success: true, mode: 'web' }) })
	const { c, statuses } = connection()
	c.connect(base, { scheduleKey: 'l1' })
	await until(() => statuses.some(([s]) => s === 'unknown_error'), 7000)
	assert.equal(c.isReady, false)
	c.destroy()
})

test('nothing pressed while disconnected replays on reconnect', async () => {
	let server
	const e = engine({
		onConnect: (socket) => {
			server = socket
			e.send(socket, 'ConnectResponse', { success: true, mode: 'desktop' })
			e.send(socket, 'companionState', snapshot)
		},
	})
	const { c } = connection()
	c.connect(base, { scheduleKey: 'l1' })
	await until(() => c.isReady)
	const first = server
	first.disconnect(true)
	await until(() => !c.isReady)
	assert.equal((await c.sendCommand({ command: 'StartNext' })).error, 'NOT_CONNECTED')
	await until(() => server !== first && c.isReady, 6000)
	await sleep(100)
	assert.deepEqual(e.received, [], 'the press during the outage was dropped, not queued')
	c.destroy()
})

test('a version mismatch and a missing namespace are terminal: no further attempts', async () => {
	engine({
		admit: () => ({ code: 'COMPANION_API_VERSION_MISMATCH', message: 'engine 2.0, module 1.0', recoverable: false }),
	})
	const { c, statuses } = connection()
	c.connect(base, { scheduleKey: 'l1' })
	await until(() => statuses.some(([s]) => s === 'connection_failure'))
	assert.match(statuses.at(-1)[1], /COMPANION_API_VERSION_MISMATCH: engine 2.0/)
	await sleep(300)
	assert.equal(c.backoffTimer, null)
	assert.equal(c.socket.io.reconnection(), false)
	c.destroy()

	const { c: old, statuses: oldStatuses } = connection()
	old.connect(base, { scheduleKey: 'l1' })
	// socket.io answers a namespace the server never created with "Invalid namespace"
	io._nsps.delete('/companion')
	await until(() => oldStatuses.some(([, m]) => /does not support the Companion API/.test(m ?? '')), 5000)
	assert.equal(old.backoffTimer, null)
	old.destroy()
})

test('a recoverable refusal is retried with a backoff until admitted', async () => {
	let refuse = true
	const e = engine({
		admit: () => (refuse ? { code: 'ROOM_LIMIT_REACHED', message: 'full', recoverable: true } : null),
		onConnect: (socket) => {
			e.send(socket, 'ConnectResponse', { success: true, mode: 'web' })
			e.send(socket, 'companionState', snapshot)
		},
	})
	const { c, statuses } = connection()
	c.connect(base, { scheduleKey: 'l1' })
	await until(() => statuses.some(([s, m]) => s === 'connection_failure' && /ROOM_LIMIT_REACHED/.test(m)))
	assert.ok(c.backoffTimer, 'a retry is scheduled')
	refuse = false
	await until(() => c.isReady, 6000)
	c.destroy()
})

test('a room error in ConnectResponse clears readiness without any module retry; a later success restores it', async () => {
	let server
	const e = engine({
		onConnect: (socket) => {
			server = socket
			e.send(socket, 'ConnectResponse', { success: true, mode: 'web' })
			e.send(socket, 'companionState', snapshot)
		},
	})
	const { c, statuses, states } = connection()
	c.connect(base, { scheduleKey: 'room' })
	await until(() => c.isReady)
	e.send(server, 'ConnectResponse', {
		success: false,
		error: 'ROOM_NOT_FOUND',
		details: { message: 'This cue list does not exist' },
	})
	await until(() => !c.isReady)
	assert.match(statuses.at(-1)[1], /This cue list does not exist.*save or re-enable this connection/)
	assert.equal(c.backoffTimer, null)
	assert.equal(server.connected, true, 'the socket to the engine stays open')
	// A snapshot still in flight after the refusal is not live data: nothing is applied, the failure stands
	const statesBefore = states.length
	e.send(server, 'companionState', snapshot)
	await sleep(100)
	assert.equal(states.length, statesBefore)
	assert.equal(statuses.at(-1)[0], 'connection_failure')
	e.send(server, 'ConnectResponse', { success: true, mode: 'web' })
	e.send(server, 'companionState', snapshot)
	await until(() => c.isReady)
	assert.equal(statuses.at(-1)[0], 'ok')
	c.destroy()
})

test('destroy cancels the backoff timer', async () => {
	engine({ admit: () => ({ code: 'INSTANCE_LIMIT_REACHED', message: 'busy', recoverable: true }) })
	const { c } = connection()
	c.connect(base, { scheduleKey: 'l1' })
	await until(() => !!c.backoffTimer)
	c.destroy()
	assert.equal(c.backoffTimer, null)
	assert.equal(c.socket, null)
})

test('a refusal the engine marks unrecoverable is terminal even with an unknown code', async () => {
	engine({ admit: () => ({ code: 'SOMETHING_NEW', message: 'not today', recoverable: false }) })
	const { c, statuses } = connection()
	c.connect(base, { scheduleKey: 'l1' })
	await until(() => statuses.some(([s]) => s === 'connection_failure'))
	assert.equal(
		statuses.at(-1)[1],
		'SOMETHING_NEW: not today. Fix the cause in CueTimer, then save or re-enable this connection',
	)
	await sleep(300)
	assert.equal(c.backoffTimer, null)
	assert.equal(c.socket.io.reconnection(), false)
	c.destroy()
})

test('the first snapshot is delivered before the status turns ok', async () => {
	const order = []
	const e = engine({
		onConnect: (socket) => {
			e.send(socket, 'ConnectResponse', { success: true, mode: 'desktop' })
			e.send(socket, 'companionState', snapshot)
		},
	})
	const c = new CueTimerConnection()
	c.on('status', (status) => order.push(`status:${status}`))
	c.on('state', () => order.push('state'))
	c.connect(base, { scheduleKey: 'l1' })
	await until(() => c.isReady)
	assert.deepEqual(order.slice(-2), ['state', 'status:ok'])
	c.destroy()
})

// ─── The module version 2 port ───────────────────────────────────────────────────────────

/** A raw TCP server; `onData(socket, text, state)` answers. Returns its base URL and what it saw. */
async function tcpServer(onConnection) {
	const sockets = new Set()
	const server = createTcpServer((socket) => {
		sockets.add(socket)
		socket.on('error', () => {})
		socket.on('close', () => sockets.delete(socket))
		onConnection(socket)
	})
	await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
	return {
		base: `http://127.0.0.1:${server.address().port}`,
		close: () => {
			for (const socket of sockets) socket.destroy()
			server.close()
		},
	}
}

/**
 * A port that answers HTTP with 426, as CueTimer's Companion port does. `header` adds
 * CueTimer's own mark; `probeDelayMs` holds back the answer to a plain (non Socket.IO) request.
 */
async function refusingServer({ header = true, probeDelayMs = 0 } = {}) {
	const seen = { upgrades: 0, probes: 0 }
	const response =
		'HTTP/1.1 426 Upgrade Required\r\nConnection: close\r\nContent-Type: text/plain\r\n' +
		(header ? 'X-CueTimer-Port: companion-legacy\r\n' : '') +
		'\r\nno\n'
	const server = await tcpServer((socket) => {
		let text = ''
		socket.on('data', (chunk) => {
			text += chunk
			if (!text.includes('\r\n\r\n')) return
			const probe = !text.startsWith('GET /socket.io/')
			text = ''
			if (probe) seen.probes++
			else seen.upgrades++
			setTimeout(() => socket.end(response), probe ? probeDelayMs : 0)
		})
	})
	return { ...server, seen }
}

test('a port that pushes module version 2 frames is named, with advice for CueTimer 5 and 4', async () => {
	// A CueTimer without the 426 answer, or CueTimer 4: frames arrive whatever the client sends
	const legacy = await tcpServer((socket) => {
		const timer = setInterval(() => socket.write('{"h":"","m":"05","s":"00"}$'), 50)
		socket.on('close', () => clearInterval(timer))
	})
	const { c, statuses } = connection()
	c.connect(legacy.base, { followActiveList: '1' })
	await until(() => statuses.some(([s]) => s === 'connection_failure'))
	assert.deepEqual(statuses.at(-1), ['connection_failure', LEGACY_PROTOCOL_TEXT])
	assert.match(LEGACY_PROTOCOL_TEXT, /CueTimer 4 and older need module version 2/)
	c.destroy()
	legacy.close()
})

test("CueTimer's module version 2 port is recognised by its header, asked once across retries", async () => {
	const port = await refusingServer()
	const { c, statuses } = connection()
	c.connect(port.base, { followActiveList: '1' })
	await until(() => statuses.some(([, message]) => message === LEGACY_PORT_TEXT))
	// Until the port has answered, the status is the plain transport error
	assert.deepEqual(statuses[1], ['connection_failure', 'websocket error: Unexpected server response: 426'])
	// Socket.IO retries on its own: the message stays, and the port is not asked again
	await until(() => port.seen.upgrades >= 3, 15000)
	assert.equal(port.seen.probes, 1)
	const afterProbe = statuses.slice(statuses.findIndex(([, message]) => message === LEGACY_PORT_TEXT))
	assert.ok(afterProbe.length >= 2, 'the retries reported again')
	assert.ok(afterProbe.every(([status, message]) => status === 'connection_failure' && message === LEGACY_PORT_TEXT))
	c.destroy()
	port.close()
})

test('another server that answers 426 keeps the plain error', async () => {
	const port = await refusingServer({ header: false })
	const { c, statuses } = connection()
	c.connect(port.base, { followActiveList: '1' })
	await until(() => port.seen.probes === 1 && port.seen.upgrades >= 2, 10000)
	await sleep(200)
	assert.ok(statuses.length >= 3)
	for (const [status, message] of statuses.slice(1)) {
		assert.deepEqual([status, message], ['connection_failure', 'websocket error: Unexpected server response: 426'])
	}
	assert.equal(port.seen.probes, 1, 'asked once, though the answer was no')
	c.destroy()
	port.close()
})

test('a closed port keeps the plain error', async () => {
	const closed = await tcpServer(() => {})
	closed.close()
	const { c, statuses } = connection()
	c.connect(closed.base, { followActiveList: '1' })
	await until(() => statuses.some(([s]) => s === 'connection_failure'))
	assert.match(statuses.at(-1)[1], /^websocket error: connect ECONNREFUSED/)
	c.destroy()
})

test('an answer that arrives after the port was corrected changes nothing', async () => {
	const e = engine({
		onConnect: (socket) => {
			e.send(socket, 'ConnectResponse', { success: true, mode: 'desktop' })
			e.send(socket, 'companionState', snapshot)
		},
	})
	const port = await refusingServer({ probeDelayMs: 600 })
	const { c, statuses } = connection()
	c.connect(port.base, { followActiveList: '1' })
	await until(() => port.seen.probes === 1)
	// The user corrects the port while the question is still out
	c.connect(base, { scheduleKey: 'l1' })
	await until(() => c.isReady)
	await sleep(900)
	assert.equal(statuses.at(-1)[0], 'ok')
	assert.ok(!statuses.some(([, message]) => message === LEGACY_PORT_TEXT))
	c.destroy()

	// The same when the connection is removed while the question is out
	const removed = connection()
	removed.c.connect(port.base, { followActiveList: '1' })
	await until(() => port.seen.probes === 2)
	removed.c.destroy()
	await sleep(900)
	assert.ok(!removed.statuses.some(([, message]) => message === LEGACY_PORT_TEXT))
	port.close()
})
