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
const http = require("http");
const url_1 = require("url");
function log(...args) {
    let date = new Date();
    console.log(`[${date.toLocaleString()}] => `, ...args);
}
exports.log = log;
class WebServerOptions {
}
exports.WebServerOptions = WebServerOptions;
exports.injection = {
    request: http.IncomingMessage,
    response: http.ServerResponse
};
class Web {
    constructor(controllers, options = {}) {
        this.controllers = {};
        this.mapping = null;
        this.handler = (req, res) => {
            let url = new url_1.URL('http://localhost' + req.url);
            let entry = this.getEntry(url.pathname, req.method);
            req['params'] = {};
            url.searchParams.forEach((v, k) => { req['params'][k] = v; });
            req['body'] = '';
            req.on('data', data => { req['body'] += data; });
            req.on('end', () => {
                if ('content-type' in req.headers && req.headers["content-type"].match(/.*application\/json.*/))
                    try {
                        req['json'] = JSON.parse(req['body']);
                        if (typeof req['json'] == 'object') {
                            req['params'] = Object.assign(Object.assign({}, req['params']), req['json']);
                        }
                    }
                    catch (e) {
                        log(e);
                    }
                let proc = new Proc(req, res);
                proc.route(entry);
            });
        };
        this.init(controllers, options);
        this.server = http.createServer(this.handler);
    }
    init(ctrls, options) {
        for (let name in ctrls)
            this.controllers[name.toLowerCase()] = ctrls[name];
        this.controllers['/'] = {};
        if (options.port)
            this.port = options.port;
        else
            this.port = 5000;
        if (typeof options.cors == 'function')
            this.controllers['/']['cors'] = options.cors;
        else if (options.cors)
            this.controllers['/']['cors'] = () => {
                this['response'].setHeader('Access-Control-Allow-Origin', '*');
                this['response'].setHeader('Access-Control-Allow-Methods', 'GET,POST');
                this['response'].setHeader('Access-Control-Allow-Headers', 'x-requested-with,content-type');
                return undefined;
            };
        else
            this.controllers['/']['cors'] = null;
        this.bindArgs();
        if (options.static)
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
            let splits = the_path.split('/');
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
        if (entry && entry.args == undefined)
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
                    method.args = this.getArgs(method);
            }
        }
    }
    run(port) {
        if (port)
            this.port = port;
        log(`web server listening localhost:${this.port}`);
        this.server.listen(this.port);
    }
}
exports.Web = Web;
class Proc {
    constructor(req, res) {
        this.request = req;
        this.response = res;
    }
    route(entry) {
        return __awaiter(this, void 0, void 0, function* () {
            let params_str = JSON.stringify(this.request['params']);
            if (params_str.length > 1024)
                params_str = params_str.slice(0, 1024) + ' ...';
            else
                params_str = this.request['params'];
            log(`\x1b[1;36m[PARAMS ${this.request.url}]\x1b[0m `, params_str);
            if (!entry) {
                log(`\x1b[1;33m[404 ${this.request.url}]\x1b[0m`);
                this.response.statusCode = 404;
                this.response.write(`Are U lost ?`);
            }
            else
                try {
                    let args = [];
                    for (let name of entry['args'])
                        if (name in this.request['params'])
                            args.push(this.request['params'][name]);
                        else
                            args.push(undefined);
                    let ret = yield entry.apply(this, args);
                    if (ret != undefined) {
                        this.response.setHeader('ContentType', 'application/json');
                        ret = JSON.stringify(ret);
                        this.response.write(ret);
                        if (ret.length > 1024)
                            ret = ret.slice(0, 1024) + ' ...';
                        log(`\x1b[1;36m[RETURN ${this.request.url}]\x1b[0m `, ret);
                    }
                    log(`\x1b[1;32m[${this.response.statusCode} ${this.request.url}]\x1b[0m`);
                }
                catch (e) {
                    log(e);
                    this.response.statusCode = 500;
                    log(`\x1b[1;31m[500 ${this.request.url}]\x1b[0m`);
                }
            this.response.end();
        });
    }
}
