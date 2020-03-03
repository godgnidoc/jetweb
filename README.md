# 0. 概述

`jetweb`框架是超轻量级`web`服务框架，具备**访问路径自动映射**，**请求参数自动注入**，**跨域资源共享自动应答**等功能。在小规模，项目上可以有效降低开发工作量。

`jetweb`仅适用于开发`web`后端程序，因为`jetweb`对接口的请求，返回格式做出了限定，以此追求便捷的自动映射功能。

`jetweb`使用单一的服务器对象混合支持`http`,`https`和`websocket`。

- [0. 概述](#0-%e6%a6%82%e8%bf%b0)
- [1. 快速入门](#1-%e5%bf%ab%e9%80%9f%e5%85%a5%e9%97%a8)
  - [1.0. 安装](#10-%e5%ae%89%e8%a3%85)
  - [1.1. HelloWorld](#11-helloworld)
  - [1.2. 控制器与路径映射](#12-%e6%8e%a7%e5%88%b6%e5%99%a8%e4%b8%8e%e8%b7%af%e5%be%84%e6%98%a0%e5%b0%84)
  - [1.3. 请求体与参数注入](#13-%e8%af%b7%e6%b1%82%e4%bd%93%e4%b8%8e%e5%8f%82%e6%95%b0%e6%b3%a8%e5%85%a5)
  - [1.4. 返回值与响应对象](#14-%e8%bf%94%e5%9b%9e%e5%80%bc%e4%b8%8e%e5%93%8d%e5%ba%94%e5%af%b9%e8%b1%a1)
  - [1.5. 请求对象](#15-%e8%af%b7%e6%b1%82%e5%af%b9%e8%b1%a1)
  - [1.6. 支持WebSocket](#16-%e6%94%af%e6%8c%81websocket)
- [2. 服务器选项](#2-%e6%9c%8d%e5%8a%a1%e5%99%a8%e9%80%89%e9%a1%b9)
  - [2.0. 端口号](#20-%e7%ab%af%e5%8f%a3%e5%8f%b7)
  - [2.1. 跨域资源共享](#21-%e8%b7%a8%e5%9f%9f%e8%b5%84%e6%ba%90%e5%85%b1%e4%ba%ab)
  - [2.2. 静态映射](#22-%e9%9d%99%e6%80%81%e6%98%a0%e5%b0%84)
  - [2.3. 安全套接字](#23-%e5%ae%89%e5%85%a8%e5%a5%97%e6%8e%a5%e5%ad%97)
  - [2.4. 服务器选项](#24-%e6%9c%8d%e5%8a%a1%e5%99%a8%e9%80%89%e9%a1%b9)

# 1. 快速入门

## 1.0. 安装

推荐使用`npm`包管理工具安装`jetweb`

~~~bash
npm install jetweb
~~~

## 1.1. HelloWorld

以下`typescript`源码展示了如何轻松建立一个web服务器

~~~typescript
import {Web} from 'jetweb'

const web = new Web({
    User: {
        getSayHi() {
            return 'Hello world!'
        }
    }
})

web.listen()
~~~

运行这份源码，您就可以使用浏览器访问`http://localhost:5000/user/say/hi`地址查看到效果了。

## 1.2. 控制器与路径映射

`jetweb`的使用流程如下:

1. 使用`Web`类构造web服务器
2. 调用`Web`实例的`listen`方法

仅此而已，`Web`类的构造方法接受一个`Application`对象，内部的每个属性都会被认做一个`Controller`。

`Controller`的每个方法都会被认做一个`Handler`。

`Handler`可分为`RequestHandler`和`WebsocketHandler`两种，`jetweb`根据`Handler`的名称区分`Handler`的类型并映射访问路径。

关于如何书写具体的`Handler`名称，您可以参考实例：

~~~typescript
import {Application} from 'jetweb'

let app : Application = {
    User: {
        getBrief() {/* GET: /user/brief */}
        postLogin() {/* POST: /user/login */}
        wsOnline() {/* WEBSOCKET: /user/login */}
        get() {/* GET: /user */}
    },
    '/': {
        get() {/* GET: / */}
    }
}
~~~

## 1.3. 请求体与参数注入

若`RequestHandler`声明了参数，`jetweb`会在`查询请求`中寻找名称相同的字段，注入到参数中。

若请求头包含`ContentType: application/json`，则`jetweb`会试图解析请求体；若请求体被解析为`object`，则其中的属性也会被注入到参数中。

<u>请注意：`jetweb`没办法为请求参数检查数据类型。</u>

## 1.4. 返回值与响应对象

您在`RequestHandler`返回的除了`undefined`外的任何内容，都会被**json编码**后作为响应体发送。

当`jetweb`运行`RequestHandler`时，一个`RequestContext`对象会被注入`this`引用。您可以通过`this.response`访问响应对象，以手动指定更多细节。

## 1.5. 请求对象

当`jetweb`运行`RequestHandler`时，一个`RequestContext`对象会被注入`this`引用。您可以通过`this.request`访问请求对象，以获悉更多关于请求的信息。

## 1.6. 支持WebSocket

`jetweb`使用`ws`模块为您提供`websocket`的简单封装。您可以使用一个`ws`前缀的`WebSocketHandler`在某个路径上监听`websocket`请求。

~~~typescript
let app : Application = {
    User: {

        /* listen to /user/online */
        wsOnline( request : http.IncomingMessage ) {
            console.log('connection to /user/online')

            /* bind event handler */
            this.on('message', (data) => {
                console.log('message received', data)

                /* echo back */
                this.send(data)
            })
        }
    }
}
~~~

当`websocket`连接被建立时，一个`WebSocket`对象将被注入`this`引用。

若需要，您可以使用`WebSocketHandler`的第一个参数接受`http.IncomingMessage`来获悉更多关于此请求的信息。

编写`WebSocketHandler`相当于监听了`ws.Server`对象的`connection`事件，`jetweb`为所有的`websocket`连接使用同一个服务容器，再根据路径手动分配事件。

# 2. 服务器选项

`jetweb`服务器的构造方法还可以接受第二个参数，用于指定自定义的服务器选项。

服务器选项是一个`ServerOptions`对象，每一条选项都是其中的一个属性，所有的选项都是可选的。

## 2.0. 端口号

`jetweb`服务器默认监听`5000`端口，您可以使用如下代码指定`jetweb`服务器监听`80`端口。

~~~typescript
new Web(app,{port:80})
~~~

## 2.1. 跨域资源共享

`jetweb`服务器对跨域资源共享提供了粗略简便的处理办法。

跨域资源共享会在浏览器向服务器提出复杂请求之前，发送一个`header`请求询问是否能够进行跨域资源共享。

默认情况下，如果您没有编写接口来处理这个`header`请求，此请求将以`404`失败告终。

您可以指定`cors`选项为`true`，这样`jetweb`服务器会为您自动允许所有的跨域资源共享询问。

~~~typescript
new Web(app,{cors:true})
~~~

同时`jetweb`也会为所有的响应添加适用于任何网站的跨域许可头：

~~~http
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET,POST
Access-Control-Allow-Headers: x-requested-with,content-type
~~~

您可以指定`cors`为一个订制的`RequestHandler`来处理一般的情况：

~~~typescript
new Web(app,{cors:()=>{
    ...
}})
~~~

请允许我再次强调，跨域处理只发生在这个`header`请求没有被`RequestHandler`处理的情况下。也就是说，如果您想单独处理某个路径对应的`header`请求，这并不复杂:

~~~typescript
new Web({
    user: {
        headerLogin() {
            /** do something */
        }
    }
})
~~~

## 2.2. 静态映射

默认情况下，`jetweb`会在每次请求到来时，拆解请求路径，然后与`Controller`对象中的`Handler`匹配。这个设计为`Controller`保留了动态变化的可能性，但是降低了性能。

您可以指定`static`选项为`true`，`jetweb`将会在`Web`对象建立之初构造并启用一个一对一的静态映射表，提高运行效率。

~~~typescript
new Web(app, {static: true})
~~~

## 2.3. 安全套接字

默认情况下，`jetweb`使用`http`服务器进行通信，如果您需要，可以传入`ssl`选项以开启`https`服务器。

`ssl`选项的内容参考`https.ServerOptions`结构。

~~~typescript
new Web(app,{
    ssl:{
        key: fs.readFileSync('test/fixtures/keys/agent2-key.pem'),
        cert: fs.readFileSync('test/fixtures/keys/agent2-cert.pem')
    }
})
~~~

请注意，当您开启了`ssl`选项时，`WebSocketHandler`也会受到影响，其对应的请求协议也会变成`wss`。

## 2.4. 服务器选项

您可以使用`http`选项为`http`服务器指定更多选项，默认情况下此选项是空的。

~~~typescript
import {Web} from 'jetweb'

let web = new Web(app, {
    http:{
        ...
    }
})
~~~