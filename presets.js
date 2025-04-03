var icons = require('./icons')
exports.getPresets = function (instanceLabel) {
	return {
		FireNext: {
			type: 'button',
			category: 'Commands',
			name: 'Fire next Timer',
			style: {
				bgcolor: 0,

				png64: icons.FireNext,
				pngalignment: 'center:top',

				text: 'Fire Next',
				alignment: 'center:bottom',
				size: '14',
				color: 16777215,
			},
			steps: [
				{
					down: [{ actionId: 'FireNext' }],
					up: [],
				},
			],
			feedbacks: [],
		},
		CueNext: {
			type: 'button',
			category: 'Commands',
			name: 'Cue next Timer',
			style: {
				bgcolor: 0,

				png64: icons.CueNext,
				pngalignment: 'center:top',

				text: 'Cue Next',
				alignment: 'center:bottom',
				size: '14',
				color: 16777215,
			},
			steps: [
				{
					down: [{ actionId: 'CueNext' }],
					up: [],
				},
			],
			feedbacks: [],
		},
		Pause: {
			type: 'button',
			category: 'Commands',
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
					down: [{ actionId: 'Pause' }],
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
			type: 'button',
			category: 'Commands',
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
					down: [{ actionId: 'Restart' }],
					up: [],
				},
			],
			feedbacks: [],
		},
		Reset: {
			type: 'button',
			category: 'Commands',
			name: 'Reset',
			style: {
				bgcolor: 0,

				png64: icons.Reset,
				pngalignment: 'center:top',

				text: 'Reset',
				alignment: 'center:bottom',
				size: '14',
				color: 16777215,
			},
			steps: [
				{
					down: [{ actionId: 'Reset' }],
					up: [],
				},
			],
			feedbacks: [],
		},
		Undo: {
			type: 'button',
			category: 'Commands',
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
					down: [{ actionId: 'Undo' }],
					up: [],
				},
			],
			feedbacks: [],
		},
		AddSpeed: {
			type: 'button',
			category: 'Commands',
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
					down: [{ actionId: 'AddSpeed' }],
					up: [],
				},
			],
			feedbacks: [],
		},
		SubSpeed: {
			type: 'button',
			category: 'Commands',
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
					down: [{ actionId: 'SubSpeed' }],
					up: [],
				},
			],
			feedbacks: [],
		},
		AddMinute: {
			type: 'button',
			category: 'Commands',
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
					down: [{ actionId: 'AddMinute' }],
					up: [],
				},
			],
			feedbacks: [],
		},
		SubMinute: {
			type: 'button',
			category: 'Commands',
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
					down: [{ actionId: 'SubMinute' }],
					up: [],
				},
			],
			feedbacks: [],
		},
		Blackout: {
			type: 'button',
			category: 'Commands',
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
					down: [{ actionId: 'Blackout' }],
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
			type: 'button',
			category: 'Commands',
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
					down: [{ actionId: 'Clock' }],
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
			type: 'button',
			category: 'Commands',
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
					down: [{ actionId: 'Message' }],
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
			type: 'button',
			category: 'Commands',
			name: 'Full Screen',
			style: {
				bgcolor: 0,
				text: 'FullScreen',
				alignment: 'center:bottom',
				png64: icons.Fullscreen,
				pngalignment: "center:center",
				size: '14',
				color: 16777215,
			},
			steps: [
				{
					down: [{ actionId: 'Fullscreen', options: {Key: 'toggle'}}],
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
			type: 'button',
			category: 'Commands',
			name: 'Preview',
			style: {
				bgcolor: 0,
				text: 'Preview window',
				alignment: 'center:bottom',
				png64: icons.Preview,
				pngalignment: "center:center",
				size: '14',
				color: 16777215,
			},
			steps: [
				{
					down: [{ actionId: 'Preview', options: {Key: 'toggle'} }],
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
			type: 'button',
			category: 'Commands',
			name: 'Presenter',
			style: {
				bgcolor: 0,
				text: 'Presenter window',
				alignment: 'center:bottom',
				png64: icons.Presenter,
				pngalignment: "center:center",
				size: '14',
				color: 16777215,
			},
			steps: [
				{
					down: [{ actionId: 'Presenter', options: {Key: 'toggle'} }],
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
		NDI: {
			type: 'button',
			category: 'Commands',
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
					down: [{ actionId: 'NDI' }],
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
			type: 'button',
			category: 'Commands',
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
					down: [{ actionId: 'STM' }],
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
			type: 'button',
			category: 'Commands',
			name: 'Move Next Up',
			style: {
				bgcolor: 0,

				png64: icons.Up,
				pngalignment: 'center:center',
				text: '',
			},
			steps: [
				{
					down: [{ actionId: 'MoveNextUp' }],
					up: [],
				},
			],
			feedbacks: [],
		},
		MoveNextDown: {
			type: 'button',
			category: 'Commands',
			name: 'Move Next Down',
			style: {
				bgcolor: 0,

				png64: icons.Down,
				pngalignment: 'center:center',
				text: '',
			},
			steps: [
				{
					down: [{ actionId: 'MoveNextDown' }],
					up: [],
				},
			],
			feedbacks: [],
		},
		FireTimerWithID: {
			type: 'button',
			category: 'Commands',
			name: 'Fire with ID',
			style: {
				bgcolor: 0,

				text: 'Fire',
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
			type: 'button',
			category: 'Commands',
			name: 'Cue with ID',
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
			type: 'button',
			category: 'Commands',
			name: 'Cue Current Timer',
			style: {
				bgcolor: 0,

				png64: icons.CueCurrent,
				pngalignment: 'center:top',

				text: 'CueCurrent',
				alignment: 'center:bottom',
				size: '7',
				color: 16777215,
			},
			steps: [
				{
					down: [{ actionId: 'CueCurrent' }],
					up: [],
				},
			],
			feedbacks: [],
		},
		SetDuration: {
			type: 'button',
			category: 'Commands',
			name: 'Set Duration',
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
			type: 'button',
			category: 'Commands',
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
			type: 'button',
			category: 'Commands',
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
			type: 'button',
			category: 'Commands',
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
					down: [{ actionId: 'InitList' }],
					up: [],
				},
			],
			feedbacks: [],
		},

		// Variables & FeedBack presets
		Hours: {
			type: 'button',
			category: 'Feedbacks',
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
				},
			],
		},
		Minutes: {
			type: 'button',
			category: 'Feedbacks',
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
				},
			],
		},
		Seconds: {
			type: 'button',
			category: 'Feedbacks',
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
				},
			],
		},

		Name: {
			type: 'button',
			category: 'Feedbacks',
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
				},
			],
		},
		Speed: {
			type: 'button',
			category: 'Feedbacks',
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
			type: 'button',
			category: 'Feedbacks',
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
			type: 'button',
			category: 'Feedbacks',
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
			type: 'button',
			category: 'Feedbacks',
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
			type: 'button',
			category: 'Feedbacks',
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
			type: 'button',
			category: 'Feedbacks',
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
	}
}
