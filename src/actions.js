import { getListNumberedChoices } from './choices.js'
import { ALL_CAPABILITIES } from './state.js'

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

/**
 * @param ctx the instance, or a plain stub with the same fields (tests). `ctx.capabilities`
 * lists what the connected CueTimer offers: output and list actions exist only with the app.
 */
export function getActionDefinitions(ctx) {
	const callback = (action) => ctx.actionCallback(action)
	const simple = (name) => ({ name, options: [], callback })
	const withState = (name) => ({ name, options: [stateOption()], callback })
	const capabilities = ctx.capabilities ?? ALL_CAPABILITIES

	const actions = {
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
		Message: simple('Message'),
		Clock: simple('Clock'),
		STM: simple('Single Timer Mode'),
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
	}

	if (capabilities.includes('outputs')) {
		Object.assign(actions, {
			Fullscreen: withState('Fullscreen'),
			Preview: withState('Preview'),
			Presenter: withState('Presenter'),
			NDI: simple('NDI'),
			MultitimerPreview: withState('Multitimer Preview'),
			MultitimerFullscreen: withState('Multitimer Fullscreen'),
			MultitimerNDI: simple('Multitimer NDI'),
		})
	}

	if (capabilities.includes('lists')) {
		Object.assign(actions, {
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
				description: 'Activate the list set in the connection settings',
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
		})
	}

	return actions
}
