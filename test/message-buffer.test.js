import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MessageBuffer } from '../index.js'

test('a payload split across chunks is returned once complete', () => {
	const buffer = new MessageBuffer()
	buffer.push(Buffer.from('{"a":'))
	assert.deepEqual(buffer.extractMessages(), [])
	buffer.push(Buffer.from('1}$'))
	assert.deepEqual(buffer.extractMessages(), ['{"a":1}'])
})

test('two payloads in one chunk are both returned, in order', () => {
	const buffer = new MessageBuffer()
	buffer.push(Buffer.from('{"a":1}${"a":2}$'))
	assert.deepEqual(buffer.extractMessages(), ['{"a":1}', '{"a":2}'])
})

test('a trailing partial payload is retained for the next chunk', () => {
	const buffer = new MessageBuffer()
	buffer.push(Buffer.from('{"a":1}${"a":'))
	assert.deepEqual(buffer.extractMessages(), ['{"a":1}'])
	buffer.push(Buffer.from('2}$'))
	assert.deepEqual(buffer.extractMessages(), ['{"a":2}'])
})

test('a chunk without a delimiter yields nothing', () => {
	const buffer = new MessageBuffer()
	buffer.push(Buffer.from('{"a":1}'))
	assert.deepEqual(buffer.extractMessages(), [])
})

test('a multibyte character split between two chunks decodes intact', () => {
	const bytes = Buffer.from('{"name":"مرحبا"}$', 'utf8')
	// Cut in the middle of the second Arabic letter (each letter is 2 bytes)
	const cut = Buffer.from('{"name":"م', 'utf8').length + 1
	const buffer = new MessageBuffer()
	buffer.push(bytes.subarray(0, cut))
	assert.deepEqual(buffer.extractMessages(), [])
	buffer.push(bytes.subarray(cut))
	assert.deepEqual(buffer.extractMessages(), ['{"name":"مرحبا"}'])
})

test('a malformed frame does not hide the valid frame after it', () => {
	const buffer = new MessageBuffer()
	buffer.push(Buffer.from('not json$${"a":1}$'))
	const messages = buffer.extractMessages()
	assert.deepEqual(messages, ['not json', '{"a":1}'])
	assert.throws(() => JSON.parse(messages[0]))
	assert.deepEqual(JSON.parse(messages[1]), { a: 1 })
})
