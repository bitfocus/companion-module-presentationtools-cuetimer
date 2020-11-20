var tcp = require('../../tcp');
var instance_skel = require('../../instance_skel');
var debug;
var log;

function instance(system, id, config) {
    var self = this;

    // super-constructor
    instance_skel.apply(this, arguments);

    self.actions(); // export actions

    return self;
}
instance.prototype.hexToRgb = function (hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}
String.prototype.lpad = function (padString, length) {
    var str = this;
    while (str.length < length) str = padString + str;
    return str;
};

instance.prototype.updateConfig = function (config) {
    var self = this;
    var resetConnection = false;

    if (self.config.host != config.host || self.config.port != config.port) {
        resetConnection = true;
    }

    self.config = config;

    if (resetConnection === true || self.socket === undefined) {
        self.initTCP();
    }
}

instance.prototype.init = function () {
    var self = this;

    debug = self.debug;
    log = self.log;

    self.sec = '00';
    self.minutes = '00';
    self.hours = '00';
    self.bgColor = self.rgb(0, 0, 0);
    self.fgColor = self.rgb(255, 255, 255);
    self.name = "";
    self.speed = "";
    self.endTime = "";

    self.initTCP();
    self.feedbacks();
    // self.initVariables();
}

instance.prototype.initTCP = function () {
    var self = this;

    if (self.socket !== undefined) {
        self.socket.destroy();
        delete self.socket;
    }

    if (self.config.host && self.config.port) {
        self.socket = new tcp(self.config.host, self.config.port);

        self.socket.on('status_change', (status, message) => {
            self.status(status, message);
        });

        self.socket.on('error', (err) => {
            debug("Network error", err);
            self.status(self.STATE_ERROR, err);
            console.log('error', "Network error: " + err.message);
        });

        self.socket.on('connect', () => {
            debug("Connected");
            self.status(self.STATE_OK);
            console.log("Connected");
        });


        self.socket.on('data', (data) => {
            //console.log(data)
            let received = new MessageBuffer("$")
            received.push(data)
            let message = received.handleData()
            let jsonData = JSON.parse(message)
            // console.log(message);
            self.hours = (jsonData.h < 0 ? '+' : '') + jsonData.h.replace('-', '');
            self.hours = (self.hours == '') ? '' : self.hours.lpad('0', 2);

            self.minutes = (jsonData.m < 0 ? '+' : '') + jsonData.m.replace('-', '');
            self.minutes = (self.minutes == '') ? '' : self.minutes.lpad('0', 2);

            self.sec = (jsonData.s < 0 ? '+' : '') + jsonData.s.replace('-', '');
            self.sec = (self.sec == '') ? '' : self.sec.lpad('0', 2);

            // console.log(jsonData.fg.substr(0, 1) + jsonData.fg.substr(2))
            let tempFg = self.hexToRgb(jsonData.fg.substr(0, 1) + jsonData.fg.substr(3))
            let tempBg = self.hexToRgb(jsonData.bg.substr(0, 1) + jsonData.bg.substr(3))
            self.fgColor = self.rgb(tempFg.r, tempFg.g, tempFg.b);
            self.bgColor = self.rgb(tempBg.r, tempBg.g, tempBg.b);
            self.name = jsonData.name;
            self.speed = `Speed\\n\\n${jsonData.speed}%`;
            self.endTime = `End Time\\n\\n${jsonData.endTime}`;

            self.checkFeedbacks('set_hours');
            self.checkFeedbacks('set_minutes');
            self.checkFeedbacks('set_seconds');
            self.checkFeedbacks('set_name');
            self.checkFeedbacks('set_speed');
            self.checkFeedbacks('set_endTime');

        });
        self.socket.on('end', function () {
            console.log('end');
        });
    }
}

instance.prototype.config_fields = function () {
    var self = this;
    return [
        {
            type: 'text',
            id: 'info',
            width: 12,
            label: 'Information',
            value: 'This will establish a TCP connection to interact with the CueTimer app'
        },
        {
            type: 'textinput',
            id: 'host',
            label: 'Target IP (For local: 127.0.0.1)',
            default: '127.0.0.1',
            width: 6,
            regex: self.REGEX_IP
        },
        {
            type: 'textinput',
            id: 'port',
            label: 'Target port (Default: 4778)',
            default: '4778',
            width: 6,
            regex: self.REGEX_PORT
        }
    ]
}

instance.prototype.actions = function () {
    var self = this;

    actions = {
        'FireNext': { label: 'Fire the next timer' },
        'CueNext': { label: 'Cue next' },
        'Pause': { label: 'Pause' },
        'Restart': { label: 'Restart' },
        'ContinuePrev': { label: 'Continue previous' },
        'Blackout': { label: 'Blackout' },
        'AddMinute': { label: 'Add 1 minute' },
        'SubMinute': { label: 'Subtract 1 minute' },
        'AddSpeed': { label: 'Increase speed' },
        'SubSpeed': { label: 'Decrease speed' }
    };

    self.setActions(actions);
}

instance.prototype.action = function (action) {
    var self = this;
    var cmd = '';
    var terminationChar = '$';

    cmd = action.action

    cmd += terminationChar;
    if (cmd !== undefined && cmd != terminationChar) {
        if (self.socket !== undefined && self.socket.connected) {
            self.socket.send(cmd);
        }
    }
}

instance.prototype.feedbacks = function () {
    var self = this;
    var feedbacks = {
        set_hours: {
            label: 'hours',
            description: 'Display hours on this button',
            callback: function (feedback, bank) {
                return { color: self.fgColor, bgcolor: self.bgColor, text: self.hours }
            }
        },
        set_minutes: {
            label: 'minutes',
            description: 'Display minutes on this button',
            callback: function (feedback, bank) {
                return { color: self.fgColor, bgcolor: self.bgColor, text: self.minutes }
            }
        },
        set_seconds: {
            label: 'seconds',
            description: 'Display seconds on this button',
            callback: function (feedback, bank) {
                return { color: self.fgColor, bgcolor: self.bgColor, text: self.sec }
            }
        },
        //////////////////////
        set_name: {
            label: 'Name',
            description: 'Display name on this button',
            callback: function (feedback, bank) {
                return { /*color: self.fgColor, bgcolor: self.bgColor,*/ text: self.name }
            }
        },
        set_speed: {
            label: 'speed',
            description: 'Display speed on this button',
            callback: function (feedback, bank) {
                return { size: '14', text: self.speed }
            }
        },
        set_endTime: {
            label: 'end time',
            description: 'Display end time on this button',
            callback: function (feedback, bank) {
                return { size: '14', text: self.endTime }
            }
        },

    }





    self.setFeedbackDefinitions(feedbacks);
    console.log("feedbacks have been initialized");

    // self.setVariable('sec', '09');
    // self.checkFeedbacks('set_seconds');
}

// instance.prototype.initVariables = function () {
//     var self = this;

//     var variables = [
//         {
//             label: 'counter (Seconds)',
//             name: 'sec'
//         },
//     ];
//     self.setVariableDefinitions(variables);
// };

instance.prototype.destroy = function () {
    var self = this;

    if (self.socket !== undefined) {
        self.socket.destroy();
    }

    self.debug("destroy", self.id);;
}

class MessageBuffer {
    constructor(delimiter) {
        this.delimiter = delimiter
        this.buffer = ""
    }

    isFinished() {
        if (
            this.buffer.length === 0 ||
            this.buffer.indexOf(this.delimiter) === -1
        ) {
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
            this.buffer = this.buffer.replace(message + this.delimiter, "")
            return message
        }
        return null
    }

    handleData() {
        /**
         * Try to accumulate the buffer with messages
         *
         * If the server isnt sending delimiters for some reason
         * then nothing will ever come back for these requests
         */
        const message = this.getMessage()
        return message
    }
}

instance_skel.extendedBy(instance);
exports = module.exports = instance;