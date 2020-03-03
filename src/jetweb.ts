import * as https from 'https'
import * as http from 'http'
import * as net from 'net'
import * as ws from 'ws'
import {URL} from 'url'

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
    incomingMessage : http.IncomingMessage

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

    constructor( request : http.IncomingMessage ) {
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
    request : Request

    /**
     * @property respons : 响应对象
     * @description
     *  通过响应对象，您可以手动指定一些响应操作
     */
    response : http.ServerResponse
}

export type WebSocketHandler = (this: WebSocket, request: http.IncomingMessage) => void
export type RequestHandler = (this:RequestContext, ... args: any[] )=>void


/**
 * @interface Controller : 控制器接口
 */
export interface Controller {
    [index:string] : WebSocketHandler | RequestHandler
}

/**
 * @interface Application : 应用接口
 */
export interface Application {
    [index:string] : Controller
}

/**
 * @function 打印带时间戳的日志
 * @param args 日志内容
 */
export function log( ... args : any[] ) {
    let date = new Date()    
    console.log(`[${date.toLocaleString()}] => `, ... args)
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
    http ?: http.ServerOptions
}

/**
 * @class Web : 服务器类
 * @description
 *  将此类实例化以运行服务器
 */
export class Web {
    controllers : Application
    server : http.Server | https.Server
    wsServer : ws.Server
    mapping : object
    options : ServerOptions

    /**
     * @constructor
     * @param app 应用对象
     * @param options 服务器选项
     */
    constructor( app : Application, options : ServerOptions = {} ) {
        this.options = options
        this.init(app)
        if( options.ssl ) this.server = https.createServer(options.ssl,this.handleRequest)
        else if( options.http ) this.server = http.createServer(options.http, this.handleRequest)
        else this.server = http.createServer(this.handleRequest)
        this.server.on('upgrade', this.handleWebSocket)
    }

    /**
     * @method listen 运行服务器
     * @param port 端口号，若设置此参数，可覆盖配置项
     */
    public listen( port ?: number ) {
        if( port ) this.options.port = port
        log(`web server listening localhost:${this.options.port}`)
        this.server.listen(this.options.port)
    }

    private init( ctrls : Application ) {
        this.controllers = {'/':{}}
        for( let name in ctrls ) this.controllers[name.toLowerCase()] = ctrls[name]

        if( !this.options.port ) this.options.port = 5000

        if( typeof this.options.cors == 'function' ) this.controllers['/']['cors'] = this.options.cors
        else if( this.options.cors ) this.controllers['/']['cors'] = ()=>{return}
        else this.controllers['/']['cors'] = null

        this.bindArgs()

        if( this.options.static ) this.map()
    }

    private map() {
        this.mapping = {}
        for( let c in this.controllers ) {
            for( let m in this.controllers[c] ) {
                if( c != '/' ) {
                    let entry = this.controllers[c][m]
                    if( typeof entry == 'function' ) {
                        let key = c.toLowerCase()
                        let paths = entry.name.match(/.[^A-Z]*/g)
                        let method = paths.shift().toLowerCase()
                        for( let path of paths ) key += `/${path.toLowerCase()}`
                        this.mapping[`${method}/${key}`] = entry
                    }
                }
            }
        }
    }

    /**
     * @method getEntry : 获取入口
     * @description 通过请求路径和方法确定路由入口，确保入口不需要后续处理，确保入口参数列表被指定
     * @param the_path 请求路径
     * @param method 请求方法
     */
    private getEntry( the_path : string, method : string ) : WebSocketHandler | RequestHandler {
        let entry = null
        the_path = the_path.toLowerCase()
        let name = method = method.toLowerCase()
        let domain = ''
        if( this.mapping ) {
            name += the_path
            if( name in this.mapping ) {
                log(`\x1b[1;34m[FAST-MAPPING ${the_path}]\x1b[0m `)
                entry = this.mapping[name]
            }
        } else {
            let splits = the_path == '/'?['/']:the_path.split('/')
            while( !domain ) domain = splits.shift().toLowerCase()
            for( var path of splits ) name += path.charAt(0).toUpperCase() + path.slice(1)
            if( domain in this.controllers ) {
                let controller = this.controllers[domain]
                if( name in controller ) {
                    log(`\x1b[1;34m[MAPPING ${the_path} -> ${domain}.${name} ]\x1b[0m `)
                    entry = controller[name]
                }
            }
        }
        if( !entry )
            if( method == 'options' ) {
                log(`\x1b[1;34m[CAPTURED ${the_path} CORS]\x1b[0m`)
                entry = this.controllers['/'].cors
            } else {
                log(`\x1b[1;34m[MISMATCHED ${the_path} -> ${domain}.${name} ]\x1b[0m`)
            }
        if( typeof entry == 'function' && entry.args == undefined ) entry.args = this.getArgs(entry)
        return entry
    }

    private handleWebSocket = (request : http.IncomingMessage, socket : net.Socket, head: Buffer ) => {
        if( !this.wsServer ) {
            this.wsServer = new ws.Server({noServer:true})
            this.wsServer.on('connection', ( 
                    socket : WebSocket, 
                    request: http.IncomingMessage, 
                    entry: WebSocketHandler) => {
                log(`\x1b[34m[CONNECT ${request.url}]\x1b[0m${request.connection.remoteAddress}:${request.connection.remotePort}`)
                if( entry ) entry.call(socket, request)
                socket.addListener('close', () => {
                    log(`\x1b[34m[DISCONNECT ${request.url}]\x1b[0m${request.connection.remoteAddress}:${request.connection.remotePort}`)
                } )
            })
        }
        let url = new URL('http://localhost'+request.url)
        let entry = this.getEntry(url.pathname, 'ws')
        if( !entry ) {socket.destroy(); return}
        this.wsServer.handleUpgrade(request,socket,head, (client: WebSocket) => {
            this.wsServer.emit('connection', client, request, entry)
        })
    }

    private handleRequest = ( req : http.IncomingMessage, res : http.ServerResponse) => {
        let url = new URL('http://localhost'+req.url)
        let entry = this.getEntry(url.pathname, req.method)
        
        if( !entry || typeof entry != 'function' ) {
            log(`\x1b[1;33m[404 ${req.url}]\x1b[0m`)
            res.statusCode = 404
            res.write(`Are U lost ?`)
            res.end()
            return
        }
        
        let request = new Request(req)
        req.on('data', data => {request.body += data})
        req.on('end', async () => {
            if( 'content-type' in req.headers && req.headers["content-type"].match(/.*application\/json.*/) ) {
                try {
                    request.json = JSON.parse(request.body)
                    request.body = undefined
                } catch( e ) {
                    res.statusCode = 400
                    res.write('Json parsing failed')
                    res.end()
                    return
                }
            }

            let handler : RequestContext = {response: res,request}
            let args = []
            for( let name of entry['args'] )
                if( typeof request.json == 'object' && name in request.json ) args.push(request.json[name])
                else if( url.searchParams.has(name) ) args.push( url.searchParams[name])
                else args.push(undefined)

            let ret = undefined
            let color = '\x1b[1;32m'
            try {
                ret = await entry.apply(handler, args)
            } catch( e ) {
                log(e)
                if( res.statusCode < 400 ) res.statusCode = 500
            } finally {
                if( res.statusCode >= 400 ) color = '\x1b[1;31m'
            }
            if( ret != undefined ) {
                res.setHeader('ContentType', 'application/json')
                let rets = JSON.stringify(ret)
                res.write(rets)
                if( rets.length > 1024 ) ret = rets.slice(0,1024) + ' ...'
            }
            res.end()

            let params : any = {}
            url.searchParams.forEach((v,k)=>{params[k] = v})
            if( typeof request.json == 'object' ) params = {...params, ...request.json}
            let params_str = JSON.stringify(params)
            if( params_str.length > 1024 ) params_str = params_str.slice(0, 1024) + ' ...'
            else params_str = params
            log(`${color}[COMPLET ${req.url} ${res.statusCode}]`,
                `\n\t\x1b[1;36m[PARAMS]\x1b[0m`, params_str,
                `\n\t\x1b[1;36m[RETURN]\x1b[0m `, ret
                )
        })
        if( this.options.cors === true ) {
            res.setHeader('Access-Control-Allow-Origin','*')
            res.setHeader('Access-Control-Allow-Methods','GET,POST')
            res.setHeader('Access-Control-Allow-Headers','x-requested-with,content-type')
        }
    }

    private getArgs(func : Function ) : string[] {
        return func.toString()
            .match(/.*?\(([^)]*)\)/)[1]
            .split(",")
            .map(arg => {
                return arg.replace(/(\/\*.*\*\/)|\?/, "").trim()
            })
            .filter( arg => {return arg})
    }

    private bindArgs() : void {
        for( let c in this.controllers ) {
            for( let i in this.controllers[c] ) {
                let method = this.controllers[c][i]
                if( typeof method == 'function' )
                    method['args'] = this.getArgs(method)
            }
        }
    }
}