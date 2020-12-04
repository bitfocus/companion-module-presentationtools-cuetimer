var icons = require('./icons');
exports.getPresets = function () {
    return [
        {
            category: 'Commands',
            label: 'Fire next Timer',
            bank: {
                bgcolor: 0,

                style: 'png',
                png64: icons.FireNext,
                pngalignment: 'center:top',

                text: 'Fire Next',
                alignment: 'center:bottom',
                size: '14',
                color: 16777215

            },
            actions: [{
                action: 'FireNext'
            }]
        },
        {
            category: 'Commands',
            label: 'Cue next Timer',
            bank: {
                bgcolor: 0,

                style: 'png',
                png64: icons.CueNext,
                pngalignment: 'center:top',

                text: 'Cue Next',
                alignment: 'center:bottom',
                size: '14',
                color: 16777215

            },
            actions: [{
                action: 'CueNext'
            }]
        },
        {
            category: 'Commands',
            label: 'Pause',
            bank: {
                bgcolor: 0,

                style: 'png',
                png64: icons.Pause,
                pngalignment: 'center:top',

                text: 'Pause',
                alignment: 'center:bottom',
                size: '14',
                color: 16777215

            },
            actions: [{
                action: 'Pause'
            }]
        },
        {
            category: 'Commands',
            label: 'Restart',
            bank: {
                bgcolor: 0,

                style: 'png',
                png64: icons.Restart,
                pngalignment: 'center:top',

                text: 'Restart',
                alignment: 'center:bottom',
                size: '14',
                color: 16777215

            },
            actions: [{
                action: 'Restart'
            }]
        },
        {
            category: 'Commands',
            label: 'Reset',
            bank: {
                bgcolor: 0,

                style: 'png',
                png64: icons.Reset,
                pngalignment: 'center:top',

                text: 'Reset',
                alignment: 'center:bottom',
                size: '14',
                color: 16777215

            },
            actions: [{
                action: 'Reset'
            }]
        },
        {
            category: 'Commands',
            label: 'Continue Previous Timer',
            bank: {
                bgcolor: 0,

                style: 'png',
                png64: icons.Revert,
                pngalignment: 'center:top',

                text: 'Revert',
                alignment: 'center:bottom',
                size: '14',
                color: 16777215

            },
            actions: [{
                action: 'ContinuePrev'
            }]
        },
        {
            category: 'Commands',
            label: 'Increase speed by 5%',
            bank: {
                bgcolor: 0,

                style: 'png',
                png64: icons.AddSpeed,
                pngalignment: 'center:top',

                text: 'Speed',
                alignment: 'center:bottom',
                size: '14',
                color: 16777215

            },
            actions: [{
                action: 'AddSpeed'
            }]
        },
        {
            category: 'Commands',
            label: 'Decrease speed by 5%',
            bank: {
                bgcolor: 0,

                style: 'png',
                png64: icons.SubSpeed,
                pngalignment: 'center:top',

                text: 'Speed',
                alignment: 'center:bottom',
                size: '14',
                color: 16777215

            },
            actions: [{
                action: 'SubSpeed'
            }]
        },
        {
            category: 'Commands',
            label: 'Add 1 Minute',
            bank: {
                bgcolor: 0,

                style: 'png',
                png64: icons.AddMinute,
                pngalignment: 'center:top',

                text: 'Minute',
                alignment: 'center:bottom',
                size: '14',
                color: 16777215

            },
            actions: [{
                action: 'AddMinute'
            }]
        },
        {
            category: 'Commands',
            label: 'Subtract 1 Minute',
            bank: {
                bgcolor: 0,

                style: 'png',
                png64: icons.SubMinute,
                pngalignment: 'center:top',

                text: 'Minute',
                alignment: 'center:bottom',
                size: '14',
                color: 16777215

            },
            actions: [{
                action: 'SubMinute'
            }]
        },
        {
            category: 'Commands',
            label: 'Blackout',
            bank: {
                bgcolor: 0,

                style: 'png',
                png64: icons.Blackout,
                pngalignment: 'center:top',

                text: 'Blackout',
                alignment: 'center:bottom',
                size: '14',
                color: 16777215

            },
            actions: [{
                action: 'Blackout'
            }]
        },



        // FeedBack presets
        {
            category: 'Feedbacks',
            label: 'Hours',
            bank: {
                bgcolor: 0,
                style: 'text',
                text: 'Hours',
                alignment: 'center:center',
                size: '18',
                color: 16777215

            },
            feedbacks: [{
                type: 'set_hours'
            }]
        },
        {
            category: 'Feedbacks',
            label: 'Minutes',
            bank: {
                bgcolor: 0,
                style: 'text',
                text: 'Minutes',
                alignment: 'center:center',
                size: '18',
                color: 16777215

            },
            feedbacks: [{
                type: 'set_minutes'
            }]
        },
        {
            category: 'Feedbacks',
            label: 'Seconds',
            bank: {
                bgcolor: 0,
                style: 'text',
                text: 'Seconds',
                alignment: 'center:center',
                size: '18',
                color: 16777215

            },
            feedbacks: [{
                type: 'set_seconds'
            }]
        },


        {
            category: 'Feedbacks',
            label: 'Name',
            bank: {
                bgcolor: 0,
                style: 'text',
                text: 'Name',
                alignment: 'center:center',
                size: '18',
                color: 16777215

            },
            feedbacks: [{
                type: 'set_name'
            }]
        },
        {
            category: 'Feedbacks',
            label: 'Speed',
            bank: {
                bgcolor: 0,
                style: 'text',
                text: 'Speed',
                alignment: 'center:center',
                size: '18',
                color: 16777215

            },
            feedbacks: [{
                type: 'set_speed'
            }]
        },
        {
            category: 'Feedbacks',
            label: 'End Time',
            bank: {
                bgcolor: 0,
                style: 'text',
                text: 'End Time',
                alignment: 'center:center',
                size: '14',
                color: 16777215

            },
            feedbacks: [{
                type: 'set_endTime'
            }]
        }
    ]
}