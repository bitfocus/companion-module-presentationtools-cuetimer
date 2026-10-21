import { InstanceBase, InstanceStatus, Regex, TCPHelper, combineRgb } from '@companion-module/base'
import { buildCommand, getActionDefinitions } from './actions.js'
import { getListNumberedChoices, getListsChoices } from './choices.js'
import { getFeedbackDefinitions } from './feedbacks.js'
import { MessageBuffer, TERMINATOR } from './message-buffer.js'
import { getPresets } from './presets.js'
import { UpgradeScripts } from './upgrades.js'
import { BUTTON_STATE_KEYS, emptyButtonStates, hexToRgb } from './utils.js'
import { getVariableDefinitions, timerVariableMap } from './variables.js'

export { UpgradeScripts }

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
