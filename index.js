var tcp = require('../../tcp');
var instance_skel = require('../../instance_skel');
var presets = require('./presets')
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


    self.initTCP();
    self.feedbacks();
    self.presets();
    self.variables();

    self.setVariable('hours', '');
    self.setVariable('minutes', '');
    self.setVariable('seconds', '');
    self.setVariable('name', '');
    self.setVariable('speed', '');
    self.setVariable('endTime', '');
    self.bgColor = self.rgb(0, 0, 0);
    self.fgColor = self.rgb(255, 255, 255);
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
            let received = new MessageBuffer("$")
            received.push(data)
            let message = received.handleData()
            let jsonData = JSON.parse(message)

            hours = (jsonData.h < 0 ? '+' : '') + jsonData.h.replace('-', '');
            hours = (hours == '') ? '' : hours.lpad('0', 2);
            self.setVariable('hours', hours);

            minutes = (jsonData.m < 0 ? '+' : '') + jsonData.m.replace('-', '');
            minutes = (minutes == '') ? '' : minutes.lpad('0', 2);
            self.setVariable('minutes', minutes);

            seconds = (jsonData.s < 0 ? '+' : '') + jsonData.s.replace('-', '');
            seconds = (seconds == '') ? '' : seconds.lpad('0', 2);
            self.setVariable('seconds', seconds);

            self.setVariable('speed', jsonData.speed);
            self.setVariable('name', jsonData.name);
            self.setVariable('endTime', jsonData.endTime);

            let tempFg = self.hexToRgb(jsonData.fg.substr(0, 1) + jsonData.fg.substr(3))
            self.fgColor = self.rgb(tempFg.r, tempFg.g, tempFg.b);
            let tempBg = self.hexToRgb(jsonData.bg.substr(0, 1) + jsonData.bg.substr(3))
            self.bgColor = self.rgb(tempBg.r, tempBg.g, tempBg.b);
            self.checkFeedbacks('colors');

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
        'Reset': { label: 'Reset' },
        'Revert': { label: 'Revert' },
        'AddSpeed': { label: 'Increase speed by 5%' },
        'SubSpeed': { label: 'Decrease speed by 5%' },
        'AddMinute': { label: 'Add 1 minute' },
        'SubMinute': { label: 'Subtract 1 minute' },
        'Blackout': { label: 'Blackout' }
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

instance.prototype.variables = function () {
    var self = this;

    var variables = [
        { label: 'Hours', name: 'hours' },
        { label: 'Minutes', name: 'minutes' },
        { label: 'Seconds', name: 'seconds' },
        { label: 'Name', name: 'name' },
        { label: 'Speed', name: 'speed' },
        { label: 'End Time', name: 'endTime' }
    ];

    self.setVariableDefinitions(variables);
};

instance.prototype.feedbacks = function () {
    var self = this;
    var feedbacks = {
        colors: {
            label: 'colors',
            description: 'Foreground and background colors of the timer',
            callback: function (feedback, bank) {
                return { color: self.fgColor, bgcolor: self.bgColor }
            }
        }
    }
    self.setFeedbackDefinitions(feedbacks);
}


instance.prototype.presets = function () {
    var self = this;
    self.setPresetDefinitions(presets.getPresets(self.label));
}

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
        const message = this.getMessage()
        return message
    }
}

instance_skel.extendedBy(instance);
exports = module.exports = instance;