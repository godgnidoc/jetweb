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
exports.Web = exports.RequestContext = exports.Request = void 0;
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
class Web {
    constructor(app, options = {}) {
        this.handleWebSocket = (request, socket, head) => {
            if (!this.wsServer) {
                this.wsServer = new ws.Server({ noServer: true, clientTracking: false, perMessageDeflate: true });
                this.wsServer.on('connection', (socket, request, entry) => {
                    setImmediate(() => {
                        this.log('[CONNECT %s]%s:%s', request.url, request.socket.remoteAddress, request.socket.remotePort);
                        socket.addListener('close', () => { this.log('[DISCONNECT %s]%s:%s', request.url, request.socket.remoteAddress, request.socket.remotePort); });
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
                res.statusCode = 404;
                this.error('[%s %s]', res.statusCode, req.url);
                res.write(`Are U lost ?`);
                res.end();
                return;
            }
            let request = new Request(req);
            let should_json = 'content-type' in req.headers && undefined != req.headers["content-type"].match(/.*application\/json.*/);
            let fired = false;
            const job = () => __awaiter(this, void 0, void 0, function* () {
                let handler = { response: res, request };
                let args = [];
                for (let name of this.dictateArgs(entry))
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
                    this.log('%s', e);
                    if (res.statusCode < 400)
                        res.statusCode = 500;
                }
                if (ret != undefined) {
                    res.setHeader('ContentType', 'application/json');
                    let rets = JSON.stringify(ret);
                    res.write(rets);
                    if (rets.length > 48)
                        ret = rets.slice(0, 40) + ' ...';
                }
                res.end();
                let params = {};
                url.searchParams.forEach((v, k) => { params[k] = v; });
                if (typeof request.json == 'object')
                    params = Object.assign(Object.assign({}, params), request.json);
                let params_str = JSON.stringify(params);
                if (params_str.length > 48)
                    params_str = params_str.slice(0, 40) + ' ...';
                else
                    params_str = params;
                if (res.statusCode >= 400) {
                    this.error(`[INCOMPLET %s] %s`, req.url, res.statusCode);
                    this.log(`[PARAMS %s]: %s`, req.url, params_str);
                    this.log(`[RETURN %s]: %s`, req.url, ret);
                }
                else {
                    this.log(`[COMPLET %s] %s`, req.url, res.statusCode);
                    this.log(`[PARAMS %s]: %s`, req.url, params_str);
                    this.log(`[RETURN %s]: %s`, req.url, ret);
                }
            });
            req.on('data', data => {
                request.body += data;
                const ends = ['l', 'e', '"', ']', '}', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
                const frag = `${data}`.trimEnd();
                const end = frag[frag.length - 1];
                if (should_json && ends.includes(end)) {
                    try {
                        request.json = JSON.parse(request.body);
                        request.body = '';
                        fired = true;
                        job();
                    }
                    catch (_a) {
                    }
                }
            });
            req.on('end', () => __awaiter(this, void 0, void 0, function* () {
                if (!fired) {
                    fired = true;
                    if (should_json && request.json == undefined) {
                        res.statusCode = 400;
                        res.write('Json parse failed');
                        res.end();
                    }
                    else {
                        job();
                    }
                }
            }));
            if (this.options.cors === true) {
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Methods', 'GET,POST');
                res.setHeader('Access-Control-Allow-Headers', 'x-requested-with,content-type');
            }
        };
        this.options = options;
        if (undefined == options.logging)
            options.logging = {};
        if (undefined == options.logging.color)
            options.logging.color = true;
        if (undefined == options.logging.timestamp)
            options.logging.timestamp = true;
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
        this.info(`web server listening localhost:${this.options.port}`);
        this.server.listen(this.options.port);
    }
    init(ctrls) {
        this.app = { '/': {} };
        for (let name in ctrls)
            this.app[name.toLowerCase()] = ctrls[name];
        if (!this.options.port)
            this.options.port = 5000;
        if (typeof this.options.cors == 'function')
            this.app['__cors'] = this.options.cors;
        else if (this.options.cors)
            this.app['__cors'] = () => { return; };
        else
            this.app['__cors'] = null;
        if (this.options.static) {
            this.mapping = {};
            this.map(this.app);
        }
    }
    map(app, baseUrl = '/') {
        for (let key in app) {
            const entry = app[key];
            if (typeof entry == 'function') {
                const frags = entry.name.match(/(.[^A-Z]*)/g);
                const method = frags.shift().toLowerCase();
                this.mapping[`${method}:${baseUrl}${frags.join('').toLowerCase()}`] = entry;
                this.mapping[`${method}:${baseUrl}${frags.join('_').toLowerCase()}`] = entry;
            }
            else if (typeof entry == 'object') {
                const frags = key.match(/(.[^A-Z]*)/g);
                this.map(entry, baseUrl + frags.join('').toLowerCase() + '/');
                this.map(entry, baseUrl + frags.join('_').toLowerCase() + '/');
            }
        }
    }
    getEntry(path, method) {
        let entry = null;
        path = path.toLowerCase();
        method = method.toLowerCase();
        if (this.mapping) {
            const key = `${method}:${path}`;
            if (key in this.mapping) {
                this.log('[FAST-MAPPING %s]', path);
                entry = this.mapping[key];
            }
        }
        if (!entry) {
            if (method == 'options') {
                this.log(`[CAPTURED %s CORS]`, path);
                entry = this.app.__cors;
            }
            else {
                this.warn(`[MISMATCHED %s ]`, path);
            }
        }
        return entry;
    }
    dictateArgs(func) {
        if (func['__args'])
            return func['__args'];
        func['__args'] = func.toString()
            .match(/.*?\(([^)]*)\)/)[1]
            .split(",")
            .map(arg => arg.replace(/(\/\*.*\*\/)|\?/, "").trim())
            .filter(arg => arg);
        return func['__args'];
    }
    info(fmt, ...args) {
        console.info(this.format('INFO', fmt), ...args);
    }
    error(fmt, ...args) {
        console.error(this.format('ERROR', fmt), ...args);
    }
    warn(fmt, ...args) {
        console.warn(this.format('WARN', fmt), ...args);
    }
    log(fmt, ...args) {
        console.log(this.format('LOG', fmt), ...args);
    }
    format(sev, fmt) {
        var _a, _b;
        let _fmt = fmt;
        if (this.options.logging.color) {
            _fmt = _fmt.replace(/%[^%]/g, sub => `\x1b[1;36m${sub}\x1b[0m`);
        }
        if ((_a = this.options.logging) === null || _a === void 0 ? void 0 : _a.color) {
            switch (sev) {
                case 'log':
                case 'LOG':
                    _fmt = `\x1b[1m${sev}\x1b[0m: ` + _fmt;
                    break;
                case 'info':
                case 'INFO':
                    _fmt = `\x1b[1;34m${sev}\x1b[0m: ` + _fmt;
                    break;
                case 'warn':
                case 'WARN':
                    _fmt = `\x1b[1;35m${sev}\x1b[0m: ` + _fmt;
                    break;
                case 'error':
                case 'ERROR':
                    _fmt = `\x1b[1;31m${sev}\x1b[0m: ` + _fmt;
                    break;
            }
        }
        else {
            _fmt = sev + ': ' + _fmt;
        }
        if ((_b = this.options.logging) === null || _b === void 0 ? void 0 : _b.timestamp) {
            _fmt = `[${(new Date()).toLocaleString()}] ` + _fmt;
        }
        return _fmt;
    }
}
exports.Web = Web;
