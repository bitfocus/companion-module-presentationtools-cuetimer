import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { DEFAULT_CLOUD_URL, cloudUrl, getConfigFields } from '../src/config.js'

const fields = getConfigFields({ lists: [] })
const byId = Object.fromEntries(fields.map((field) => [field.id, field]))

test('fields follow the "Connect to" choice through expressions, never functions', () => {
	for (const field of fields) assert.equal(field.isVisible, undefined, `${field.id} uses a function`)
	for (const id of ['bonjourHost', 'list']) {
		assert.equal(byId[id].isVisibleExpression, "$(options:mode) !== 'cloud'", id)
	}
	// The manual address is hidden while a computer is picked from the discovery list
	for (const id of ['host', 'port']) {
		assert.equal(byId[id].isVisibleExpression, "$(options:mode) !== 'cloud' && !$(options:bonjourHost)", id)
	}
	assert.equal(byId['info-app'], undefined)
	assert.match(byId.port.description, /LAN port/)
	for (const id of ['listId', 'name']) assert.equal(byId[id].isVisibleExpression, "$(options:mode) === 'cloud'", id)
	assert.equal(byId['info-cloud'], undefined)
	for (const id of ['info', 'mode', 'timeZone']) assert.equal(byId[id].isVisibleExpression, undefined, id)
})

test('the discovery list is a config field with a matching query in the manifest', () => {
	const manifest = JSON.parse(readFileSync(new URL('../companion/manifest.json', import.meta.url), 'utf8'))
	assert.equal(byId.bonjourHost.type, 'bonjour-device')
	assert.equal(byId.bonjourHost.default, undefined, 'a new connection starts on Manual')
	assert.deepEqual(Object.keys(manifest.bonjourQueries), ['bonjourHost'])
	// CueTimer advertises _cuetimer._tcp with txtvers=1
	assert.deepEqual(manifest.bonjourQueries.bonjourHost, { type: 'cuetimer', protocol: 'tcp', txt: { txtvers: '1' } })
	assert.ok(fields.indexOf(byId.bonjourHost) < fields.indexOf(byId.host), 'above the manual address')
})

test('the Cloud endpoint is not a setting', () => {
	assert.equal(byId.cloudUrl, undefined)
	assert.equal(DEFAULT_CLOUD_URL, 'https://backend.cuetimer.io')
})

test('CUETIMER_CLOUD_URL overrides the Cloud endpoint for development', () => {
	assert.equal(cloudUrl({}), DEFAULT_CLOUD_URL)
	assert.equal(cloudUrl({ CUETIMER_CLOUD_URL: '' }), DEFAULT_CLOUD_URL)
	assert.equal(cloudUrl({ CUETIMER_CLOUD_URL: ' http://localhost:3001 ' }), 'http://localhost:3001')
})

test('defaults match a fresh app connection', () => {
	assert.deepEqual(
		byId.mode.choices.map((c) => c.id),
		['app', 'cloud'],
	)
	assert.equal(byId.mode.default, 'app')
	assert.equal(byId.host.default, '127.0.0.1')
	assert.equal(byId.port.default, '31609')
	assert.equal(byId.list.default, '1')
	assert.equal(byId.list.choices[0].id, '')
	assert.equal(byId.listId.default, '')
	assert.equal(byId.name.default, 'Companion')
	assert.deepEqual(
		byId.timeZone.choices.map((c) => c.id),
		['device', 'schedule'],
	)
	assert.equal(byId.timeZone.default, 'device')
})
