declare module "jetweb" {
    import {IncomingMessage, ServerResponse} from 'http'

    /**
     * @function 打印带时间戳的日志
     * @param args 日志内容
     */
    function log( ... args : any[] ) : void

    /**
     * @class WebServerOptions : Web服务器选项
     * @desc
     *  此结构用于构造Web服务器时对服务器进行配置
     */
    class WebServerOptions {

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
        cors? : Function | boolean

        /**
         * @property static : 静态映射
         * @desc
         *  此选项控制web服务器是否建立并启用静态映射表以提高性能  
         *  默认`false`
         */
        static? : boolean
    }

    /**
     * @class ClientRequest : 客户端请求
     * @desc
     *  此结构扩展了http输入信息结构
     */
    class ClientRequest extends IncomingMessage {

        /**
         * @property params : 所有请求参数
         * @desc
         *  包括查询请求内的所有参数
         *  若请求体被解析为json对象，其中的属性也会被填写进来
         *  若重名，json请求体的属性会覆盖查询请求
         */
        params: object

        /**
         * @property body : 请求体原文
         * @desc
         *  请求体字符串形式的原文内容
         */
        body: string

        /**
         * @property json : 请求体json
         * @desc
         *  若请求体被解析为json，无论数据类型如何，此属性用于保存解析成功的json变量
         */
        json?: any
    }

    /**
     * @var injection : 注入体
     * @description: 将此对象注入控制器，即可获得正确的代码提示
     */
    let injection : {
        /**
         * @property request : 请求对象
         * @desc
         *  包含与请求相关的信息
         */
        request : ClientRequest

        /**
         * @property response : 响应对象
         * @desc
         *  用于手动控制响应动作
         */
        response : ServerResponse
    }

    /**
     * @class Web : 服务器类
     * @desc：
     *  将此类实例化以运行服务器
     */
    class Web {

        /**
         * @constructor
         * @param controllers 控制器集合
         * @param options 服务器选项
         */
        constructor( controllers : object, options : WebServerOptions )

        /**
         * @method run 运行服务器
         * @param port 端口号，若设置此参数，可覆盖配置项
         */
        run( port?: number ) : void
    }
}