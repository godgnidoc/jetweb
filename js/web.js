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
function log(str) {
    let date = new Date();
    console.log(`[${date.toLocaleString()}] => ${str.toString()}`);
}
class WebServerOptions {
    constructor() {
        this.methods = {};
        this.port = 5000;
    }
}
exports.WebServerOptions = WebServerOptions;
class Proc {
    constructor(req, res) {
        this.request = req;
        this.response = res;
    }
    route(entry) {
        return __awaiter(this, void 0, void 0, function* () {
            this.response.setHeader('Access-Control-Allow-Origin', '*');
            this.response.setHeader('Access-Control-Allow-Methods', 'GET,POST');
            this.response.setHeader('Access-Control-Allow-Headers', 'x-requested-with,content-type');
            log(`\x1b[1;36m[PARAMS]\x1b[0m ${JSON.stringify(this.request['params'])}`);
            if (!entry) {
                log(`\x1b[1;33m[404]\x1b[0m ${this.request.url}`);
                this.response.statusCode = 404;
                this.response.write(`Are U lost ?`);
            }
            else
                try {
                    let args = [];
                    for (let name of entry['args'])
                        if (name in this.request['params']) {
                            args.push(this.request['params'][name]);
                        }
                        else {
                            args.push(undefined);
                        }
                    let ret = yield entry.apply(this, args);
                    if (ret) {
                        this.response.setHeader('ContentType', 'application/json');
                        ret = JSON.stringify(ret);
                        this.response.write(ret);
                        log(`\x1b[1;36m[RETURN]\x1b[0m ${ret}`);
                    }
                    log(`\x1b[1;32m[200]\x1b[0m ${this.request.url} routed to ${entry.name}`);
                }
                catch (e) {
                    log(e);
                    this.response.statusCode = 500;
                    log(`\x1b[1;31m[500]\x1b[0m ${this.request.url} routed to ${entry.name}`);
                }
            this.response.end();
        });
    }
}
class Web {
    constructor(options) {
        this.port = 5000;
        this.methods = options.methods;
        if (options.port)
            this.port = options.port;
        this.bindArgs();
        this.server = http.createServer((req, res) => {
            let url = new URL('http://localhost' + req.url);
            let entry = this.getEntry(url.pathname, req.method);
            req['params'] = {};
            url.searchParams.forEach((v, k) => { req['params'][k] = v; });
            req['body'] = '';
            req.on('data', data => { req['body'] += data; });
            req.on('end', () => {
                try {
                    req['json'] = JSON.parse(req['body']);
                    if (typeof req['json'] == 'object') {
                        req['params'] = Object.assign(Object.assign({}, req['params']), req['json']);
                    }
                }
                catch (e) {
                }
                let proc = new Proc(req, res);
                proc.route(entry);
            });
        });
    }
    getEntry(the_path, method) {
        let name = method.toLowerCase();
        for (var path of the_path.split('/'))
            name += path.charAt(0).toUpperCase() + path.slice(1);
        log(`\x1b[1;34m[MAPPING ${the_path} -> ${name} ]\x1b[0m `);
        if (name in this.methods)
            return this.methods[name];
        else
            return null;
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
        for (let i in this.methods) {
            let method = this.methods[i];
            method.args = this.getArgs(method);
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
