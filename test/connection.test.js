import assert from 'node:assert/strict'
import { test, after } from 'node:test'
import { createServer } from 'node:http'
import { Server } from 'socket.io'
import { CueTimerConnection } from '../src/connection.js'

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
