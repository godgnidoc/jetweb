declare module "jetweb" {
    import * as http from 'http'
    import * as https from 'https'

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
        cors? : Function | boolean

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
         * @param controllers 控制器集合
         * @param options 服务器选项
         */
        constructor( controllers : object, options : ServerOptions )

        /**
         * @method run 运行服务器
         * @param port 端口号，若设置此参数，可覆盖配置项
         */
        run( port?: number ) : void
    }
}