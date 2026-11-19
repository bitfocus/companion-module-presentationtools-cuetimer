import assert from 'node:assert/strict'
import { test } from 'node:test'
import { clockParts, formatHms, parseUtc, timeOfDayIn, zoneFor } from '../src/time.js'

const hmsIn = (utc, zone) => formatHms(timeOfDayIn(parseUtc(utc), zone))

test('a UTC wire string is an instant; anything else is not', () => {
	assert.equal(parseUtc('2026-11-13 19:00:00.250').getTime(), Date.UTC(2026, 10, 13, 19, 0, 0, 250))
	for (const bad of ['', undefined, null, 42, '19:00:00', '2026-11-13T19:00:00.000Z', '2026-11-13 19:00:00']) {
		assert.equal(parseUtc(bad), null, String(bad))
	}
})

test('an instant is read in the named zone', () => {
	assert.equal(hmsIn('2026-11-13 19:00:00.000', 'UTC'), '19:00:00')
	assert.equal(hmsIn('2026-11-13 19:00:00.000', 'Europe/Oslo'), '20:00:00')
	assert.equal(hmsIn('2026-11-13 19:00:00.000', 'America/New_York'), '14:00:00')
	// The date line: already the next morning in Auckland
	assert.equal(hmsIn('2026-11-13 19:00:00.000', 'Pacific/Auckland'), '08:00:00')
	// A zone 5:45 ahead of UTC
	assert.equal(hmsIn('2026-11-13 19:00:00.000', 'Asia/Kathmandu'), '00:45:00')
})

test('either side of a clock change', () => {
	// Oslo leaves summer time on 2026-10-25 at 01:00 UTC: 02:59:59 CEST is followed by 02:00:00 CET
	assert.equal(hmsIn('2026-10-25 00:59:59.000', 'Europe/Oslo'), '02:59:59')
	assert.equal(hmsIn('2026-10-25 01:00:00.000', 'Europe/Oslo'), '02:00:00')
	// and enters it on 2026-03-29 at 01:00 UTC: 01:59:59 CET is followed by 03:00:00 CEST
	assert.equal(hmsIn('2026-03-29 00:59:59.000', 'Europe/Oslo'), '01:59:59')
	assert.equal(hmsIn('2026-03-29 01:00:00.000', 'Europe/Oslo'), '03:00:00')
})

test('midnight is 00, never 24', () => {
	assert.equal(hmsIn('2026-11-13 22:59:59.999', 'Europe/Oslo'), '23:59:59')
	assert.equal(hmsIn('2026-11-13 23:00:00.000', 'Europe/Oslo'), '00:00:00')
	assert.equal(hmsIn('2026-11-13 00:00:00.000', 'UTC'), '00:00:00')
})

test('without a zone the instant is read on the device clock', () => {
	// Runs under whatever TZ the process has; the expectation comes from the same clock
	for (const utc of ['2026-11-13 19:00:00.000', '2026-07-01 03:30:15.000', '2026-10-25 00:59:59.000']) {
		const date = parseUtc(utc)
		const expected = formatHms({ hours: date.getHours(), minutes: date.getMinutes(), seconds: date.getSeconds() })
		assert.equal(hmsIn(utc, undefined), expected, utc)
	}
})

test('the device zone is followed when it changes while the module runs', () => {
	const utc = '2026-11-13 19:00:00.000'
	const before = process.env.TZ
	try {
		process.env.TZ = 'UTC'
		assert.equal(hmsIn(utc, undefined), '19:00:00')
		process.env.TZ = 'America/New_York'
		assert.equal(hmsIn(utc, undefined), '14:00:00')
		process.env.TZ = 'Asia/Kathmandu'
		assert.equal(hmsIn(utc, undefined), '00:45:00')
		// A named zone is not affected
		assert.equal(hmsIn(utc, 'Europe/Oslo'), '20:00:00')
	} finally {
		if (before === undefined) delete process.env.TZ
		else process.env.TZ = before
	}
})

test('a zone this runtime does not know falls back to the device clock', () => {
	const utc = '2026-11-13 19:00:00.000'
	assert.equal(hmsIn(utc, 'Nowhere/Nothing'), hmsIn(utc, undefined))
})

test('the setting picks the zone', () => {
	assert.equal(zoneFor('schedule', 'Europe/Oslo'), 'Europe/Oslo')
	assert.equal(zoneFor('device', 'Europe/Oslo'), undefined)
	assert.equal(zoneFor(undefined, 'Europe/Oslo'), undefined, 'a connection saved before the setting existed')
	assert.equal(zoneFor('schedule', undefined), undefined, 'CueTimer sent no zone')
})

test('the clock follows the clock preferences', () => {
	const evening = { hours: 20, minutes: 5, seconds: 9 }
	assert.deepEqual(clockParts(evening, { hour24: true, seconds: true, hideZeros: false }), {
		hours: '20',
		minutes: '05',
		seconds: '09',
	})
	assert.deepEqual(clockParts(evening, { hour24: false, seconds: true, hideZeros: false }), {
		hours: '08',
		minutes: '05',
		seconds: '09',
	})
	assert.deepEqual(clockParts(evening, { hour24: false, seconds: false, hideZeros: true }), {
		hours: '8',
		minutes: '05',
		seconds: '',
	})
	const midnight = { hours: 0, minutes: 0, seconds: 0 }
	assert.equal(clockParts(midnight, { hour24: false }).hours, '12')
	assert.equal(clockParts(midnight, { hour24: true, hideZeros: true }).hours, '0')
	assert.equal(clockParts({ hours: 12, minutes: 0, seconds: 0 }, { hour24: false }).hours, '12')
	assert.deepEqual(clockParts(evening), { hours: '20', minutes: '05', seconds: '09' }, 'defaults')
})
