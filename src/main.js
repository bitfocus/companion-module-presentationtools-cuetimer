import { InstanceBase, InstanceStatus } from '@companion-module/base'
import { getActionDefinitions } from './actions.js'
import { cloudUrl, getConfigFields } from './config.js'
import { CueTimerConnection } from './connection.js'
import { buildEngineCommand, isPlaceholderList } from './engine-commands.js'
import { getFeedbackDefinitions } from './feedbacks.js'
import { getPresets } from './presets.js'
import { capabilitiesForConfig, capabilitiesForMode, emptyState, mapState } from './state.js'
import { UpgradeScripts } from './upgrades.js'
import { getVariableDefinitions, timerVariableMap } from './variables.js'

export { UpgradeScripts }

/** Every variable without live data, as after a config change or a disconnect */
function blankVariableValues() {
	return {
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
		listNumber: '',
	}
}

const STATUS = {
	ok: InstanceStatus.Ok,
	connecting: InstanceStatus.Connecting,
	disconnected: InstanceStatus.Disconnected,
	connection_failure: InstanceStatus.ConnectionFailure,
	unknown_error: InstanceStatus.UnknownError,
}

export default class CueTimerInstance extends InstanceBase {
	constructor(internal) {
		super(internal)
		this.capabilities = []
		this.connection = null
		Object.assign(this, emptyState())
	}

	async init(config) {
		await this.configUpdated(config)
	}

	async configUpdated(config) {
		this.log('debug', 'configUpdated')
		this.config = config

		// Reset state before the definitions are built, so they do not reflect the previous config.
		// The app's actions and presets exist before the handshake, so buttons stay valid while it is closed.
		Object.assign(this, emptyState())
		this.capabilities = capabilitiesForConfig(config)
		this.lastStatus = null
		this.lastTimerCollisionKey = undefined

		this.actions()
		this.feedbacks()
		this.presets()
		this.variables()
		this.setVariableValues(blankVariableValues())

		this.connect()
	}

	/** The engine base URL and handshake for the current config, or null with the reason */
	connectionTarget() {
		const config = this.config
		const name = config.name || 'Companion'
		if (config.mode === 'cloud') {
			const listId = String(config.listId ?? '').trim()
			if (!listId) return { error: 'A cue list ID is required for CueTimer Cloud' }
			// The Cloud endpoint is fixed; CUETIMER_CLOUD_URL (environment or .env file) overrides it for development.
			const base = cloudUrl()
			return { base, query: { scheduleKey: listId, name } }
		}
		if (!config.host || !config.port) return { error: 'Host and port are required' }
		const query = { name }
		// A GUID pins the connection to that list; '' or a placeholder number follows the active list
		if (config.list && !isPlaceholderList(config.list)) query.scheduleKey = config.list
		else query.followActiveList = '1'
		return { base: `http://${config.host}:${config.port}`, query }
	}

	connect() {
		this.connection?.destroy()
		this.connection = null
		const target = this.connectionTarget()
		if (target.error) {
			this.reportStatus(InstanceStatus.BadConfig, target.error)
			return
		}
		const connection = new CueTimerConnection({ log: (level, message) => this.log(level, message) })
		this.connection = connection
		connection.on('status', (status, message) => {
			if (connection !== this.connection) return
			this.lastStatus = status
			if (status === 'ok') this.refreshStatus()
			else this.reportStatus(STATUS[status] ?? InstanceStatus.UnknownError, message)
			if (status !== 'ok') this.resetLiveState()
		})
		connection.on('connectResponse', (data) => {
			if (connection !== this.connection) return
			this.applyConnectResponse(data)
		})
		connection.on('state', (snapshot) => {
			if (connection !== this.connection) return
			try {
				this.applyState(snapshot)
			} catch (e) {
				this.log('debug', `Failed to apply a snapshot: ${e.message}`)
			}
		})
		connection.connect(target.base, target.query)
	}

	/** After a disconnect the feedbacks and variables must not keep showing the last live data */
	resetLiveState() {
		if (!this.snapshot) return
		const values = blankVariableValues()
		for (let i = 0; i < this.lists.length; i++) {
			values[`list_${i + 1}_name`] = ''
			values[`list_${i + 1}_display_link`] = ''
			values[`list_${i + 1}_control_link`] = ''
		}
		for (const [, base] of timerVariableMap(Object.keys(this.timers)).bases) {
			values[`timer_${base}_name`] = ''
			values[`timer_${base}_duration`] = ''
		}
		Object.assign(this, emptyState())
		this.setVariableValues({ ...values, listGUID: '', listDisplayLink: '', listControlLink: '' })
		this.checkFeedbacks('activeList', 'colors', 'status', 'timerName', 'timerDuration', 'timerBackground')
	}

	applyConnectResponse(data) {
		if (typeof data?.mode !== 'string') return
		const capabilities = capabilitiesForMode(data.mode)
		if (JSON.stringify(capabilities) !== JSON.stringify(this.capabilities)) {
			this.capabilities = capabilities
			this.log('info', `Connected to CueTimer in ${data.mode} mode`)
			this.actions()
			this.presets()
			this.feedbacks()
		}
	}

	/** Companion logs every status update, so an unchanged status is not reported again */
	reportStatus(status, message = null) {
		const last = this.reportedStatus
		if (last && last.status === status && last.message === message) return
		this.reportedStatus = { status, message }
		this.updateStatus(status, message)
	}

	/** Ok, or the warning that applies to the current snapshot; only while the connection is ready */
	refreshStatus() {
		if (this.lastStatus !== 'ok') return
		if (this.syncError) {
			this.reportStatus(
				InstanceStatus.UnknownWarning,
				`Cloud sync needs attention in the CueTimer control page: ${this.syncError}`,
			)
			return
		}
		const configured = this.config.mode !== 'cloud' ? this.config.list : ''
		if (configured && !isPlaceholderList(configured) && this.snapshot && this.snapshot.list?.id !== configured) {
			this.reportStatus(InstanceStatus.UnknownWarning, 'Selected list not found, active list will be used')
			return
		}
		// A placeholder number beyond the catalog never resolves: the connection follows the active list
		if (
			configured &&
			isPlaceholderList(configured) &&
			this.lists.length > 0 &&
			parseInt(configured, 10) > this.lists.length
		) {
			this.reportStatus(InstanceStatus.UnknownWarning, 'Selected list not found, active list will be used')
			return
		}
		this.reportStatus(InstanceStatus.Ok)
	}

	applyState(snapshot) {
		const mapped = mapState(snapshot)
		const listsChanged = JSON.stringify(mapped.lists) !== JSON.stringify(this.lists)
		const timersChanged = !this.compareKeys(mapped.timers, this.timers)
		this.snapshot = snapshot
		this.lists = mapped.lists
		this.timers = mapped.timers
		this.buttonStates = mapped.buttonStates
		this.fgColor = mapped.fgColor
		this.bgColor = mapped.bgColor
		this.syncError = mapped.syncError

		if (listsChanged) {
			this.log('debug', `Lists changed: ${JSON.stringify(mapped.lists.map((l) => l.title))}`)
			if (this.resolvePlaceholderList()) return
			this.variables()
			this.actions()
			this.feedbacks()
			this.checkFeedbacks('activeList')
		}
		if (timersChanged && !listsChanged) this.variables()

		const { bases, collisions } = timerVariableMap(Object.keys(this.timers))
		this.reportTimerCollisions(collisions)
		const timerValues = {}
		for (const [visibleId, base] of bases) {
			timerValues[`timer_${base}_name`] = this.timers[visibleId].name
			timerValues[`timer_${base}_duration`] = this.timers[visibleId].duration
		}
		this.setVariableValues({ ...mapped.variables, ...this.listVariableValues(mapped), ...timerValues })

		this.refreshStatus()
		this.checkFeedbacks('colors', 'status', 'timerName', 'timerDuration', 'timerBackground')
	}

	/**
	 * A list chosen before CueTimer was reachable is stored as its number; once the catalog
	 * is known the number becomes that list's id and the connection is pinned to it.
	 * @returns true when the connection is being re-established
	 */
	resolvePlaceholderList() {
		if (this.config.mode === 'cloud' || !isPlaceholderList(this.config.list)) return false
		const index = parseInt(this.config.list, 10) - 1
		if (index < 0 || index >= this.lists.length) return false
		this.config.list = this.lists[index].id
		this.log('debug', `List ${index + 1} is ${this.config.list}; pinning the connection to it`)
		this.saveConfig(this.config)
		// Define the catalog's variables first: reconnecting blanks them in resetLiveState
		this.variables()
		this.connect()
		return true
	}

	/** The list variables for this snapshot: the shown list and the catalog */
	listVariableValues(mapped) {
		const values = {
			listNumber: mapped.listNumber,
			listName: mapped.listTitle,
			listGUID: mapped.listId,
		}
		const current = this.lists.find((l) => l.id === mapped.listId)
		values.listDisplayLink = current?.displayLink ?? ''
		values.listControlLink = current?.controlLink ?? ''
		for (let i = 0; i < this.lists.length; i++) {
			values[`list_${i + 1}_name`] = `${i + 1} - ${this.lists[i].title}`
			values[`list_${i + 1}_display_link`] = this.lists[i].displayLink
			values[`list_${i + 1}_control_link`] = this.lists[i].controlLink
		}
		return values
	}

	reportTimerCollisions(collisions) {
		// Warn once per distinct set of collisions, not on every snapshot
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

	compareKeys(a, b) {
		return JSON.stringify(Object.keys(a).sort()) === JSON.stringify(Object.keys(b).sort())
	}

	getConfigFields() {
		return getConfigFields(this)
	}

	actions() {
		this.setActionDefinitions(getActionDefinitions(this))
	}

	async actionCallback(action) {
		const command = buildEngineCommand(action, {
			config: this.config,
			snapshot: this.snapshot,
			lists: this.lists,
			capabilities: this.capabilities,
			log: (level, message) => this.log(level, message),
		})
		if (!command) return
		if (!this.connection) return
		this.log('debug', `Sending ${command.command} ${JSON.stringify(command.data)}`)
		const result = await this.connection.sendCommand(command)
		if (!result.success) {
			this.log(
				'warn',
				`${command.command} failed: ${result.error ?? 'unknown'}${result.message ? ` (${result.message})` : ''}`,
			)
		}
	}

	variables() {
		this.setVariableDefinitions(getVariableDefinitions(this))
	}

	feedbacks() {
		this.setFeedbackDefinitions(getFeedbackDefinitions(this))
	}

	presets() {
		const { structure, presets } = getPresets(this.label, this.capabilities)
		this.setPresetDefinitions(structure, presets)
	}

	async destroy() {
		this.connection?.destroy()
		this.connection = null
		this.log('debug', `destroy ${this.id}`)
	}
}
