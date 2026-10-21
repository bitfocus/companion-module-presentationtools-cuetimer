import { combineRgb } from '@companion-module/base'
import { getListNumberedChoices } from './choices.js'
import { BUTTON_STATES, hexToRgb } from './utils.js'

/** @param ctx the instance, or a plain stub with the same fields (tests) */
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
					choices: BUTTON_STATES,
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
