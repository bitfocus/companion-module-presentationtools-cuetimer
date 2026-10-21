import icons from './icons.js'
export function getPresets(instanceLabel) {
	// API 2.x: presets are declared per section; a section's preset ids are the keys of its presets object
	const sections = [
		{
			id: 'commands',
			name: 'Commands',
			presets: {
				FireNext: {
					type: 'simple',
					name: 'Start',
					style: {
						bgcolor: 0,

						png64: icons.FireNext,
						pngalignment: 'center:top',

						text: 'Start',
						alignment: 'center:bottom',
						size: '14',
						color: 16777215,
					},
					steps: [
						{
							down: [{ actionId: 'FireNext', options: {} }],
							up: [],
						},
					],
					feedbacks: [],
				},
				CueNext: {
					type: 'simple',
					name: 'Stop',
					style: {
						bgcolor: 0,

						png64: icons.CueNext,
						pngalignment: 'center:top',

						text: 'Stop',
						alignment: 'center:bottom',
						size: '14',
						color: 16777215,
					},
					steps: [
						{
							down: [{ actionId: 'CueNext', options: {} }],
							up: [],
						},
					],
					feedbacks: [],
				},
				Pause: {
					type: 'simple',
					name: 'Pause',
					style: {
						bgcolor: 0,

						png64: icons.Pause,
						pngalignment: 'center:top',

						text: 'Pause',
						alignment: 'center:bottom',
						size: '14',
						color: 16777215,
					},
					steps: [
						{
							down: [{ actionId: 'Pause', options: {} }],
							up: [],
						},
					],
					feedbacks: [
						{
							feedbackId: 'status',
							options: {
								Key: 'Pause',
							},
							style: {
								color: 16777215,
								bgcolor: 16753920,
							},
						},
					],
				},
				Restart: {
					type: 'simple',
					name: 'Restart',
					style: {
						bgcolor: 0,

						png64: icons.Restart,
						pngalignment: 'center:top',

						text: 'Restart',
						alignment: 'center:bottom',
						size: '14',
						color: 16777215,
					},
					steps: [
						{
							down: [{ actionId: 'Restart', options: {} }],
							up: [],
						},
					],
					feedbacks: [],
				},
				Undo: {
					type: 'simple',
					name: 'Undo',
					style: {
						bgcolor: 0,

						png64: icons.Undo,
						pngalignment: 'center:top',

						text: 'Undo',
						alignment: 'center:bottom',
						size: '14',
						color: 16777215,
					},
					steps: [
						{
							down: [{ actionId: 'Undo', options: {} }],
							up: [],
						},
					],
					feedbacks: [],
				},
				AddSpeed: {
					type: 'simple',
					name: 'Increase speed by 5%',
					style: {
						bgcolor: 0,

						png64: icons.AddSpeed,
						pngalignment: 'center:top',

						text: 'Speed',
						alignment: 'center:bottom',
						size: '14',
						color: 16777215,
					},
					steps: [
						{
							down: [{ actionId: 'AddSpeed', options: {} }],
							up: [],
						},
					],
					feedbacks: [],
				},
				SubSpeed: {
					type: 'simple',
					name: 'Decrease speed by 5%',
					style: {
						bgcolor: 0,

						png64: icons.SubSpeed,
						pngalignment: 'center:top',

						text: 'Speed',
						alignment: 'center:bottom',
						size: '14',
						color: 16777215,
					},
					steps: [
						{
							down: [{ actionId: 'SubSpeed', options: {} }],
							up: [],
						},
					],
					feedbacks: [],
				},
				AddMinute: {
					type: 'simple',
					name: 'Add 1 Minute',
					style: {
						bgcolor: 0,

						png64: icons.AddMinute,
						pngalignment: 'center:top',

						text: 'Minute',
						alignment: 'center:bottom',
						size: '14',
						color: 16777215,
					},
					steps: [
						{
							down: [{ actionId: 'AddMinute', options: {} }],
							up: [],
						},
					],
					feedbacks: [],
				},
				SubMinute: {
					type: 'simple',
					name: 'Subtract 1 Minute',
					style: {
						bgcolor: 0,

						png64: icons.SubMinute,
						pngalignment: 'center:top',

						text: 'Minute',
						alignment: 'center:bottom',
						size: '14',
						color: 16777215,
					},
					steps: [
						{
							down: [{ actionId: 'SubMinute', options: {} }],
							up: [],
						},
					],
					feedbacks: [],
				},
				Blackout: {
					type: 'simple',
					name: 'Blackout',
					style: {
						bgcolor: 0,

						png64: icons.Blackout,
						pngalignment: 'center:top',

						text: 'Blackout',
						alignment: 'center:bottom',
						size: '14',
						color: 16777215,
					},
					steps: [
						{
							down: [{ actionId: 'Blackout', options: {} }],
							up: [],
						},
					],
					feedbacks: [
						{
							feedbackId: 'status',
							options: {
								Key: 'Blackout',
							},
							style: {
								color: 16777215,
								bgcolor: 16753920,
							},
						},
					],
				},
				Clock: {
					type: 'simple',
					name: 'Clock',
					style: {
						bgcolor: 0,

						png64: icons.Clock,
						pngalignment: 'center:top',

						text: 'Clock',
						alignment: 'center:bottom',
						size: '14',
						color: 16777215,
					},
					steps: [
						{
							down: [{ actionId: 'Clock', options: {} }],
							up: [],
						},
					],
					feedbacks: [
						{
							feedbackId: 'status',
							options: {
								Key: 'Clock',
							},
							style: {
								color: 16777215,
								bgcolor: 16753920,
							},
						},
					],
				},
				Message: {
					type: 'simple',
					name: 'Message',
					style: {
						bgcolor: 0,

						png64: icons.Message,
						pngalignment: 'center:top',

						text: 'Message',
						alignment: 'center:bottom',
						size: '14',
						color: 16777215,
					},
					steps: [
						{
							down: [{ actionId: 'Message', options: {} }],
							up: [],
						},
					],
					feedbacks: [
						{
							feedbackId: 'status',
							options: {
								Key: 'Message',
							},
							style: {
								color: 16777215,
								bgcolor: 16753920,
							},
						},
					],
				},
				Fullscreen: {
					type: 'simple',
					name: 'Full Screen',
					style: {
						bgcolor: 0,
						text: 'FullScreen',
						alignment: 'center:bottom',
						png64: icons.Fullscreen,
						pngalignment: 'center:center',
						size: '14',
						color: 16777215,
					},
					steps: [
						{
							down: [{ actionId: 'Fullscreen', options: { Key: 'toggle' } }],
							up: [],
						},
					],
					feedbacks: [
						{
							feedbackId: 'status',
							options: {
								Key: 'Fullscreen',
							},
							style: {
								color: 16777215,
								bgcolor: 16753920,
							},
						},
					],
				},
				Preview: {
					type: 'simple',
					name: 'Preview',
					style: {
						bgcolor: 0,
						text: 'Preview window',
						alignment: 'center:bottom',
						png64: icons.Preview,
						pngalignment: 'center:center',
						size: '14',
						color: 16777215,
					},
					steps: [
						{
							down: [{ actionId: 'Preview', options: { Key: 'toggle' } }],
							up: [],
						},
					],
					feedbacks: [
						{
							feedbackId: 'status',
							options: {
								Key: 'Preview',
							},
							style: {
								color: 16777215,
								bgcolor: 16753920,
							},
						},
					],
				},
				Presenter: {
					type: 'simple',
					name: 'Presenter',
					style: {
						bgcolor: 0,
						text: 'Presenter window',
						alignment: 'center:bottom',
						png64: icons.Presenter,
						pngalignment: 'center:center',
						size: '14',
						color: 16777215,
					},
					steps: [
						{
							down: [{ actionId: 'Presenter', options: { Key: 'toggle' } }],
							up: [],
						},
					],
					feedbacks: [
						{
							feedbackId: 'status',
							options: {
								Key: 'Presenter',
							},
							style: {
								color: 16777215,
								bgcolor: 16753920,
							},
						},
					],
				},
				MultitimerPreview: {
					type: 'simple',
					name: 'Multitimer Preview',
					style: {
						bgcolor: 0,
						text: 'Multitimer Preview',
						alignment: 'center:bottom',
						png64: icons.Multitimer,
						pngalignment: 'center:center',
						size: '14',
						color: 16777215,
					},
					steps: [
						{
							down: [{ actionId: 'MultitimerPreview', options: { Key: 'toggle' } }],
							up: [],
						},
					],
					feedbacks: [
						{
							feedbackId: 'status',
							options: {
								Key: 'MultitimerPreview',
							},
							style: {
								color: 16777215,
								bgcolor: 16753920,
							},
						},
					],
				},
				MultitimerFullscreen: {
					type: 'simple',
					name: 'Multitimer Fullscreen',
					style: {
						bgcolor: 0,
						text: 'Multitimer Fullscreen',
						alignment: 'center:bottom',
						png64: icons.Multitimer,
						pngalignment: 'center:center',
						size: '14',
						color: 16777215,
					},
					steps: [
						{
							down: [{ actionId: 'MultitimerFullscreen', options: { Key: 'toggle' } }],
							up: [],
						},
					],
					feedbacks: [
						{
							feedbackId: 'status',
							options: {
								Key: 'MultitimerFullscreen',
							},
							style: {
								color: 16777215,
								bgcolor: 16753920,
							},
						},
					],
				},
				MultitimerNDI: {
					type: 'simple',
					name: 'Multitimer NDI',
					style: {
						bgcolor: 0,
						text: 'Multitimer NDI',
						alignment: 'center:bottom',
						png64: icons.Multitimer,
						pngalignment: 'center:center',
						size: '14',
						color: 16777215,
					},
					steps: [
						{
							down: [{ actionId: 'MultitimerNDI', options: {} }],
							up: [],
						},
					],
					feedbacks: [
						{
							feedbackId: 'status',
							options: {
								Key: 'MultitimerNDI',
							},
							style: {
								color: 16777215,
								bgcolor: 16753920,
							},
						},
					],
				},
				NDI: {
					type: 'simple',
					name: 'NDI',
					style: {
						bgcolor: 0,
						text: 'NDI',
						alignment: 'center:center',
						size: '30',
						color: 16777215,
					},
					steps: [
						{
							down: [{ actionId: 'NDI', options: {} }],
							up: [],
						},
					],
					feedbacks: [
						{
							feedbackId: 'status',
							options: {
								Key: 'NDI',
							},
							style: {
								color: 16777215,
								bgcolor: 16753920,
							},
						},
					],
				},
				STM: {
					type: 'simple',
					name: 'Single Mode',
					style: {
						bgcolor: 0,
						text: 'Single Mode',
						alignment: 'center:center',
						size: '18',
						color: 16777215,
					},
					steps: [
						{
							down: [{ actionId: 'STM', options: {} }],
							up: [],
						},
					],
					feedbacks: [
						{
							feedbackId: 'status',
							options: {
								Key: 'STM',
							},
							style: {
								color: 16777215,
								bgcolor: 16753920,
							},
						},
					],
				},
				MoveNextUp: {
					type: 'simple',
					name: 'Move Next Up',
					style: {
						bgcolor: 0,

						png64: icons.Up,
						pngalignment: 'center:center',
						text: '',
						size: 14,
						color: 16777215,
					},
					steps: [
						{
							down: [{ actionId: 'MoveNextUp', options: {} }],
							up: [],
						},
					],
					feedbacks: [],
				},
				MoveNextDown: {
					type: 'simple',
					name: 'Move Next Down',
					style: {
						bgcolor: 0,

						png64: icons.Down,
						pngalignment: 'center:center',
						text: '',
						size: 14,
						color: 16777215,
					},
					steps: [
						{
							down: [{ actionId: 'MoveNextDown', options: {} }],
							up: [],
						},
					],
					feedbacks: [],
				},
				FireTimerWithID: {
					type: 'simple',
					name: 'Start with ID',
					notes: 'Set the ID option to the CueTimer timer ID to start.',
					style: {
						bgcolor: 0,

						text: 'Start',
						alignment: 'center:center',
						size: '14',
						color: 16777215,
					},
					steps: [
						{
							down: [
								{
									actionId: 'FireTimerWithID',
									options: {
										Key: '1',
									},
								},
							],
							up: [],
						},
					],
					feedbacks: [
						{
							feedbackId: 'timerName',
							options: {
								Key: '1',
							},
						},
						{
							feedbackId: 'timerBackground',
							options: {
								Key: '1',
							},
						},
					],
				},
				CueTimerWithID: {
					type: 'simple',
					name: 'Cue with ID',
					notes: 'Set the ID option to the CueTimer timer ID to cue.',
					style: {
						bgcolor: 0,

						text: 'Cue',
						alignment: 'center:center',
						size: '14',
						color: 16777215,
					},
					steps: [
						{
							down: [
								{
									actionId: 'CueTimerWithID',
									options: {
										Key: '1',
									},
								},
							],
							up: [],
						},
					],
					feedbacks: [
						{
							feedbackId: 'timerName',
							options: {
								Key: '1',
							},
						},
						{
							feedbackId: 'timerBackground',
							options: {
								Key: '1',
							},
						},
					],
				},
				CueCurrent: {
					type: 'simple',
					name: 'Stop and go back',
					style: {
						bgcolor: 0,

						png64: icons.CueCurrent,
						pngalignment: 'center:top',

						text: 'Stop and go back',
						alignment: 'center:bottom',
						size: 7,
						color: 16777215,
					},
					steps: [
						{
							down: [{ actionId: 'CueCurrent', options: {} }],
							up: [],
						},
					],
					feedbacks: [],
				},
				SetDuration: {
					type: 'simple',
					name: 'Set Duration',
					notes: 'Set the duration option as hh:mm:ss. Applies to the running timer, or the next one when idle.',
					style: {
						bgcolor: 0,
						text: 'Set Duration',
						alignment: 'center:center',
						size: '14',
						color: 16777215,
					},
					steps: [
						{
							down: [
								{
									actionId: 'SetDuration',
									options: {
										Key: '00:10:00',
									},
								},
							],
							up: [],
						},
					],
					feedbacks: [],
				},
				AddXMinutes: {
					type: 'simple',
					name: 'Add X Minutes',
					style: {
						bgcolor: 0,
						text: 'Add X Minutes',
						alignment: 'center:center',
						size: '14',
						color: 16777215,
					},
					steps: [
						{
							down: [
								{
									actionId: 'AddXMinutes',
									options: {
										Key: '1',
									},
								},
							],
							up: [],
						},
					],
					feedbacks: [],
				},
				SubXMinutes: {
					type: 'simple',
					name: 'Subtract X Minutes',
					style: {
						bgcolor: 0,
						text: 'Subtract X Minutes',
						alignment: 'center:center',
						size: '14',
						color: 16777215,
					},
					steps: [
						{
							down: [
								{
									actionId: 'SubXMinutes',
									options: {
										Key: '1',
									},
								},
							],
							up: [],
						},
					],
					feedbacks: [],
				},
				InitList: {
					type: 'simple',
					name: 'Initialize List',
					style: {
						bgcolor: 0,
						text: 'Initialize List',
						alignment: 'center:center',
						size: '14',
						color: 16777215,
					},
					steps: [
						{
							down: [{ actionId: 'InitList', options: {} }],
							up: [],
						},
					],
					feedbacks: [],
				},
			},
		},
		{
			id: 'list-control',
			name: 'List control',
			presets: {
				PrevList: {
					type: 'simple',
					name: 'Selects previous list',
					style: {
						bgcolor: 0,
						text: 'Prev list',
						alignment: 'center:center',
						size: '14',
						color: 16777215,
					},
					steps: [
						{
							down: [{ actionId: 'ActivatePreviousList', options: {} }],
							up: [],
						},
					],
					feedbacks: [],
				},
				NextList: {
					type: 'simple',
					name: 'Selects next list',
					style: {
						bgcolor: 0,
						text: 'Next list',
						alignment: 'center:center',
						size: '14',
						color: 16777215,
					},
					steps: [
						{
							down: [{ actionId: 'ActivateNextList', options: {} }],
							up: [],
						},
					],
					feedbacks: [],
				},
				...listPresets(instanceLabel),
			},
		},
		{
			id: 'feedbacks',
			name: 'Feedbacks',
			presets: {
				Hours: {
					type: 'simple',
					name: 'Hours',
					style: {
						bgcolor: 0,
						text: `$(${instanceLabel}:hours)`,
						alignment: 'center:center',
						size: 'auto',
						color: 16777215,
					},
					steps: [
						{
							down: [],
							up: [],
						},
					],
					feedbacks: [
						{
							feedbackId: 'colors',
							options: {},
						},
					],
				},
				Minutes: {
					type: 'simple',
					name: 'Minutes',
					style: {
						bgcolor: 0,
						text: `$(${instanceLabel}:minutes)`,
						alignment: 'center:center',
						size: 'auto',
						color: 16777215,
					},
					steps: [
						{
							down: [],
							up: [],
						},
					],
					feedbacks: [
						{
							feedbackId: 'colors',
							options: {},
						},
					],
				},
				Seconds: {
					type: 'simple',
					name: 'Seconds',
					style: {
						bgcolor: 0,
						text: `$(${instanceLabel}:seconds)`,
						alignment: 'center:center',
						size: 'auto',
						color: 16777215,
					},
					steps: [
						{
							down: [],
							up: [],
						},
					],
					feedbacks: [
						{
							feedbackId: 'colors',
							options: {},
						},
					],
				},

				Name: {
					type: 'simple',
					name: 'Name',
					style: {
						bgcolor: 0,
						text: `$(${instanceLabel}:name)`,
						alignment: 'center:center',
						size: 'auto',
						color: 16777215,
					},
					steps: [
						{
							down: [],
							up: [],
						},
					],
					feedbacks: [
						{
							feedbackId: 'colors',
							options: {},
						},
					],
				},
				Speed: {
					type: 'simple',
					name: 'Speed',
					style: {
						bgcolor: 0,
						text: `Speed\\n\\n$(${instanceLabel}:speed)%`,
						alignment: 'center:center',
						size: '14',
						color: 16777215,
					},
					steps: [
						{
							down: [],
							up: [],
						},
					],
					feedbacks: [],
				},
				EndTime: {
					type: 'simple',
					name: 'End Time',
					style: {
						bgcolor: 0,
						text: `End Time\\n\\n$(${instanceLabel}:endTime)`,
						alignment: 'center:center',
						size: '14',
						color: 16777215,
					},
					steps: [
						{
							down: [],
							up: [],
						},
					],
					feedbacks: [],
				},
				NextName: {
					type: 'simple',
					name: 'Next name',
					style: {
						bgcolor: 0,
						text: `Next:\\n$(${instanceLabel}:nextTimerName)`,
						alignment: 'center:center',
						size: '14',
						color: 16777215,
					},
					steps: [
						{
							down: [],
							up: [],
						},
					],
					feedbacks: [],
				},
				NextDuration: {
					type: 'simple',
					name: 'Next duration',
					style: {
						bgcolor: 0,
						text: `Next:\\n\\n$(${instanceLabel}:nextTimerDuration)`,
						alignment: 'center:center',
						size: '14',
						color: 16777215,
					},
					steps: [
						{
							down: [],
							up: [],
						},
					],
					feedbacks: [],
				},
				ScheduleOffset: {
					type: 'simple',
					name: 'Schedule Offset',
					style: {
						bgcolor: 0,
						text: `$(${instanceLabel}:scheduleOffset)`,
						alignment: 'center:center',
						size: '14',
						color: 16777215,
					},
					steps: [
						{
							down: [],
							up: [],
						},
					],
					feedbacks: [],
				},
				scheduleOffsetStatus: {
					type: 'simple',
					name: 'Schedule Offset Status',
					style: {
						bgcolor: 0,
						text: `$(${instanceLabel}:scheduleOffsetStatus)`,
						alignment: 'center:center',
						size: '18',
						color: 16777215,
					},
					steps: [
						{
							down: [],
							up: [],
						},
					],
					feedbacks: [],
				},
			},
		},
	]

	return {
		structure: sections.map(({ id, name, presets }) => ({ id, name, definitions: Object.keys(presets) })),
		presets: Object.assign({}, ...sections.map((section) => section.presets)),
	}
}

// Presets "Selects List 1" … "Selects List 10", generated from one template
function listPresets(instanceLabel) {
	const presets = {}
	for (let i = 1; i <= 10; i++) {
		presets[`List${i}`] = {
			type: 'simple',
			name: `Selects List ${i}`,
			style: {
				bgcolor: 0,
				text: `$(${instanceLabel}:list_${i}_name)`,
				alignment: 'center:center',
				size: '14',
				color: 16777215,
			},
			steps: [
				{
					down: [{ actionId: 'ActivateListByNumber', options: { Key: String(i) } }],
					up: [],
				},
			],
			feedbacks: [
				{
					feedbackId: 'activeList',
					options: {
						Key: String(i),
					},
					style: {
						color: 16777215,
						bgcolor: '#9A9A00',
					},
				},
			],
		}
	}

	return presets
}
