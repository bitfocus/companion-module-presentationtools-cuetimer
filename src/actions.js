import { getListNumberedChoices } from './choices.js'
import { TERMINATOR } from './utils.js'

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

/** @param ctx the instance, or a plain stub with the same fields (tests) */
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
