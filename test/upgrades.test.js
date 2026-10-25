import assert from 'node:assert/strict'
import { test } from 'node:test'
import { UpgradeScripts } from '../src/upgrades.js'

const [listNewConfigField, tcpToSocketIo] = UpgradeScripts
const context = { currentConfig: {} }
const props = (config) => ({ config, secrets: null, actions: [], feedbacks: [] })

test('the upgrade script list has the two scripts in order', () => {
	assert.equal(UpgradeScripts.length, 2)
	assert.equal(typeof listNewConfigField, 'function')
	assert.equal(typeof tcpToSocketIo, 'function')
})

test('a null config is left alone by both', () => {
	for (const script of UpgradeScripts) {
		assert.deepEqual(script(context, props(null)), { updatedConfig: null, updatedActions: [], updatedFeedbacks: [] })
	}
})

test('a config without a list gets list 1', () => {
	const config = { host: '127.0.0.1', port: '31601' }
	const result = listNewConfigField(context, props(config))
	assert.equal(result.updatedConfig.list, '1')
	assert.equal(result.updatedConfig.host, '127.0.0.1')
})

test('a config with an existing list is unchanged by the first script', () => {
	const config = { host: '127.0.0.1', port: '31601', list: 'some-guid' }
	assert.equal(listNewConfigField(context, props(config)).updatedConfig, null)
	assert.equal(config.list, 'some-guid')
})

test('a 2.x TCP config becomes an app connection on the LAN port, keeping host and list', () => {
	const config = { host: '192.168.1.20', port: '31601', list: 'some-guid' }
	const result = tcpToSocketIo(context, props(config))
	assert.deepEqual(result.updatedConfig, {
		host: '192.168.1.20',
		port: '31609',
		list: 'some-guid',
		mode: 'app',
		listId: '',
		name: 'Companion',
	})
	assert.deepEqual(result.updatedActions, [])
	assert.deepEqual(result.updatedFeedbacks, [])
})

test('a changed TCP port is still replaced by the LAN port, and a missing host or list gets a default', () => {
	const result = tcpToSocketIo(context, props({ port: '31700' }))
	assert.equal(result.updatedConfig.port, '31609')
	assert.equal(result.updatedConfig.host, '127.0.0.1')
	assert.equal(result.updatedConfig.list, '')
})

test('a config that already has a mode is untouched', () => {
	const config = { mode: 'cloud', listId: 'abc', name: 'Desk' }
	assert.equal(tcpToSocketIo(context, props(config)).updatedConfig, null)
	assert.equal(config.listId, 'abc')
})
