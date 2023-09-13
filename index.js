const { InstanceBase, Regex, runEntrypoint, TCPHelper, combineRgb, InstanceStatus } = require('@companion-module/base')
var presets = require('./presets')

class CueTimerInstance extends InstanceBase {
	constructor(internal) {
		super(internal)

		String.prototype.lpad = function (padString, length) {
			var str = this
			while (str.length < length) str = padString + str
			return str
		}
	}

	hexToRgb(hex) {
		var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
		return result
			? {
					r: parseInt(result[1], 16),
					g: parseInt(result[2], 16),
					b: parseInt(result[3], 16),
			  }
			: null
	}

	async configUpdated(config) {
		var self = this

		self.config = config

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
		})
		self.bgColor = combineRgb(0, 0, 0)
		self.fgColor = combineRgb(255, 255, 255)
		self.buttonStates = {
			Fullscreen: false,
			NDI: false,
			Message: false,
			STM: false,
			Clock: false,
			Pause: false,
			Blackout: false,
		}
		self.timers = {}
	}

	async init(config) {
		this.configUpdated(config);
	}

	compareKeys(a, b) {
		return JSON.stringify(Object.keys(a).sort()) === JSON.stringify(Object.keys(b).sort())
	}

	initTCP() {
		var self = this

		if (self.socket !== undefined) {
			self.socket.destroy()
			delete self.socket
		}

		if (self.config.host && self.config.port) {
			self.socket = new TCPHelper(self.config.host, self.config.port)

			self.socket.on('status_change', (status, message) => {
				self.log('debug', `Status ${status}, message: ${message}`)
				self.updateStatus(status)
			})

			self.socket.on('error', (_err) => {
				self.updateStatus(InstanceStatus.UnknownError)
			})

			self.socket.on('connect', () => {
				self.updateStatus(InstanceStatus.Ok)
			})

			self.socket.on('data', (data) => {
				let received = new MessageBuffer('$')
				received.push(data)
				let message = received.handleData()

				try {
					let jsonData = JSON.parse(message)
					let hours = (jsonData.h < 0 ? '+' : '') + jsonData.h.replace('-', '')
					hours = hours == '' ? '' : hours.lpad('0', 2)

					let minutes = (jsonData.m < 0 ? '+' : '') + jsonData.m.replace('-', '')
					minutes = minutes == '' ? '' : minutes.lpad('0', 2)

					let seconds = (jsonData.s < 0 ? '+' : '') + jsonData.s.replace('-', '')
					seconds = seconds == '' ? '' : seconds.lpad('0', 2)

					self.setVariableValues({
						hours: hours,
						minutes: minutes,
						seconds: seconds,
						speed: jsonData.speed,
						name: jsonData.name,
						endTime: jsonData.endTime,
					})

					let tempFg = self.hexToRgb(jsonData.fg.substr(0, 1) + jsonData.fg.substr(3))
					self.fgColor = combineRgb(tempFg.r, tempFg.g, tempFg.b)
					let tempBg = self.hexToRgb(jsonData.bg.substr(0, 1) + jsonData.bg.substr(3))
					self.bgColor = combineRgb(tempBg.r, tempBg.g, tempBg.b)

					self.buttonStates['Fullscreen'] = jsonData['Fullscreen']
					self.buttonStates['NDI'] = jsonData['NDI']
					self.buttonStates['Message'] = jsonData['Message']
					self.buttonStates['STM'] = jsonData['STM']
					self.buttonStates['Clock'] = jsonData['Clock']
					self.buttonStates['Pause'] = jsonData['Pause']
					self.buttonStates['Blackout'] = jsonData['Blackout']

					self.setVariableValues({
						nextTimerName: jsonData.nextTimerName,
						nextTimerDuration: jsonData.nextTimerDuration,
					})

					let updateVariablesFlag = false
					if (!this.compareKeys(self.timers, jsonData.timers)) {
						updateVariablesFlag = true
					}

					self.timers = jsonData.timers

					if (updateVariablesFlag) self.variables()

					for (let x in self.timers) {
						self.setVariableValues({
							[`timer_${x}_name`]: self.timers[x].name,
							[`timer_${x}_duration`]: self.timers[x].duration,
						})
					}

					self.checkFeedbacks('colors', 'status', 'timerName', 'timerDuration', 'timerBackground')
				} catch (e) {
					console.error(e.message)
					return
				}
			})
			self.socket.on('end', function () {
				self.log('debug', 'end')
			})
		}
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
				label: 'Target port (Default: 4778)',
				default: '4778',
				width: 6,
				regex: Regex.PORT,
			},
		]
	}

	actions() {
		let actions = {
			FireNext: {
				name: 'Fire the next timer',
				options: [],
				callback: this.actionCallback.bind(this),
			},
			CueNext: {
				name: 'Cue next',
				options: [],
				callback: this.actionCallback.bind(this),
			},
			CueCurrent: {
				name: 'Cue Current',
				options: [],
				callback: this.actionCallback.bind(this),
			},
			Pause: {
				name: 'Pause',
				options: [],
				callback: this.actionCallback.bind(this),
			},
			Restart: {
				name: 'Restart',
				options: [],
				callback: this.actionCallback.bind(this),
			},
			Reset: {
				name: 'Reset',
				options: [],
				callback: this.actionCallback.bind(this),
			},
			Revert: {
				name: 'Revert',
				options: [],
				callback: this.actionCallback.bind(this),
			},
			AddSpeed: {
				name: 'Increase speed by 5%',
				options: [],
				callback: this.actionCallback.bind(this),
			},
			SubSpeed: {
				name: 'Decrease speed by 5%',
				options: [],
				callback: this.actionCallback.bind(this),
			},
			AddMinute: {
				name: 'Add 1 minute',
				options: [],
				callback: this.actionCallback.bind(this),
			},
			SubMinute: {
				name: 'Subtract 1 minute',
				options: [],
				callback: this.actionCallback.bind(this),
			},
			Blackout: {
				name: 'Blackout',
				options: [],
				callback: this.actionCallback.bind(this),
			},
			Fullscreen: {
				name: 'Fullscreen',
				options: [],
				callback: this.actionCallback.bind(this),
			},
			NDI: {
				name: 'NDI',
				options: [],
				callback: this.actionCallback.bind(this),
			},
			Message: {
				name: 'Message',
				options: [],
				callback: this.actionCallback.bind(this),
			},
			Clock: {
				name: 'Clock',
				options: [],
				callback: this.actionCallback.bind(this),
			},
			STM: {
				name: 'Single Timer Mode',
				options: [],
				callback: this.actionCallback.bind(this),
			},
			MoveNextUp: {
				name: 'Move Next Up',
				options: [],
				callback: this.actionCallback.bind(this),
			},
			MoveNextDown: {
				name: 'Move Next Down',
				options: [],
				callback: this.actionCallback.bind(this),
			},
			FireTimerWithID: {
				name: 'Fire Timer with ID',
				options: [
					{
						type: 'textinput',
						label: 'ID',
						id: 'Key',
						default: '1',
					},
				],
				callback: this.actionCallback.bind(this),
			},
			CueTimerWithID: {
				name: 'Cue Timer with ID',
				options: [
					{
						type: 'textinput',
						label: 'ID',
						id: 'Key',
						default: '1',
					},
				],
				callback: this.actionCallback.bind(this),
			},
			SetDuration: {
				name: 'Set Duration',
				options: [
					{
						type: 'textinput',
						label: 'New duration (hh:mm:ss)',
						id: 'Key',
						default: '00:10:00',
					},
				],
				callback: this.actionCallback.bind(this),
			},
			AddXMinutes: {
				name: 'Add X Minutes',
				options: [
					{
						type: 'textinput',
						label: 'Time span to be added in minutes',
						id: 'Key',
						default: '1',
					},
				],
				callback: this.actionCallback.bind(this),
			},
			SubXMinutes: {
				name: 'Subtract X Minutes',
				options: [
					{
						type: 'textinput',
						label: 'Time span to be subtracted in minutes',
						id: 'Key',
						default: '1',
					},
				],
				callback: this.actionCallback.bind(this),
			},
		}

		this.setActionDefinitions(actions)
	}

	actionCallback(action) {
		var cmd = ''
		var terminationChar = '$'

		cmd = action.actionId
		if (action.options) {
			cmd += '#' + action.options.Key
		}

		cmd += terminationChar
		if (cmd !== undefined && cmd != terminationChar) {
			if (this.socket !== undefined && this.socket.isConnected) {
				this.socket.send(cmd)
			}
		}
	}

	variables() {
		var self = this

		var variables = [
			{ name: 'Hours', variableId: 'hours' },
			{ name: 'Minutes', variableId: 'minutes' },
			{ name: 'Seconds', variableId: 'seconds' },
			{ name: 'Name', variableId: 'name' },
			{ name: 'Speed', variableId: 'speed' },
			{ name: 'End Time', variableId: 'endTime' },
			{ name: 'Next Timer Name', variableId: 'nextTimerName' },
			{ name: 'Next Timer Duration', variableId: 'nextTimerDuration' },
		]

		for (let x in self.timers) {
			variables.push({ name: `Timer ${x} Name`, variableId: `timer_${x}_name` })
			variables.push({ name: `Timer ${x} Duration`, variableId: `timer_${x}_duration` })
		}

		self.setVariableDefinitions(variables)
	}

	feedbacks() {
		var self = this
		var feedbacks = {
			colors: {
				type: 'advanced',
				name: 'Main counter Colors from timer',
				description: 'Foreground and background colors of the timer',
				options: [],
				callback: function (_feedback) {
					return { color: self.fgColor, bgcolor: self.bgColor }
				},
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
							{ id: 'NDI', label: 'NDI' },
							{ id: 'Message', label: 'Message' },
							{ id: 'STM', label: 'Single Timer Mode' },
							{ id: 'Clock', label: 'Clock' },
							{ id: 'Pause', label: 'Pause' },
							{ id: 'Blackout', label: 'Blackout' },
						],
					},
				],
				defaultStyle: {
					color: combineRgb(255, 255, 255),
					bgcolor: combineRgb(255, 165, 0),
				},
				callback: function (feedback) {
					return self.buttonStates[feedback.options.Key]
				},
			},
			timerName: {
				type: 'advanced',
				name: 'ID timer Name',
				description: 'Timer Name with ID',
				options: [
					{
						type: 'textinput',
						label: 'ID',
						id: 'Key',
						default: '1',
					},
				],
				callback: function (feedback) {
					if (feedback.options.Key in self.timers) {
						return { text: self.timers[feedback.options.Key].name }
					}
					return {}
				},
			},
			timerDuration: {
				type: 'advanced',
				name: 'ID timer Duration',
				description: 'Timer Duration with ID',
				options: [
					{
						type: 'textinput',
						label: 'ID',
						id: 'Key',
						default: '1',
					},
				],
				callback: function (feedback) {
					if (feedback.options.Key in self.timers) {
						return { text: self.timers[feedback.options.Key].duration }
					}
					return {}
				},
			},
			timerBackground: {
				type: 'advanced',
				name: 'ID timer Background',
				description: 'Timer Background with ID',
				options: [
					{
						type: 'textinput',
						label: 'ID',
						id: 'Key',
						default: '1',
					},
				],
				callback: function (feedback) {
					if (feedback.options.Key in self.timers) {
						let tempBg = self.hexToRgb(self.timers[feedback.options.Key].bg.substr(1))
						return { bgcolor: combineRgb(tempBg.r, tempBg.g, tempBg.b) }
					}
					return { bgcolor: combineRgb(0, 0, 0) }
				},
			},
		}
		self.setFeedbackDefinitions(feedbacks)
	}

	presets() {
		var self = this
		self.setPresetDefinitions(presets.getPresets(self.label))
	}

	async destroy() {
		var self = this

		if (self.socket !== undefined) {
			self.socket.destroy()
		}

		self.log('debug', `destroy ${self.id}`)
	}
}
class MessageBuffer {
	constructor(delimiter) {
		this.delimiter = delimiter
		this.buffer = ''
	}

	isFinished() {
		if (this.buffer.length === 0 || this.buffer.indexOf(this.delimiter) === -1) {
			return true
		}
		return false
	}

	push(data) {
		this.buffer += data
	}

	getMessage() {
		const delimiterIndex = this.buffer.indexOf(this.delimiter)
		if (delimiterIndex !== -1) {
			const message = this.buffer.slice(0, delimiterIndex)
			this.buffer = this.buffer.replace(message + this.delimiter, '')
			return message
		}
		return null
	}

	handleData() {
		const message = this.getMessage()
		return message
	}
}

runEntrypoint(CueTimerInstance, [])
