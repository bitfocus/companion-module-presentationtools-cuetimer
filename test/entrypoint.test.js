import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as entrypoint from '../src/main.js'
import CueTimerInstance, { UpgradeScripts } from '../src/main.js'

test('the entrypoint exports the instance class as default', () => {
	assert.equal(typeof CueTimerInstance, 'function')
	assert.equal(CueTimerInstance.name, 'CueTimerInstance')
})

test('the entrypoint exports the upgrade scripts Companion reads', () => {
	assert.ok(Array.isArray(UpgradeScripts))
	assert.equal(UpgradeScripts.length, 1)
	assert.equal(typeof UpgradeScripts[0], 'function')
})

test('the entrypoint exposes nothing else', () => {
	assert.deepEqual(Object.keys(entrypoint).sort(), ['UpgradeScripts', 'default'])
})
