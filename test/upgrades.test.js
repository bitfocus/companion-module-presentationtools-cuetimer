import assert from 'node:assert/strict'
import { test } from 'node:test'
import { UpgradeScripts } from '../index.js'

const [listNewConfigField] = UpgradeScripts
const context = { currentConfig: {} }

test('the upgrade script list keeps its first entry', () => {
	assert.equal(UpgradeScripts.length, 1)
	assert.equal(typeof listNewConfigField, 'function')
})

test('a null config is left alone', () => {
	const result = listNewConfigField(context, { config: null, secrets: null, actions: [], feedbacks: [] })
	assert.deepEqual(result, { updatedConfig: null, updatedActions: [], updatedFeedbacks: [] })
})

test('a config without a list gets list 1', () => {
	const config = { host: '127.0.0.1', port: '31601' }
	const result = listNewConfigField(context, { config, secrets: null, actions: [], feedbacks: [] })
	assert.equal(result.updatedConfig.list, '1')
	assert.equal(result.updatedConfig.host, '127.0.0.1')
})

test('a config with an existing list is unchanged', () => {
	const config = { host: '127.0.0.1', port: '31601', list: 'some-guid' }
	const result = listNewConfigField(context, { config, secrets: null, actions: [], feedbacks: [] })
	assert.equal(result.updatedConfig, null)
	assert.equal(config.list, 'some-guid')
})
