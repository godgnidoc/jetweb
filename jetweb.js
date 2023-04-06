"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Web = exports.log = exports.RequestContext = exports.Request = void 0;
const https = require("https");
const http = require("http");
const ws = require("ws");
const url_1 = require("url");
class Request {
    constructor(request) {
        this.body = '';
        this.incomingMessage = request;
    }
}
exports.Request = Request;
class RequestContext {
}
exports.RequestContext = RequestContext;
function log(...args) {
    let date = new Date();
    console.log(`[${date.toLocaleString()}] => `, ...args);
}
exports.log = log;
class Web {
    constructor(app, options = {}) {
        this.handleWebSocket = (request, socket, head) => {
            if (!this.wsServer) {
                this.wsServer = new ws.Server({ noServer: true, clientTracking: false, perMessageDeflate: true });
                this.wsServer.on('connection', (socket, request, entry) => {
                    setImmediate(() => {
                        log(`\x1b[34m[CONNECT ${request.url}]\x1b[0m${request.socket.remoteAddress}:${request.socket.remotePort}`);
                        socket.addListener('close', () => { log(`\x1b[34m[DISCONNECT ${request.url}]\x1b[0m${request.socket.remoteAddress}:${request.socket.remotePort}`); });
                        if (entry)
                            entry.call(socket, request);
                        else
                            socket.close();
                    });
                });
            }
            let url = new url_1.URL('http://localhost' + request.url);
            let entry = this.getEntry(url.pathname, 'ws');
            if (!entry) {
                socket.destroy();
                return;
            }
            this.wsServer.handleUpgrade(request, socket, head, (client) => {
                this.wsServer.emit('connection', client, request, entry);
            });
        };
        this.handleRequest = (req, res) => {
            let url = new url_1.URL('http://localhost' + req.url);
            let entry = this.getEntry(url.pathname, req.method);
            if (!entry || typeof entry != 'function') {
                log(`\x1b[1;33m[404 ${req.url}]\x1b[0m`);
                res.statusCode = 404;
                res.write(`Are U lost ?`);
                res.end();
                return;
            }
            let request = new Request(req);
            req.on('data', data => { request.body += data; });
            req.on('end', () => __awaiter(this, void 0, void 0, function* () {
                if ('content-type' in req.headers && req.headers["content-type"].match(/.*application\/json.*/)) {
                    try {
                        request.json = JSON.parse(request.body);
                        request.body = undefined;
                    }
                    catch (e) {
                        res.statusCode = 400;
                        res.write('Json parsing failed');
                        res.end();
                        return;
                    }
                }
                let handler = { response: res, request };
                let args = [];
                for (let name of entry['args'])
                    if (typeof request.json == 'object' && name in request.json)
                        args.push(request.json[name]);
                    else if (url.searchParams.has(name))
                        args.push(url.searchParams.get(name));
                    else
                        args.push(undefined);
                let ret = undefined;
                let color = '\x1b[1;32m';
                try {
                    ret = yield entry.apply(handler, args);
                }
                catch (e) {
                    log(e);
                    if (res.statusCode < 400)
                        res.statusCode = 500;
                }
                finally {
                    if (res.statusCode >= 400)
                        color = '\x1b[1;31m';
                }
                if (ret != undefined) {
                    res.setHeader('ContentType', 'application/json');
                    let rets = JSON.stringify(ret);
                    res.write(rets);
                    if (rets.length > 256)
                        ret = rets.slice(0, 256) + ' ...';
                }
                res.end();
                let params = {};
                url.searchParams.forEach((v, k) => { params[k] = v; });
                if (typeof request.json == 'object')
                    params = Object.assign(Object.assign({}, params), request.json);
                let params_str = JSON.stringify(params);
                if (params_str.length > 256)
                    params_str = params_str.slice(0, 256) + ' ...';
                else
                    params_str = params;
                log(`${color}[COMPLET ${req.url}] ${res.statusCode}\x1b[0m`);
                log(`\x1b[1;36m[PARAMS ${req.url}]\x1b[0m\n`, params_str);
                log(`\x1b[1;36m[RETURN ${req.url}]\x1b[0m\n`, ret);
            }));
            if (this.options.cors === true) {
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Methods', 'GET,POST');
                res.setHeader('Access-Control-Allow-Headers', 'x-requested-with,content-type');
            }
        };
        this.options = options;
        this.init(app);
        if (options.ssl)
            this.server = https.createServer(options.ssl, this.handleRequest);
        else if (options.http)
            this.server = http.createServer(options.http, this.handleRequest);
        else
            this.server = http.createServer(this.handleRequest);
        this.server.on('upgrade', this.handleWebSocket);
    }
    listen(port) {
        if (port)
            this.options.port = port;
        log(`web server listening localhost:${this.options.port}`);
        this.server.listen(this.options.port);
    }
    init(ctrls) {
        this.controllers = { '/': {} };
        for (let name in ctrls)
            this.controllers[name.toLowerCase()] = ctrls[name];
        if (!this.options.port)
            this.options.port = 5000;
        if (typeof this.options.cors == 'function')
            this.controllers['/']['cors'] = this.options.cors;
        else if (this.options.cors)
            this.controllers['/']['cors'] = () => { return; };
        else
            this.controllers['/']['cors'] = null;
        this.bindArgs();
        if (this.options.static)
            this.map();
    }
    map() {
        this.mapping = {};
        for (let c in this.controllers) {
            for (let m in this.controllers[c]) {
                if (c != '/') {
                    let entry = this.controllers[c][m];
                    if (typeof entry == 'function') {
                        let key = c.toLowerCase();
                        let paths = entry.name.match(/.[^A-Z]*/g);
                        let method = paths.shift().toLowerCase();
                        for (let path of paths)
                            key += `/${path.toLowerCase()}`;
                        this.mapping[`${method}/${key}`] = entry;
                    }
                }
            }
        }
    }
    getEntry(the_path, method) {
        let entry = null;
        the_path = the_path.toLowerCase();
        let name = method = method.toLowerCase();
        let domain = '';
        if (this.mapping) {
            name += the_path;
            if (name in this.mapping) {
                log(`\x1b[1;34m[FAST-MAPPING ${the_path}]\x1b[0m `);
                entry = this.mapping[name];
            }
        }
        else {
            let splits = the_path == '/' ? ['/'] : the_path.split('/');
            while (!domain)
                domain = splits.shift().toLowerCase();
            for (var path of splits)
                name += path.charAt(0).toUpperCase() + path.slice(1);
            if (domain in this.controllers) {
                let controller = this.controllers[domain];
                if (name in controller) {
                    log(`\x1b[1;34m[MAPPING ${the_path} -> ${domain}.${name} ]\x1b[0m `);
                    entry = controller[name];
                }
            }
        }
        if (!entry)
            if (method == 'options') {
                log(`\x1b[1;34m[CAPTURED ${the_path} CORS]\x1b[0m`);
                entry = this.controllers['/'].cors;
            }
            else {
                log(`\x1b[1;34m[MISMATCHED ${the_path} -> ${domain}.${name} ]\x1b[0m`);
            }
        if (typeof entry == 'function' && entry.args == undefined)
            entry.args = this.getArgs(entry);
        return entry;
    }
    getArgs(func) {
        return func.toString()
            .match(/.*?\(([^)]*)\)/)[1]
            .split(",")
            .map(arg => {
            return arg.replace(/(\/\*.*\*\/)|\?/, "").trim();
        })
            .filter(arg => { return arg; });
    }
    bindArgs() {
        for (let c in this.controllers) {
            for (let i in this.controllers[c]) {
                let method = this.controllers[c][i];
                if (typeof method == 'function')
                    method['args'] = this.getArgs(method);
            }
        }
    }
}
exports.Web = Web;
