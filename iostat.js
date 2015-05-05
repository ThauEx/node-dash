var iostatLinux     = require('iostat');
var spawn           = require('child_process').spawn;
var EventEmitter    = require('events').EventEmitter;

function runIostat(options) {
    if (process.platform == "linux") {
        return iostatLinux(options);
    }

    else if (process.platform == "darwin") {
        options = options||[];
        process.env.LANG="en_US.utf8"; //enforce en_US to avoid locale problem

        var emitter = new EventEmitter(),
        iostat  = spawn('iostat', options, {env: process.env});

        iostat.stdout.on('data', function (data) {
            data = data.toString();

            var dataPos = data.indexOf("load average");

            if (dataPos > -1) {
                data = data.split("\n").slice(2).join("\n");
            }

            if (data) {
                emitter.emit('data', null, toObject(data));
            }
        });

        iostat.stderr.on('data', function (data) {
            throw new Error('iostat error: '+ data);
            // console.error('iostat: ' + data);
        });

        iostat.on('exit', function (code) {
            console.log('child process exited with code ' + code);
        });

        var toObject = function (output_data) {
            var outputArray = output_data.replace(/^\s+|\s+$/g,"").split(/\s+/);

            for (var i=0; i < outputArray.length; i++) {
                outputArray[i] = parseFloat( outputArray[i]);
            }

            var lenght = outputArray.length;

            return {
                cpu:{
                    "%user":    outputArray[lenght-6],
                    "%system":  outputArray[lenght-5],
                    "%idle":    outputArray[lenght-4]
                },
                devices: {}
            };
        };

        return emitter;
    }
}

module.exports = runIostat;
