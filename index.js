import { StringDecoder } from 'node:string_decoder'
import { InstanceBase, Regex, TCPHelper, combineRgb, InstanceStatus, sanitizeVariable } from '@companion-module/base'
import { getPresets } from './presets.js'
import { UpgradeScripts } from './upgrades.js'

export { UpgradeScripts }

const TERMINATOR = '$'

/**
 * Build the command string for an action, always ending in exactly one terminator.
 * Returns null when nothing should be sent.
 */
export function buildCommand(action, ctx) {
	const options = action.options ?? {}
	const log = ctx.log ?? (() => {})

	if (action.actionId === 'ActivateThisList') {
		if (ctx.config?.list) return `ActivateListByGUID#${ctx.config.list}${TERMINATOR}`
		log('debug', 'No list configured, nothing to activate')
		return null
	}

	if (action.actionId === 'ActivateListByNumber') {
		const selection = options.Key
		if (selection === 'Previous') {
			log('debug', 'Activating previous list')
			return `ActivatePreviousList${TERMINATOR}`
		}
		if (selection === 'Next') {
			log('debug', 'Activating next list')
			return `ActivateNextList${TERMINATOR}`
		}
		const listIndex = parseInt(selection, 10) - 1
		const lists = ctx.lists ?? []
		if (Number.isInteger(listIndex) && listIndex >= 0 && listIndex < lists.length) {
			const listGuid = lists[listIndex].guid
			log('debug', `Activating list by index ${listIndex + 1} with GUID: ${listGuid}`)
			return `ActivateListByGUID#${listGuid}${TERMINATOR}`
		}
		log('warn', `List index ${listIndex + 1} is out of range or lists not available`)
		return null
	}

	// For all other actions the actionId is the command, optionally followed by #<Key>
	let cmd = action.actionId
	if (options.Key !== undefined && options.Key !== null) cmd += `#${options.Key}`
	return cmd + TERMINATOR
}

export function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
	return result
		? {
				r: parseInt(result[1], 16),
				g: parseInt(result[2], 16),
				b: parseInt(result[3], 16),
			}
		: null
}

const VARIABLE_ID_REGEX = /^[a-zA-Z0-9-_.!]+$/

/** 32-bit FNV-1a over the UTF-8 bytes of `input`, as 8 lowercase zero-padded hex digits */
export function fnv1a32Hex(input) {
	let hash = 0x811c9dc5
	for (const byte of Buffer.from(String(input), 'utf8')) {
		hash ^= byte
		hash = Math.imul(hash, 0x01000193) >>> 0
	}
	return hash.toString(16).padStart(8, '0')
}

/**
 * Variable-id base for one raw CueTimer timer ID. Depends on that string only.
 * Companion only accepts variable ids matching VARIABLE_ID_REGEX; valid IDs are used unchanged,
 * any other ID is sanitised and gets a hash suffix so that "A B", "AB" and "A#B" stay distinct.
 */
export function timerVariableBase(visibleId) {
	const id = String(visibleId)
	if (VARIABLE_ID_REGEX.test(id)) return id
	return `${sanitizeVariable(id, { ' ': '_' })}_${fnv1a32Hex(id)}`
}

/**
 * Map every raw timer ID of a frame to its variable-id base.
 * Timers whose base collides (with each other, or a raw valid ID equal to a derived id) are left out
 * and reported, so two timers present at the same time never share a variable. The map is stateless:
 * once a timer is removed, another timer deriving to the same base takes that variable over, exactly
 * as a new timer reusing a deleted timer's ID would.
 * @returns {{ bases: Map<string, string>, collisions: { base: string, ids: string[] }[] }}
 */
export function timerVariableMap(rawIds) {
	const byBase = new Map()
	for (const rawId of rawIds) {
		const id = String(rawId)
		const b = timerVariableBase(id)
		if (!byBase.has(b)) byBase.set(b, [])
		byBase.get(b).push(id)
	}
	const bases = new Map()
	const collisions = []
	for (const [b, ids] of byBase) {
		if (ids.length === 1) bases.set(ids[0], b)
		else collisions.push({ base: b, ids: [...ids].sort() })
	}
	collisions.sort((x, y) => (x.base < y.base ? -1 : x.base > y.base ? 1 : 0))
	return { bases, collisions }
}

const MAX_LIST_CHOICES = 10
const BUTTON_STATE_KEYS = [
	'Fullscreen',
	'Preview',
	'Presenter',
	'NDI',
	'Message',
	'STM',
	'Clock',
	'Pause',
	'Blackout',
	'MultitimerPreview',
	'MultitimerFullscreen',
	'MultitimerNDI',
]

function emptyButtonStates() {
	return Object.fromEntries(BUTTON_STATE_KEYS.map((key) => [key, false]))
}

export function getListNumberedChoices(ctx, includePreviousAndNext = false) {
	const result = []

	if (ctx.config?.list === '' && includePreviousAndNext) {
		result.push({ id: 'Previous', label: 'Previous List' })
		result.push({ id: 'Next', label: 'Next List' })
	}

	for (let i = 1; i <= MAX_LIST_CHOICES; i++) {
		const title = ctx.lists?.[i - 1]?.title
		result.push({ id: String(i), label: title !== undefined ? `${i} - ${title}` : `${i} - ` })
	}

	return result
}

function getListsChoices(lists) {
	const result = (lists ?? []).map((item, index) => ({
		id: item.guid,
		label: `${index + 1}- ${item.title}`,
	}))

	// Placeholders so a list can be chosen before the first telemetry arrives
	while (result.length < MAX_LIST_CHOICES) {
		const index = result.length + 1
		result.push({ id: String(index), label: `${index}- ` })
	}

	return result
}

// ─── Definitions (exported for tests; `ctx` is the instance or a stub) ──────

function stateOption() {
	return {
		type: 'dropdown',
		label: 'State',
		id: 'Key',
		default: 'toggle',
		choices: [
			{ id: 'on', label: 'On' },
			{ id: 'off', label: 'Off' },
			{ id: 'toggle', label: 'Toggle' },
		],
	}
}

function textOption(label, defaultValue) {
	return {
		type: 'textinput',
		label,
		id: 'Key',
		default: defaultValue,
		useVariables: true,
	}
}

export function getActionDefinitions(ctx) {
	const callback = (action) => ctx.actionCallback(action)
	const simple = (name) => ({ name, options: [], callback })
	const withState = (name) => ({ name, options: [stateOption()], callback })

	return {
		FireNext: simple('Start'),
		CueNext: simple('Stop'),
		CueCurrent: simple('Stop and go back'),
		Pause: simple('Pause'),
		Restart: simple('Restart'),
		Undo: simple('Undo'),
		AddSpeed: simple('Increase speed by 5%'),
		SubSpeed: simple('Decrease speed by 5%'),
		AddMinute: simple('Add 1 minute'),
		SubMinute: simple('Subtract 1 minute'),
		Blackout: simple('Blackout'),
		Fullscreen: withState('Fullscreen'),
		Preview: withState('Preview'),
		Presenter: withState('Presenter'),
		NDI: simple('NDI'),
		Message: simple('Message'),
		Clock: simple('Clock'),
		STM: simple('Single Timer Mode'),
		MultitimerPreview: withState('Multitimer Preview'),
		MultitimerFullscreen: withState('Multitimer Fullscreen'),
		MultitimerNDI: simple('Multitimer NDI'),
		MoveNextUp: simple('Move Next Up'),
		MoveNextDown: simple('Move Next Down'),
		FireTimerWithID: {
			name: 'Start timer with ID',
			options: [textOption('ID', '1')],
			callback,
		},
		CueTimerWithID: {
			name: 'Cue Timer with ID',
			options: [textOption('ID', '1')],
			callback,
		},
		SetDuration: {
			name: 'Set Duration',
			options: [textOption('New duration (hh:mm:ss)', '00:10:00')],
			callback,
		},
		AddXMinutes: {
			name: 'Add X Minutes',
			options: [textOption('Time span to be added in minutes', '1')],
			callback,
		},
		SubXMinutes: {
			name: 'Subtract X Minutes',
			options: [textOption('Time span to be subtracted in minutes', '1')],
			callback,
		},
		InitList: simple('Initialize List'),
		InitEndTimeTimer: {
			name: 'Initialize and start a new EndTime timer',
			options: [textOption('EndTime hh:mm:ss', '')],
			callback,
		},
		ActivateNextList: {
			name: 'Activate next list',
			description: 'Activate the next list',
			options: [],
			callback,
		},
		ActivatePreviousList: {
			name: 'Activate previous list',
			description: 'Activate the previous list',
			options: [],
			callback,
		},
		ActivateThisList: {
			name: 'Activate this list',
			description: 'Activate the list with the GUID set in the configuration settings',
			options: [],
			callback,
		},
		ActivateListByNumber: {
			name: 'Activate list by number',
			description: 'Activate a specific list by its number',
			options: [
				{
					type: 'dropdown',
					label: 'List Selection',
					id: 'Key',
					default: '1',
					choices: getListNumberedChoices(ctx, true),
				},
			],
			callback,
		},
	}
}

export function getFeedbackDefinitions(ctx) {
	const idOption = {
		type: 'textinput',
		label: 'ID',
		id: 'Key',
		default: '1',
	}

	return {
		colors: {
			type: 'advanced',
			name: 'Main counter Colors from timer',
			description: 'Foreground and background colors of the timer',
			options: [],
			affectedProperties: ['color', 'bgcolor'],
			callback: () => ({ color: ctx.fgColor, bgcolor: ctx.bgColor }),
		},
		status: {
			type: 'boolean',
			name: 'Main counter Background Color',
			description: 'Background color of button, based on its status',
			options: [
				{
					type: 'dropdown',
					label: 'Source',
					id: 'Key',
					default: 'Fullscreen',
					choices: [
						{ id: 'Fullscreen', label: 'Fullscreen' },
						{ id: 'Preview', label: 'Preview' },
						{ id: 'Presenter', label: 'Presenter' },
						{ id: 'NDI', label: 'NDI' },
						{ id: 'Message', label: 'Message' },
						{ id: 'STM', label: 'Single Timer Mode' },
						{ id: 'Clock', label: 'Clock' },
						{ id: 'Pause', label: 'Pause' },
						{ id: 'Blackout', label: 'Blackout' },
						{ id: 'MultitimerPreview', label: 'Multitimer Preview' },
						{ id: 'MultitimerFullscreen', label: 'Multitimer Fullscreen' },
						{ id: 'MultitimerNDI', label: 'Multitimer NDI' },
					],
				},
			],
			defaultStyle: {
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(255, 165, 0),
			},
			callback: (feedback) => !!ctx.buttonStates[feedback.options.Key],
		},
		timerName: {
			type: 'advanced',
			name: 'ID timer Name',
			description: 'Timer Name with ID',
			options: [idOption],
			affectedProperties: ['text'],
			callback: (feedback) => {
				const timer = ctx.timers[feedback.options.Key]
				return timer ? { text: timer.name } : {}
			},
		},
		timerDuration: {
			type: 'advanced',
			name: 'ID timer Duration',
			description: 'Timer Duration with ID',
			options: [idOption],
			affectedProperties: ['text'],
			callback: (feedback) => {
				const timer = ctx.timers[feedback.options.Key]
				return timer ? { text: timer.duration } : {}
			},
		},
		timerBackground: {
			type: 'advanced',
			name: 'ID timer Background',
			description: 'Timer Background with ID',
			options: [idOption],
			affectedProperties: ['bgcolor'],
			callback: (feedback) => {
				const timer = ctx.timers[feedback.options.Key]
				const rgb = timer ? hexToRgb(String(timer.bg).substr(1)) : null
				return { bgcolor: rgb ? combineRgb(rgb.r, rgb.g, rgb.b) : combineRgb(0, 0, 0) }
			},
		},
		activeList: {
			type: 'boolean',
			name: 'Active List',
			description: 'If list is active, change the style',
			options: [
				{
					type: 'dropdown',
					label: 'List Number',
					id: 'Key',
					default: '1',
					choices: getListNumberedChoices(ctx),
				},
			],
			defaultStyle: {
				color: combineRgb(255, 255, 255),
				bgcolor: '#9A9A00',
			},
			callback: (feedback) => {
				const targetIndex = parseInt(feedback.options.Key, 10)
				return !!ctx.lists?.[targetIndex - 1]?.isActive
			},
		},
	}
}

export function getListVariableDefinitions(lists) {
	const variables = {
		listName: { name: 'List Name' },
		listNumber: { name: 'List Number' },
		listGUID: { name: 'List GUID' },
		listDisplayLink: { name: 'List Display Link' },
		listControlLink: { name: 'List Control Link' },
	}

	for (let i = 1; i <= (lists?.length ?? 0); i++) {
		variables[`list_${i}_name`] = { name: `List ${i} Name` }
		variables[`list_${i}_display_link`] = { name: `List ${i} Display Link` }
		variables[`list_${i}_control_link`] = { name: `List ${i} Control Link` }
	}

	return variables
}

export function getVariableDefinitions(ctx) {
	const variables = {
		hours: { name: 'Hours' },
		minutes: { name: 'Minutes' },
		seconds: { name: 'Seconds' },
		name: { name: 'Name' },
		speed: { name: 'Speed' },
		endTime: { name: 'End Time' },
		nextTimerName: { name: 'Next Timer Name' },
		nextTimerDuration: { name: 'Next Timer Duration' },
		scheduleOffset: { name: 'Schedule Offset' },
		scheduleOffsetStatus: { name: 'Schedule Offset Status' },
	}

	for (const [visibleId, base] of timerVariableMap(Object.keys(ctx.timers ?? {})).bases) {
		variables[`timer_${base}_name`] = { name: `Timer ${visibleId} Name` }
		variables[`timer_${base}_duration`] = { name: `Timer ${visibleId} Duration` }
	}

	return { ...variables, ...getListVariableDefinitions(ctx.lists) }
}

export default class CueTimerInstance extends InstanceBase {
	constructor(internal) {
		super(internal)
	}

	hexToRgb(hex) {
		return hexToRgb(hex)
	}

	async configUpdated(config) {
		var self = this
		self.log('debug', `configUpdated`)

		self.config = config

		// Reset state before the definitions are built, so they do not reflect the previous config
		self.bgColor = combineRgb(0, 0, 0)
		self.fgColor = combineRgb(255, 255, 255)
		self.buttonStates = emptyButtonStates()
		self.lists = []
		self.timers = {}

		self.initTCP()
		self.actions()
		self.feedbacks()
		self.presets()
		self.variables()

		self.setVariableValues({
			hours: '',
			minutes: '',
			seconds: '',
			name: '',
			speed: '',
			endTime: '',
			nextTimerName: '',
			nextTimerDuration: '',
			scheduleOffset: '00:00:00',
			scheduleOffsetStatus: '',
			listName: '',
			listNumber: config.list,
		})
	}

	async init(config) {
		await this.configUpdated(config)
	}

	compareKeys(a, b) {
		return JSON.stringify(Object.keys(a).sort()) === JSON.stringify(Object.keys(b).sort())
	}

	selectList(list) {
		var self = this

		if (self.socket !== undefined && self.socket.isConnected) {
			self.log('debug', `selectList: ${list}`)
			self.socket.send(`select_list#${list}${TERMINATOR}`)
		} else {
			self.log('debug', 'Socket not connected, cannot select list')
		}
	}

	isListChanged(jsonData) {
		return (
			JSON.stringify(this.lists) != JSON.stringify(jsonData.lists) ||
			jsonData.listNumber != this.getVariableValue('listNumber') ||
			jsonData.listGUID != this.getVariableValue('listGUID')
		)
	}

	initTCP() {
		var self = this

		if (self.socket !== undefined) {
			self.socket.destroy()
			delete self.socket
		}

		if (self.config.host && self.config.port) {
			self.receiveBuffer = new MessageBuffer()
			self.socket = new TCPHelper(self.config.host, parseInt(self.config.port, 10))

			// TCPHelper reconnects on its own; mirror its status into the connection status
			self.socket.on('status_change', (status, message) => self.updateStatus(status, message))

			self.socket.on('error', (err) => {
				self.log('debug', `Socket error: ${err.message}`)
			})

			self.socket.on('connect', () => {
				self.log('debug', `Connected to ${self.config.host}:${self.config.port}`)
				self.lists = []
				// Fresh buffer per connection so a partial frame or decoder state never survives a reconnect
				self.receiveBuffer = new MessageBuffer()
			})

			self.socket.on('data', (chunk) => {
				self.receiveBuffer.push(chunk)
				for (const message of self.receiveBuffer.extractMessages()) {
					self.handleTelemetry(message)
				}
			})
			self.socket.on('end', function () {
				self.log('debug', 'end')
			})
		} else {
			self.updateStatus(InstanceStatus.BadConfig, 'Host and port are required')
		}
	}

	reportTimerCollisions(collisions) {
		// Warn once per distinct set of collisions, not on every 200 ms frame
		const key = JSON.stringify(collisions)
		if (key === this.lastTimerCollisionKey) return
		this.lastTimerCollisionKey = key
		for (const { base, ids } of collisions) {
			this.log(
				'warn',
				`Timer IDs ${ids.map((id) => `"${id}"`).join(', ')} map to the same variable id "${base}"; their variables are not published. Rename one of them in CueTimer.`,
			)
		}
	}

	handleTelemetry(message) {
		let jsonData
		try {
			jsonData = JSON.parse(message)
		} catch (e) {
			this.log('debug', `Ignoring malformed telemetry frame: ${e.message}`)
			return
		}

		try {
			this.applyTelemetry(jsonData)
		} catch (e) {
			this.log('debug', `Failed to apply telemetry: ${e.message}`)
		}
	}

	applyTelemetry(jsonData) {
		var self = this

		if (jsonData.lists && self.isListChanged(jsonData)) {
			self.log('debug', `Lists changed, updating lists ${JSON.stringify(jsonData.lists)}`)
			self.lists = jsonData.lists

			if (self.isIntegerString(self.config.list)) {
				// If the config.list is an integer string, it means it was set to a placeholder list
				self.log('debug', `Selected list is a placeholder list with index: ${self.config.list}`)
				if (self.lists.length >= parseInt(self.config.list)) {
					// Found the current index in the new list - update config to new GUID
					self.log('debug', `Selected placeholder list found at index: ${self.config.list}`)
					self.config.list = self.lists[parseInt(self.config.list) - 1].guid
					self.saveConfig(self.config)
				}
			}

			if (self.config.list == '' || self.lists.findIndex((item) => item.guid === self.config.list) != -1) {
				if (self.config.list == '' || self.config.list != jsonData.listGUID) {
					self.selectList(self.config.list)
					self.updateStatus(InstanceStatus.Ok)
				}
			} else {
				self.updateStatus(InstanceStatus.UnknownWarning, `Selected list not found, active list will be used`)
			}

			self.variables()
			self.updateListVariablesValues(jsonData.listNumber)
			self.actions()
			self.feedbacks()
			self.checkFeedbacks('activeList')
		}

		let hours = (jsonData.h < 0 ? '+' : '') + jsonData.h.replace('-', '')

		let minutes = (jsonData.m < 0 ? '+' : '') + jsonData.m.replace('-', '')

		let seconds = (jsonData.s < 0 ? '+' : '') + jsonData.s.replace('-', '')

		self.setVariableValues({
			hours: hours,
			minutes: minutes,
			seconds: seconds,
			speed: jsonData.speed,
			name: jsonData.name,
			endTime: jsonData.endTime,
		})

		// Colours arrive as #AARRGGBB; drop the alpha byte
		if (typeof jsonData.fg === 'string') {
			let tempFg = self.hexToRgb(jsonData.fg.substr(0, 1) + jsonData.fg.substr(3))
			if (tempFg) self.fgColor = combineRgb(tempFg.r, tempFg.g, tempFg.b)
		}
		if (typeof jsonData.bg === 'string') {
			let tempBg = self.hexToRgb(jsonData.bg.substr(0, 1) + jsonData.bg.substr(3))
			if (tempBg) self.bgColor = combineRgb(tempBg.r, tempBg.g, tempBg.b)
		}

		for (const key of BUTTON_STATE_KEYS) {
			self.buttonStates[key] = jsonData[key]
		}
		self.setVariableValues({
			nextTimerName: jsonData.nextTimerName,
			nextTimerDuration: jsonData.nextTimerDuration,
			scheduleOffset: jsonData.scheduleOffset,
			scheduleOffsetStatus: jsonData.scheduleOffsetStatus,
		})

		let updateVariablesFlag = false
		const timers = jsonData.timers ?? {}
		if (!this.compareKeys(self.timers, timers)) {
			updateVariablesFlag = true
		}

		self.timers = timers

		if (updateVariablesFlag) self.variables()

		const { bases, collisions } = timerVariableMap(Object.keys(self.timers))
		self.reportTimerCollisions(collisions)
		const timerValues = {}
		for (const [x, base] of bases) {
			timerValues[`timer_${base}_name`] = self.timers[x].name
			timerValues[`timer_${base}_duration`] = self.timers[x].duration
		}
		if (Object.keys(timerValues).length > 0) self.setVariableValues(timerValues)

		self.checkFeedbacks('colors', 'status', 'timerName', 'timerDuration', 'timerBackground')
	}

	updateListVariablesValues(listNumber) {
		var self = this

		let listIndex = listNumber - 1
		self.setVariableValues({ listNumber: listNumber })
		self.setVariableValues({ listName: self.lists[listIndex]?.title })
		self.setVariableValues({ listGUID: self.lists[listIndex]?.guid })
		self.setVariableValues({ listDisplayLink: self.lists[listIndex]?.displayLink ?? '' })
		self.setVariableValues({ listControlLink: self.lists[listIndex]?.controlLink ?? '' })

		// Update list variables
		if (self.lists && self.lists.length > 0) {
			for (let i = 0; i < self.lists.length; i++) {
				self.setVariableValues({
					[`list_${i + 1}_name`]: `${i + 1} - ${self.lists[i].title}`,
					[`list_${i + 1}_display_link`]: self.lists[i].displayLink ?? '',
					[`list_${i + 1}_control_link`]: self.lists[i].controlLink ?? '',
				})
			}
		}
	}

	isIntegerString(str) {
		return /^-?\d+$/.test(str)
	}

	getConfigFields() {
		return [
			{
				type: 'static-text',
				id: 'info',
				width: 12,
				label: 'Information',
				value: 'This will establish a TCP connection to interact with the CueTimer app',
			},
			{
				type: 'dropdown',
				id: 'list',
				label: 'List Number',
				default: '1',
				width: 12,
				choices: [{ id: '', label: 'Active List' }].concat(getListsChoices(this.lists)),
			},
			{
				type: 'textinput',
				id: 'host',
				label: 'Target IP (For local: 127.0.0.1)',
				default: '127.0.0.1',
				width: 6,
				regex: Regex.IP,
			},
			{
				type: 'textinput',
				id: 'port',
				label: 'Target Port (Default: 31601)',
				default: '31601',
				width: 6,
				regex: Regex.PORT,
			},
			{
				type: 'static-text',
				id: 'info-defaultport',
				width: 12,
				label: 'Port',
				value:
					'<p>Check that the port in CueTimer matches the target port shown here. ' +
					'To change the default port in CueTimer, go to Preferences/Triggers/Companion. ' +
					'We recommend using port 31601 for connection. If this port is not available, try something else in the same range.</p>' +
					'<p>For CueTimer v.3.2 and below: In the list selection, choose “Active list”</p>',
			},
		]
	}

	getListNumberedChoices(includePreviousAndNext = false) {
		return getListNumberedChoices(this, includePreviousAndNext)
	}

	actions() {
		this.setActionDefinitions(getActionDefinitions(this))
	}

	async actionCallback(action) {
		const cmd = buildCommand(action, {
			config: this.config,
			lists: this.lists,
			log: (level, message) => this.log(level, message),
		})
		if (!cmd) return

		if (this.socket !== undefined && this.socket.isConnected) {
			this.log('debug', `Sending ${cmd}`)
			this.socket.send(cmd)
		} else {
			this.log('debug', `Socket not connected, cannot send ${cmd}`)
		}
	}

	variables() {
		this.setVariableDefinitions(getVariableDefinitions(this))
	}

	feedbacks() {
		this.setFeedbackDefinitions(getFeedbackDefinitions(this))
	}

	presets() {
		var self = this
		const { structure, presets } = getPresets(self.label)
		self.setPresetDefinitions(structure, presets)
	}

	async destroy() {
		var self = this

		if (self.socket !== undefined) {
			self.socket.destroy()
		}

		self.log('debug', `destroy ${self.id}`)
	}
}
/**
 * Accumulates raw socket chunks and yields complete `$`-terminated messages.
 * Uses a StringDecoder so a multibyte character split across two chunks decodes intact.
 */
export class MessageBuffer {
	constructor(delimiter = '$') {
		this.delimiter = delimiter
		this.decoder = new StringDecoder('utf8')
		this.buffer = ''
	}

	push(chunk) {
		// decoder.write(), never decoder.end(): end() would flush a split character as U+FFFD
		this.buffer += Buffer.isBuffer(chunk) ? this.decoder.write(chunk) : String(chunk)
	}

	extractMessages() {
		const messages = []
		let index
		while ((index = this.buffer.indexOf(this.delimiter)) !== -1) {
			const message = this.buffer.slice(0, index)
			this.buffer = this.buffer.slice(index + this.delimiter.length)
			if (message.length > 0) messages.push(message)
		}
		return messages
	}
}
