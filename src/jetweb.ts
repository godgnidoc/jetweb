import * as https from 'https'
import * as http from 'http'
import * as net from 'net'
import * as ws from 'ws'
import { URL } from 'url'

/**
 * @type WebSocket : WebSocket连接
 * @description
 *  重新导出WebSocket连接类，方便使用
 */
export type WebSocket = ws

/**
 * @class Request : 请求对象
 * @description
 *  请求对象包含了Http/Https请求所携带的所有信息
 */
export class Request {

    /**
     * @property incomingMessage : 请求信息
     * @description
     *  http模块提供的用于处理输入信息的源对象
     */
    incomingMessage: http.IncomingMessage

    /**
     * @property json : json参数
     * @description
     *  若请求头携带Content-Type: application/json则jetweb试图解析请求体为json
     */
    json?: object

    /**
     * @property body : 请求体
     * @description
     *  请求体的原数据，字符串格式
     *  若请求体被成功解析为json则此对象不被注入
     */
    body: string = ''

    constructor(request: http.IncomingMessage) {
        this.incomingMessage = request
    }
}

/**
 * @class RequestHandler : 请求处理器
 * @description
 *  此对象会被注入为接口函数的`this`对象
 */
export class RequestContext {

    /**
     * @property request : 请求对象
     * @description
     *  请求对象包含了关于客户端请求的所有信息
     */
    request: Request

    /**
     * @property respons : 响应对象
     * @description
     *  通过响应对象，您可以手动指定一些响应操作
     */
    response: http.ServerResponse
}

export type WebSocketHandler = (this: WebSocket, request: http.IncomingMessage) => void
export type RequestHandler = (this: RequestContext, ...args: any[]) => void
export type RequestErrorHandler = (this: RequestContext, error: Error) => void

/**
 * @interface Application : 应用接口
 */
export interface Application {
    [index: string]: WebSocketHandler | RequestHandler | Application
}

/**
 * @interface ServerOptions : Web服务器选项
 * @description
 *  此结构用于构造Web服务器时对服务器进行配置
 */
export interface ServerOptions {

    /**
     * @property port : 端口号
     * @description  
     *  服务器即将监听的端口号，默认`5000`
     * @default 5000
     */
    port?: number

    /**
     * @property cors : 跨域资源共享控制
     * @description
     *  此属性控制服务器对跨域资源共享请求的处理  
     *  当一个`header`请求没有被接口捕捉时，参考此选项  
     *  - `undefined`|`null`|`false` : 不做任何处理，即将返回404
     *  - `true` : 使用默认函数返回200，并附加开放的`header`表示跨域许可
     *  - `function` : 使用此指定函数处理请求  
     *  @default false
     */
    cors?: RequestHandler | boolean

    /**
     * @property static : 静态映射
     * @description
     *  此选项控制web服务器是否建立并启用静态映射表以提高性能  
     *  @default false
     */
    static?: boolean

    /**
     * @property ssl : ssl配置项
     * @description
     *  若设置了此选项，则Web服务器使用https服务器
     */
    ssl?: https.ServerOptions

    /**
     * @property http : http配置项
     * @description
     *  若设置了此选项，则Web服务器会将此对象传入http服务器的构造函数以配置服务器
     */
    http?: http.ServerOptions

    /**
     * @property 日志相关参数
     */
    logging?: {

        /** 
         * @property 输出日志时是否主动附加时间戳
         * @default true
         */
        timestamp?: boolean

        /** 
         * @property 输出日志时是否主动附加颜色 
         * @default true
         */
        color?: boolean
    }

    /**
     * @property catch : 异常捕捉器
     * @description 
     * 此选项用于捕捉接口函数中的异常
     * 若设置了此选项，则当接口函数中抛出异常时，将会调用此函数
     * @default undefined
     */
    catch?: RequestErrorHandler

    /**
     * @property error : 错误处理器
     * @description
     * 此选项用于捕获接口返回值为 Error 实例的情况
     * 若设置了此选项，则当接口函数返回值为 Error 实例时，将会调用此函数
     * @default undefined
     */
    error?: RequestErrorHandler
}

/**
 * @class Web : 服务器类
 * @description
 *  将此类实例化以运行服务器
 */
export class Web {
    app: Application
    server: http.Server | https.Server
    wsServer: ws.Server
    mapping: object
    options: ServerOptions

    /**
     * @constructor
     * @param app 应用对象
     * @param options 服务器选项
     */
    constructor(app: Application, options: ServerOptions = {}) {
        this.options = options
        if (undefined == options.logging) options.logging = {}
        if (undefined == options.logging.color) options.logging.color = true
        if (undefined == options.logging.timestamp) options.logging.timestamp = true

        this.init(app)

        if (options.ssl) this.server = https.createServer(options.ssl, this.handleRequest)
        else if (options.http) this.server = http.createServer(options.http, this.handleRequest)
        else this.server = http.createServer(this.handleRequest)
        this.server.on('upgrade', this.handleWebSocket)
    }

    /**
     * @method listen 运行服务器
     * @param port 端口号，若设置此参数，可覆盖配置项
     */
    public listen(port?: number) {
        if (port) this.options.port = port
        console.info(`web server listening localhost:${this.options.port}`)
        this.server.listen(this.options.port)
    }

    private init(app: Application) {
        this.app = app

        if (!this.options.port) this.options.port = 5000

        if (typeof this.options.cors == 'function') this.app['__cors'] = this.options.cors
        else if (this.options.cors) this.app['__cors'] = () => { return }
        else this.app['__cors'] = null

        if (this.options.static) {
            this.mapping = {}
            this.map(this.app)
            console.debug("static mapping:", Object.keys(this.mapping)
                .map(key => (key + ' => ' + this.dictateArgs(this.mapping[key]).toString())))
        }
    }

    private map(app: Application, baseUrl = '/') {
        for (let key in app) {
            const entry = app[key]
            if (typeof entry == 'function') {
                const frags = key.match(/(.[^A-Z]*)/g)
                const method = frags.shift().toLowerCase()
                this.mapping[`${method}:${baseUrl}${frags.join('').toLowerCase()}`] = entry
                this.mapping[`${method}:${baseUrl}${frags.join('_').toLowerCase()}`] = entry
            } else if (typeof entry == 'object') {
                const frags = key.match(/(.[^A-Z]*)/g)
                this.map(entry, baseUrl + frags.join('').toLowerCase() + '/')
                this.map(entry, baseUrl + frags.join('_').toLowerCase() + '/')
            }
        }
    }

    /**
     * @method getEntry : 获取入口
     * @description 通过请求路径和方法确定路由入口，确保入口不需要后续处理，确保入口参数列表被指定
     * @param path 请求路径
     * @param method 请求方法
     */
    private getEntry(raw_path: string, method: string): WebSocketHandler | RequestHandler {
        let entry = null
        const path = raw_path.toLowerCase()
        method = method.toLowerCase()
        if (this.mapping) {
            // 快速查找
            const key = `${method}:${path}`
            if (key in this.mapping) {
                console.log('[FAST-MAPPING %s]', path)
                entry = this.mapping[key]
            }
        }

        if (!entry) {
            // 逐级查找
            const frags = raw_path.split('/').filter(x => x)
            const final = method + frags.pop()
            let app = this.app
            while (frags.length > 0) {
                const key = frags.shift()
                if (key in app) {
                    const inner = app[key]
                    if (typeof inner == 'function') {
                        app = null
                        break
                    }
                    app = inner
                } else {
                    app = null
                    break
                }
            }
            if (app && final in app && typeof app[final] == 'function') {
                entry = app[final]
            }
        }

        // CORS
        if (!entry) {
            if (method == 'options') {
                console.log(`[CAPTURED %s CORS]`, raw_path)
                entry = this.app.__cors
            } else {
                console.warn(`[MISMATCHED %s ]`, raw_path)
            }
        }
        return entry
    }

    private handleWebSocket = (request: http.IncomingMessage, socket: net.Socket, head: Buffer) => {
        if (!this.wsServer) {
            this.wsServer = new ws.Server({ noServer: true, clientTracking: false, perMessageDeflate: true })
            this.wsServer.on('connection', (socket: WebSocket, request: http.IncomingMessage, entry: WebSocketHandler) => {
                setImmediate(() => {
                    console.log('[CONNECT %s]%s:%s', request.url, request.socket.remoteAddress, request.socket.remotePort)
                    socket.addListener('close', () => { console.log('[DISCONNECT %s]%s:%s', request.url, request.socket.remoteAddress, request.socket.remotePort) })
                    if (entry) entry.call(socket, request)
                    else socket.close()
                })
            })
        }
        let url = new URL('http://localhost' + request.url)
        let entry = this.getEntry(url.pathname, 'ws')
        if (!entry) { socket.destroy(); return }
        this.wsServer.handleUpgrade(request, socket, head, (client: WebSocket) => {
            this.wsServer.emit('connection', client, request, entry)
        })
    }

    private handleRequest = (req: http.IncomingMessage, res: http.ServerResponse) => {
        let url = new URL('http://localhost' + req.url)
        let entry = this.getEntry(url.pathname, req.method)

        if (!entry || typeof entry != 'function') {
            res.statusCode = 404
            console.error('[%s %s]', res.statusCode, req.url)
            res.write(`Are U lost ?`)
            res.end()
            return
        }

        let request = new Request(req)
        if (this.options.cors === true) {
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.setHeader('Access-Control-Allow-Methods', 'GET,POST')
            res.setHeader('Access-Control-Allow-Headers', 'x-requested-with,content-type')
        }

        const job = async () => {
            let handler: RequestContext = { response: res, request }
            let args = []
            for (let name of this.dictateArgs(entry))
                if (typeof request.json == 'object' && name in request.json) args.push(request.json[name])
                else if (url.searchParams.has(name)) args.push(url.searchParams.get(name))
                else args.push(undefined)

            let ret = undefined
            try {
                ret = await entry.apply(handler, args)
            } catch (e: any) {
                console.error('%s', e)
                if (res.statusCode < 400) res.statusCode = 500
                try {
                    if (this.options.catch) ret = await this.options.catch.call(handler, e)
                } catch (e) {
                    console.error('%s', e)
                }
            }

            if (ret instanceof Error && this.options.error) {
                try {
                    ret = await this.options.error.call(handler, ret)
                } catch (e) {
                    console.error('%s', e)
                }
            } 
            
            if (ret !== undefined) {
                res.setHeader('ContentType', 'application/json')
                let rets = JSON.stringify(ret)
                res.write(rets)
                if (rets.length > 48) ret = rets.slice(0, 40) + ' ...'
            }
            res.end()

            let params: any = {}
            url.searchParams.forEach((v, k) => { params[k] = v })
            if (typeof request.json == 'object') params = { ...params, ...request.json }
            let params_str = JSON.stringify(params)
            if (params_str.length > 48) params_str = params_str.slice(0, 40) + ' ...'
            else params_str = params

            if (res.statusCode >= 400) {
                console.error(`[INCOMPLET %s] %s`, req.url, res.statusCode)
                console.log(`[PARAMS %s]: %s`, req.url, params_str)
                console.log(`[RETURN %s]: %s`, req.url, ret)
            } else {
                console.log(`[COMPLET %s] %s`, req.url, res.statusCode)
                console.log(`[PARAMS %s]: %s`, req.url, params_str)
                console.log(`[RETURN %s]: %s`, req.url, ret)
            }
        }

        if (
            !('content-type' in req.headers) ||
            undefined == req.headers["content-type"].toLowerCase().match(/.*application\/json.*/)) {
            job()
            return
        }

        req.on('data', data => { request.body += data })
        req.on('end', async () => {
            try {
                request.json = JSON.parse(request.body)
                request.body = undefined
                job()
            } catch {
                res.statusCode = 400
                res.write('Json parse failed')
                res.end()
                return
            }
        })
    }

    private dictateArgs(func: Function): string[] {
        if (func['__args']) return func['__args']
        func['__args'] = func.toString()
            .match(/.*?\(([^)]*)\)/)[1]
            .split(",")
            .map(arg => arg.replace(/(\/\*.*\*\/)|\?/, "").trim())
            .filter(arg => arg)
        return func['__args']
    }
}