import assert from 'node:assert/strict'
import { test } from 'node:test'
import CueTimerInstance from '../src/main.js'
import { parseBonjourTarget, resolveAppTarget, usesDiscovery } from '../src/target.js'

const manual = { mode: 'app', host: '192.168.1.20', port: '31609' }

test('a discovered computer is stored as "address:port"', () => {
	assert.deepEqual(parseBonjourTarget('192.168.1.50:31609'), { host: '192.168.1.50', port: 31609 })
	assert.deepEqual(parseBonjourTarget(' 192.168.1.50 : 40000 '), { host: '192.168.1.50', port: 40000 })
	assert.deepEqual(parseBonjourTarget('studio.local:31609'), { host: 'studio.local', port: 31609 })
	// An IPv6 address comes in brackets
	assert.deepEqual(parseBonjourTarget('[2001:db8::20]:31609'), { host: '2001:db8::20', port: 31609 })
})

test('anything else is not a target', () => {
	for (const value of [
		undefined,
		null,
		'',
		42,
		'192.168.1.50',
		':31609',
		'192.168.1.50:',
		'192.168.1.50:0',
		'192.168.1.50:65536',
		'192.168.1.50:31609x',
		'192.168.1.50:1e3',
		'[]:31609',
		'[2001:db8::20:31609',
	]) {
		assert.equal(parseBonjourTarget(value), null, String(value))
	}
})

test('"Manual" and a config from before the field use Target IP and Target Port', () => {
	for (const bonjourHost of [undefined, null, '']) {
		const config = { ...manual, bonjourHost }
		assert.equal(usesDiscovery(config), false)
		assert.deepEqual(resolveAppTarget(config), { base: 'http://192.168.1.20:31609' })
	}
	assert.deepEqual(resolveAppTarget(manual), { base: 'http://192.168.1.20:31609' })
	assert.deepEqual(resolveAppTarget({ mode: 'app', host: '', port: '31609' }), { error: 'Host and port are required' })
	assert.deepEqual(resolveAppTarget({ mode: 'app', host: '127.0.0.1' }), { error: 'Host and port are required' })
})

test('a chosen computer is used instead of the manual address', () => {
	const config = { ...manual, bonjourHost: '192.168.1.50:40000' }
	assert.equal(usesDiscovery(config), true)
	assert.deepEqual(resolveAppTarget(config), { base: 'http://192.168.1.50:40000' })
	assert.deepEqual(resolveAppTarget({ ...manual, bonjourHost: '[fe80::1]:31609' }), { base: 'http://[fe80::1]:31609' })
})

test('a selection that cannot be read is an error, never the hidden manual address', () => {
	for (const bonjourHost of ['192.168.1.50', 'nonsense', '192.168.1.50:99999', 42]) {
		assert.deepEqual(
			resolveAppTarget({ ...manual, bonjourHost }),
			{ error: 'Select the CueTimer computer again or choose Manual' },
			String(bonjourHost),
		)
	}
})

/** The instance without Companion's runtime: only what connectionTarget() reads */
function targetFor(config) {
	const inst = Object.create(CueTimerInstance.prototype)
	inst.config = config
	return inst.connectionTarget()
}

test('the connection follows the chosen computer in app mode, with the list handshake unchanged', () => {
	assert.deepEqual(targetFor({ ...manual, bonjourHost: '192.168.1.50:40000', list: '' }), {
		base: 'http://192.168.1.50:40000',
		query: { name: 'Companion', followActiveList: '1' },
	})
	assert.deepEqual(targetFor({ ...manual, bonjourHost: null, list: 'some-guid' }), {
		base: 'http://192.168.1.20:31609',
		query: { name: 'Companion', scheduleKey: 'some-guid' },
	})
	assert.deepEqual(targetFor({ ...manual, bonjourHost: 'nonsense' }), {
		error: 'Select the CueTimer computer again or choose Manual',
	})
})

test('Cloud mode ignores a computer chosen earlier in app mode', () => {
	const target = targetFor({ mode: 'cloud', listId: 'abc', name: 'Desk', bonjourHost: 'nonsense', host: '', port: '' })
	assert.equal(target.error, undefined)
	assert.deepEqual(target.query, { scheduleKey: 'abc', name: 'Desk' })
	assert.ok(!target.base.includes('nonsense'))
})
