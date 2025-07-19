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
		self.log('debug', `configUpdated`)

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
			scheduleOffset: '00:00:00',
			scheduleOffsetStatus: '',
			listName: '',
			listNumber: config.list,
		})
		self.bgColor = combineRgb(0, 0, 0)
		self.fgColor = combineRgb(255, 255, 255)
		self.buttonStates = {
			Fullscreen: false,
			Preview: false,
			Presenter: false,
			NDI: false,
			Message: false,
			STM: false,
			Clock: false,
			Pause: false,
			Blackout: false,
			MultiviewPreview: false,
			MultiviewFullscreen: false,
			MultiviewNDI: false,
		}
		self.lists = []
		self.timers = {}
	}

	async init(config) {
		this.configUpdated(config);
	}

	compareKeys(a, b) {
		return JSON.stringify(Object.keys(a).sort()) === JSON.stringify(Object.keys(b).sort())
	}

	selectList(list) {
		var self = this

		if (self.socket !== undefined && self.socket.isConnected) {
			self.log('debug', `selectList: ${list}`)
			self.socket.send(`select_list#${list}$`)
		} else {
			self.log('debug', 'Socket not connected, cannot select list')
		}
	}

	isListChanged(jsonData){
		return JSON.stringify(this.lists) != JSON.stringify(jsonData.lists) || 
				jsonData.listNumber != this.getVariableValue('listNumber') ||
				jsonData.listGUID != this.getVariableValue('listGUID')
	}

	initTCP() {
		var self = this

		if (self.socket !== undefined) {
			self.socket.destroy()
			delete self.socket
		}

		if (self.config.host && self.config.port) {
			self.socket = new TCPHelper(self.config.host, self.config.port)

			self.socket.on('error', (_err) => {
				self.updateStatus(InstanceStatus.UnknownError)
			})

			self.socket.on('connect', () => {
				self.updateStatus(InstanceStatus.Ok)
				self.log('debug', `Connected to ${self.config.host}:${self.config.port}`)
				self.lists = []
			})
			
			self.socket.on('data', (data) => {
				let received = new MessageBuffer('$')
				received.push(data)
				let message = received.handleData()

				try {
					let jsonData = JSON.parse(message)

					if(jsonData.lists && self.isListChanged(jsonData)){
						self.log('debug', `Lists changed, updating lists ${JSON.stringify(jsonData.lists)}`)						
						self.lists = jsonData.lists
							
							if(self.isIntegerString(self.config.list)){
								// If the config.list is an integer string, it means it was set to a placeholder list
								self.log('debug', `Selected list is a placeholder list with index: ${self.config.list}`)
								if(self.lists.length >= parseInt(self.config.list)){
									// Found the current index in the new list - update config to new GUID
									self.log('debug', `Selected placeholder list found at index: ${self.config.list}`)
									self.config.list = self.lists[parseInt(self.config.list) - 1].guid
									self.saveConfig(self.config)
								}
							}
							
							if(self.config.list == '' || self.lists.findIndex(item => item.guid === self.config.list) != -1){
								
								if(self.config.list == '' || self.config.list != jsonData.listGUID){
									self.selectList(self.config.list)
									self.updateStatus(InstanceStatus.Ok)
								}
							}
							else{
								self.updateStatus(
									InstanceStatus.UnknownWarning, 
									`Selected list not found, active list will be used`)
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

					let tempFg = self.hexToRgb(jsonData.fg.substr(0, 1) + jsonData.fg.substr(3))
					self.fgColor = combineRgb(tempFg.r, tempFg.g, tempFg.b)
					let tempBg = self.hexToRgb(jsonData.bg.substr(0, 1) + jsonData.bg.substr(3))
					self.bgColor = combineRgb(tempBg.r, tempBg.g, tempBg.b)

					self.buttonStates['Fullscreen'] = jsonData['Fullscreen']
					self.buttonStates['Preview'] = jsonData['Preview']
					self.buttonStates['Presenter'] = jsonData['Presenter']
					self.buttonStates['NDI'] = jsonData['NDI']
					self.buttonStates['Message'] = jsonData['Message']
					self.buttonStates['STM'] = jsonData['STM']
					self.buttonStates['Clock'] = jsonData['Clock']
					self.buttonStates['Pause'] = jsonData['Pause']
					self.buttonStates['Blackout'] = jsonData['Blackout']
					self.buttonStates['MultiviewPreview'] = jsonData['MultiviewPreview']
					self.buttonStates['MultiviewFullscreen'] = jsonData['MultiviewFullscreen']
					self.buttonStates['MultiviewNDI'] = jsonData['MultiviewNDI']
					self.setVariableValues({
						nextTimerName: jsonData.nextTimerName,
						nextTimerDuration: jsonData.nextTimerDuration,
						scheduleOffset: jsonData.scheduleOffset,
						scheduleOffsetStatus: jsonData.scheduleOffsetStatus,
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

	getListVariablesDefinitions() {
		let self = this
		let variables = [
			{ name: 'List Name', variableId: 'listName' },
			{ name: 'List Number', variableId: 'listNumber' },
			{ name: 'List GUID', variableId: 'listGUID' },
		]

		// Loop over self.lists and add variables for each list
		if (self.lists && self.lists.length > 0) {
			for (let i = 0; i < self.lists.length; i++) {
				variables.push({
					name: `List ${i + 1} Name`,
					variableId: `list_${i + 1}_name`,
				})
			}
		}
		
		return variables
	}

	updateListVariablesValues(listNumber) {
		var self = this

		let listIndex = listNumber - 1
		self.setVariableValues({listNumber: listNumber })
		self.setVariableValues({listName: self.lists[listIndex]?.title })
		self.setVariableValues({listGUID: self.lists[listIndex]?.guid })
		

		// Update list variables
		if (self.lists && self.lists.length > 0) {
			for (let i = 0; i < self.lists.length; i++) {
				self.setVariableValues({
					[`list_${i + 1}_name`]: `${i + 1} - ${self.lists[i].title}`,
				})
			}
		}
	}

	isIntegerString(str) {
		return /^-?\d+$/.test(str);
	}

	getListsChoises(arr) {
		let result = []
		if(arr){
			result = arr.map((item, index) => ({
				id: item.guid,
				label: `${index + 1}- ${item.title}`
			}));
		}

		// Add placeholders if the array has less than 10 items
		while (result.length < 10) {
			const index = result.length + 1;
			result.push({
				id: index.toString(),
				label: `${index}- `
			});
		}

		return result;
	}

	getListNumberedChoices(includePreviousAndNext = false) {
		let result = []

		if(this.config.list == '' && includePreviousAndNext){
			result.push({ id: 'Previous', label: 'Previous List' })
			result.push({ id: 'Next', label: 'Next List' })
		}

		// Add numbered list options (1-10) with names if available
		for (let i = 1; i <= 10; i++) {
			let label = `${i}`
			if (this.lists && this.lists[i - 1]) {
				label = `${i} - ${this.lists[i - 1]?.title}`
			} else {
				label = `${i} - `
			}
			result.push({
				id: i.toString(),
				label: label
			})
		}

		return result
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
				choices: [{id: '', label: 'Active List'}].concat(this.getListsChoises(this.lists))
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
				label: 'Check that the port in CueTimer matches the target port shown here. To change the default port in CueTimer, go to Preferences/Triggers/Companion. Note that for earlier versions of CueTimer, (2.5 and below) the default port is 4778. We recommend using port 31601 for connection. If this port is not available, try something else in the same range.',
			}
		]
	}

	actions() {
		let actions = {
			FireNext: {
				name: 'Start',
				options: [],
				callback: this.actionCallback.bind(this),
			},
			CueNext: {
				name: 'Stop',
				options: [],
				callback: this.actionCallback.bind(this),
			},
			CueCurrent: {
				name: 'Stop and go back',
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
			Undo: {
				name: 'Undo',
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
				options: [{
					type: 'dropdown',
					label: 'State',
					id: 'Key',
					default: 'toggle',
					choices: [
						{id: "on", label: "On"},
						{id: "off", label: "Off"},
						{id: "toggle", label: "Toggle"},
					],
				}],
				callback: this.actionCallback.bind(this),
			},
			Preview: {
				name: 'Preview',
				options: [{
					type: 'dropdown',
					label: 'State',
					id: 'Key',
					default: 'toggle',
					choices: [
						{id: "on", label: "On"},
						{id: "off", label: "Off"},
						{id: "toggle", label: "Toggle"},
					],
				}],
				callback: this.actionCallback.bind(this),
			},
			Presenter: {
				name: 'Presenter',
				options: [{
					type: 'dropdown',
					label: 'State',
					id: 'Key',
					default: 'toggle',
					choices: [
						{id: "on", label: "On"},
						{id: "off", label: "Off"},
						{id: "toggle", label: "Toggle"},
					],
				}],
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
			MultiviewPreview: {
				name: 'Multiview Preview',
				options: [{
					type: 'dropdown',
					label: 'State',
					id: 'Key',
					default: 'toggle',
					choices: [
						{id: "on", label: "On"},
						{id: "off", label: "Off"},
						{id: "toggle", label: "Toggle"},
					],
				}],
				callback: this.actionCallback.bind(this),
			},
			MultiviewFullscreen: {
				name: 'Multiview Fullscreen',
				options: [{
					type: 'dropdown',
					label: 'State',
					id: 'Key',
					default: 'toggle',
					choices: [
						{id: "on", label: "On"},
						{id: "off", label: "Off"},
						{id: "toggle", label: "Toggle"},
					],
				}],
				callback: this.actionCallback.bind(this),
			},
			MultiviewNDI: {
				name: 'Multiview NDI',
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
				name: 'Start timer with ID',
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
			InitList: {
				name: 'Initialize List',
				options: [],
				callback: this.actionCallback.bind(this),
			},
			InitEndTimeTimer: {
				name: 'Initialize and start a new EndTime timer',
				options: [
					{
						type: 'textinput',
						label: 'EndTime hh:mm:ss',
						id: 'Key',
						default: '',
						useVariables: true,
					},
				],
				callback: this.actionCallback.bind(this),
			},

			ActivateNextList: {
				name: 'Activate next list',
				description: 'Activate the next list',
				options: [],
				callback: this.actionCallback.bind(this),
			},

			ActivatePreviousList: {
				name: 'Activate previous list',
				description: 'Activate the previous list',
				options: [],
				callback: this.actionCallback.bind(this),
			},

			ActivateThisList: {
				name: 'Activate this list',
				description: 'Activate the list with the GUID set in the configuration settings',
				options: [],
				callback: this.actionCallback.bind(this),
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
						choices: this.getListNumberedChoices(true),
					},
				],
				callback: this.actionCallback.bind(this),
			},
		}

		this.setActionDefinitions(actions)
	}

	async actionCallback(action) {
		var cmd = ''
		var terminationChar = '$'

		if (action.actionId === 'ActivateThisList') {
			if (this.config.list && this.config.list !== '') {
				cmd = `ActivateListByGUID#${this.config.list}${terminationChar}`
			}
		}
		else if (action.actionId === 'ActivateListByNumber') {
			const selection = action.options.Key
			
			if (selection === 'Previous') {
				cmd = `ActivatePreviousList${terminationChar}`
				this.log('debug', 'Activating previous list')
			} else if (selection === 'Next') {
				cmd = `ActivateNextList${terminationChar}`
				this.log('debug', 'Activating next list')
			} else {
				const listIndex = parseInt(selection) - 1 // Convert to 0-based index
				if (this.lists && this.lists.length > listIndex && listIndex >= 0) {
					const listGuid = this.lists[listIndex].guid
					cmd = `ActivateListByGUID#${listGuid}${terminationChar}`
					this.log('debug', `Activating list by index ${listIndex + 1} with GUID: ${listGuid}`)
				} else {
					this.log('warn', `List index ${listIndex + 1} is out of range or lists not available`)
					return
				}
			}
		} 
		else{
			// For all other actions, we use the actionId as the command
			cmd = action.actionId
			if (action.options) {
				cmd += '#' + await this.parseVariablesInString(action.options.Key)
			}
		}

		cmd += terminationChar
		if (cmd !== undefined && cmd != terminationChar) {
			if (this.socket !== undefined && this.socket.isConnected) {
				this.log('debug', `Sending ${cmd}`)
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
			{ name: 'Schedule Offset', variableId: 'scheduleOffset' },
			{ name: 'Schedule Offset Status', variableId: 'scheduleOffsetStatus' },
		]

		for (let x in self.timers) {
			variables.push({ name: `Timer ${x} Name`, variableId: `timer_${x}_name` })
			variables.push({ name: `Timer ${x} Duration`, variableId: `timer_${x}_duration` })
		}

		variables = variables.concat(self.getListVariablesDefinitions())
		
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
							{ id: 'Preview', label: 'Preview' },
							{ id: 'Presenter', label: 'Presenter' },
							{ id: 'NDI', label: 'NDI' },
							{ id: 'Message', label: 'Message' },
							{ id: 'STM', label: 'Single Timer Mode' },
							{ id: 'Clock', label: 'Clock' },
							{ id: 'Pause', label: 'Pause' },
							{ id: 'Blackout', label: 'Blackout' },
							{ id: 'MultiviewPreview', label: 'Multiview Preview' },
							{ id: 'MultiviewFullscreen', label: 'Multiview Fullscreen' },
							{ id: 'MultiviewNDI', label: 'Multiview NDI' },
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
						choices: self.getListNumberedChoices(),
					},
				],
				defaultStyle: {
					color: combineRgb(255, 255, 255),
					bgcolor: '#9A9A00',
				},
				callback: function (feedback) {
					const targetIndex = parseInt(feedback.options.Key)
					return self.lists[targetIndex - 1]?.isActive
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
