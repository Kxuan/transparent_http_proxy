#!/usr/bin/env node
"use strict";
/*
 * MIT License
 */
const fs = require('fs');
const net = require('net');
const util = require('util');
const EventEmitter = require('events');
const readline = require('readline');

const cfg = {
    interactive: true,
    local: {
        listen: 9231
        //listen: '/run/proxy.socket'
    },
    target: {
        host: null,
        port: null
    },
    proxy: {
        host: "10.167.196.133",
        port: 8080,
        auth: {
            method: 'None', //'Basic' or other value
            user: 'user',
            pass: 'pass'
        }
    }
};

const clients = new Array();
var clients_id = 0;
/**
 * @type {readline.Interface}
 */
var rl = null;

var s = net.createServer(onNewClient);

function Channel(c, proxy) {
    var events = {};
    this.proxy = proxy;
    this.sock_client = c;

    c.once('close', events.c_close = onpeer_closed.bind(this));
    function onpeer_closed() {
        if (this.state == 'close') {
            return;
        }
        this.state = 'close';

        cleanup_pre.apply(this);
        this.emit("close");
        cleanup_post.apply(this);
    }

    function cleanup_pre() {
        if (this.sock_proxy)
            this.sock_proxy.end();
        this.sock_client.end();
    }

    function cleanup_post() {
        delete this.sock_client;
        delete this.sock_proxy;
        this.removeAllListeners();
    }
}
Channel.encryptHelloMessage = function (target_host, target_port, proxy) {
    switch (proxy.auth || proxy.auth.method) {
        case 'Basic': {
            let credential = proxy.user || "";
            if (proxy.pass) credential += ":" + proxy.pass;

            return util.format(
                "CONNECT %s:%d\nProxy-Authorization: Basic %s\n\n",
                target_host, target_port,
                (new Buffer(credential)).toString("base64")
            );
        }
        default:
            return util.format("CONNECT %s:%d\n\n", target_host, target_port);
    }
};
util.inherits(Channel, EventEmitter);
Channel.prototype.state = 'wait';
Channel.prototype.forward = function (host, port) {
    if (this.sock_proxy !== undefined) {
        throw new Error("Duplicate forward request");
    }
    var c = this.sock_client;
    var s = net.connect(this.proxy.port, this.proxy.host, onconnected.bind(this));
    s.once('data', ondata.bind(this));
    s.on('error', onerror.bind(this));
    s.once('close', function () {
        c.end();
    });

    this.state = 'connecting';

    function onerror(ex) {
        this.log("ERROR: %s", ex.message);
        s.end();
        c.end();
    }

    /**
     * @this {Channel}
     */
    function onconnected() {
        s.write(Channel.encryptHelloMessage(host, port, this.proxy));
        this.state = 'request';
        this.emit('request');
    }

    /**
     * @this {Channel}
     * @param {Buffer} buf
     */
    function ondata(buf) {
        var rep = buf.toString('ascii');
        if (rep != "HTTP/1.1 200 Connection established\r\n\r\n") {
            this.emit('fail');
            s.end();
            return;
        }
        this.state = 'connected';
        this.emit('connected');
        s.pipe(c);
        c.pipe(s);
    }

    this.sock_proxy = s;
};

Channel.prototype.info = function () {
    var c = this.sock_client,
        s = this.sock_proxy;
    var r = {
        client: {
            local: {
                addr: c.localAddress,
                port: c.localPort
            },
            remote: {
                addr: c.remoteAddress,
                port: c.remotePort
            }
        },
    };
    if (s) {
        r["proxy"] = {
            local: {
                addr: s.localAddress,
                port: s.localPort
            },
            remote: {
                addr: s.remoteAddress,
                port: s.remotePort
            }
        };
    }
    return r;
};

Channel.prototype.log = function (fmt) {
    var prefix = this.name ? this.name : "<null>";
    var args = ['%s : ' + fmt, prefix].concat(Array.prototype.slice.call(arguments, 1));
    writeLog.apply(this, args);
};

function onNewClient(c) {
    var chan = new Channel(c, cfg.proxy);
    var l_addr = chan.info().client.remote;
    chan.name = util.format("%s:%d", l_addr.addr, l_addr.port);
    chan.id = clients_id++;
    chan.on('close', () => {
        delete clients[chan.id];
        chan.log("Closed");
    });
    chan.on('request', () => chan.log("Requesting"));
    chan.on('fail', () => chan.log("Failed"));
    chan.on('connected', () => chan.log("Established"));

    clients[chan.id] = chan;
    if (!cfg.target.host) {
        chan.log("Waiting forward");
    } else {
        chan.forward(cfg.target.host, cfg.target.port);
    }
}

function setupServer() {
    if (!rl && cfg.interactive !== false) {
        rl = readline.createInterface(process.stdin, process.stderr);
        rl.setPrompt('>');
        rl.prompt();
        rl.on('line', onReadlineLine);
        rl.on('close', () => process.exit(0));
    }
    s.listen(cfg.local.listen, () => writeLog("server ready"));
    s.on('error', console.error.bind(console));
}

function onReadlineLine(line) {
    var args = line.split(/\s/);
    if (!args) return;
    try {
        switch (args[0]) {
            case 'exit':
            case 'quit':
                process.exit(0);
                break;
            case 'list':
            case 'ls':
                console.log("id addr status");
                console.log("----------------------------------------");
                for (var id in clients) {
                    let client = clients[id];
                    if (!client) continue;
                    console.log("%d %s %s", id, client.name, client.state);
                }
                break;
            case 'listen': {
                let port = args[1];
                if (!port) {
                    console.log("listen <port>");
                    break;
                }
                s.close();
                cfg.local.listen = port;
                s = net.createServer();
                setupServer();
            }
                break;
            case 'forward': {
                let name = args[1];
                let host = args[2];
                let port = args[3];
                if (!name || !host || !port) {
                    console.log("forward <client_id> <host> <port>");
                    break;
                }
                let client = clients[name];
                if (!client) {
                    console.log("Client not found\n");
                    break;
                }
                console.log("forward %s to %s:%s", client.name, host, port);
                client.forward(host, port);
            }
                break;
            case 'target': {
                let host = args[1];
                let port = args[2];
                if (host && !port) {
                    console.log("target <host> <port>");
                    break;
                }
                if (!host) {
                    cfg.target.host = null;
                    cfg.target.port = null;
                    console.log("Default forward target is clear.\nClient will not be forward automaticly");
                } else {
                    cfg.target.host = host;
                    cfg.target.port = port;
                    console.log("Default forward target set.\nClient will be forward automaticly");
                }
            }
                break;
            case 'config': {
                let output = args[1];
                if (!output) {
                    console.log(cfg);
                } else {
                    fs.writeFileSync(output, JSON.stringify(cfg));
                }
            }
                break;
            case '?':
            case 'help':
                console.log("Help\n======\nexit    - exit\nquit    - alias of `exit`\nlist    - list all clients\nls      - alias of `list`\nlisten  - replace the listen port and keep clients connected.\nforward - forward a client. (only wait state)\ntarget  - set auto-forward target or disable auto forward\nconfig  - print config to screen or write to a file\n");
                break;
            default:
                console.log("Unknow command '%s'.", args[0]);
        }
    } catch (ex) {
        console.error(ex);
    }
    rl.prompt();
}

function writeLog(fmt) {
    var args = ['\r[%s]' + fmt + "\n", (new Date()).toLocaleString()].concat(Array.prototype.slice.call(arguments, 1));
    var log = util.format.apply(util, args);
    process.stdout.write(log);

    if (rl)
        rl.prompt(true);
}

switch (process.argv.length) {
    case 4:
        // node tcp.js <host> <port>
        cfg.target.host = process.argv[2];
        cfg.target.port = parseInt(process.argv[3]);
        break;
    case 3:
        // node tcp.js <config.json>
        let outer_cfg = JSON.parse(fs.readFileSync(process.argv[2]));

        //TODO merge config object
        Object.assign(cfg, outer_cfg);
        break;
    case 2:
        // node tcp.js
        break;
    default:
        console.error("Hey, check your arguments.");
        process.exit(1);
}
setupServer();
