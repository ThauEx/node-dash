/// <reference path="typings/node/node.d.ts"/>
var path        = require('path');
var express     = require('express');
var app         = express();
var server      = require('http').Server(app);
var io          = require('socket.io')(server);

var df          = require('node-df');
var ps          = require('parse-processes');
var os          = require('os');
var iostat      = require('./iostat.js');

var publicDir   = path.join(__dirname, 'public');

//server.use(server.static(publicDir));
server.listen(process.env.PORT || 3000);
/*, function() {
    console.log(os.type());
    console.log(os.platform());
    console.log(os.release());
    console.log(os.uptime());
    console.log(os.loadavg());
    console.log(os.totalmem());
    console.log(os.freemem());
    console.log(os.cpus());
    console.log('Listening on port %d', server.address().port);
});*/
// https://github.com/makoto/node-websocket-activity-monitor/blob/master/server/activity-monitor.js
// https://github.com/temsa/node-iostat/blob/master/index.js

io.sockets.on('connection', function(socket) {
    console.log('client connected from ' + socket.handshake.address + '!');

    socket.on('disconnect', function () {
        console.log('client disconnected from ' + socket.handshake.address + '!');
    });

    /*
     * initial data
     */
    df(function (error, result) {
        if (error) { throw error; }

        socket.emit('df', result);
    });

    ps(function(error, result) {
        if (error) { throw error; }

        socket.emit('ps', result);
    });

    socket.emit('cpuCount', os.cpus());

    socket.emit('systemInfo', {
        'endianness':   os.endianness(),
        'hostname':     os.hostname(),
        'type':         os.type(),
        'platform':     os.platform(),
        'arch':         os.arch(),
        'release':      os.release(),
    });

    /*
     *  intervals
     */

    setInterval(function() {
        socket.emit('uptime', os.uptime());
    }, 1000);

    setInterval(function() {
        df(function (error, result) {
            if (error) { throw error; }

            socket.emit('df', result);
        });
    }, 60000);

    setInterval(function() {
        ps(function (error, result) {
            if (error) { throw error; }

            socket.emit('ps', result);
        });
    }, 10000);

    setInterval(function() {
        socket.emit('memory', {
            'free':     os.freemem(),
            'total':    os.totalmem()
        });
    }, 1000);

    setInterval(function() {
        socket.emit('loadavg', os.loadavg());
    }, 300);

    iostat(['2']).on('data', function(err, stats) {
        socket.emit('cpuUsage', stats);
    });

    /*setInterval(function() {
        cpus = os.cpus();

        var usage = {};

        for (var i = 0, len = cpus.length; i < len; i++) {
            var cpu = cpus[i], total = 0;
            usage[i] = {};

            for (type in cpu.times) {
                total += cpu.times[type];
            }

            for(type in cpu.times) {
                usage[i][type] = Math.round(100 * cpu.times[type] / total)
            }
        }

        socket.emit('cpuUsage', usage);
    }, 1000);*/
});

app.get('/', function (req, res) {
    res.sendFile(publicDir + '/index.html');
});

app.use(express.static(publicDir));

app.use(function(err, req, res, next){
    console.error(err.stack);
    res.status(500).send('Something broke!');
});
