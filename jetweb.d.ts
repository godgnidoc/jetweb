declare module "jetweb" {
    import * as http from 'http'
    import * as https from 'https'
    import * as ws from 'ws'

    /**
     * @type WebSocket : WebSocket连接
     * @description
     *  重新导出WebSocket连接类，方便使用
     */
    type WebSocket = ws

    /**
     * @class Request : 请求对象
     * @description
     *  请求对象包含了Http/Https请求所携带的所有信息
     */
    class Request {

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
        body: string
    }

    /**
     * @class RequestHandler : 请求处理器
     * @description
     *  此对象会被注入为接口函数的`this`对象
     */
    class RequestContext {

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

    type WebSocketHandler = (this: WebSocket, request: http.IncomingMessage) => void
    type RequestHandler = (this:RequestContext, ... args: any[] )=>void


    /**
     * @interface Controller : 控制器接口
     */
    interface Controller {
        [index:string] : WebSocketHandler | RequestHandler
    }

    /**
     * @interface Application : 应用接口
     */
    interface Application {
        [index:string] : Controller
    }

    /**
     * @function 打印带时间戳的日志
     * @param args 日志内容
     */
    function log( ... args : any[] ) : void

    /**
     * @interface ServerOptions : Web服务器选项
     * @desc
     *  此结构用于构造Web服务器时对服务器进行配置
     */
    interface ServerOptions {

        /**
         * @property port : 端口号
         * @desc  
         *  服务器即将监听的端口号，默认`5000`
         */
        port? : number

        /**
         * @property cors : 跨域资源共享控制
         * @desc
         *  此属性控制服务器对跨域资源共享请求的处理  
         *  当一个`header`请求没有被接口捕捉时，参考此选项  
         *  - `undefined`|`null`|`false` : 不做任何处理，即将返回404
         *  - `true` : 使用默认函数返回200，并附加开放的`header`表示跨域许可
         *  - `function` : 使用此指定函数处理请求  
         *  默认`false`
         */
        cors? : RequestHandler | boolean

        /**
         * @property static : 静态映射
         * @desc
         *  此选项控制web服务器是否建立并启用静态映射表以提高性能  
         *  默认`false`
         */
        static? : boolean

        /**
         * @property ssl : ssl配置项
         * @desc
         *  若设置了此选项，则Web服务器使用https服务器
         */
        ssl? : https.ServerOptions

        /**
         * @property http : http配置项
         * @description
         *  若设置了此选项，则Web服务器会将此对象传入http服务器的构造函数以配置服务器
         */
        http ?: http.ServerOptions
    }

    /**
     * @class Web : 服务器类
     * @desc：
     *  将此类实例化以运行服务器
     */
    class Web {

        server : https.Server | http.Server

        /**
         * @constructor
         * @param app 应用对象
         * @param options 服务器选项
         */
        constructor( app : Application, options? : ServerOptions )

        /**
         * @method listen 运行服务器
         * @param port 端口号，若设置此参数，可覆盖配置项
         */
        listen( port?: number ) : void
    }
}