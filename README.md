# 0. 概述

`jetweb`框架是超轻量级`web`服务框架，具备**访问路径自动映射**，**请求参数自动注入**，**跨域资源共享自动应答**等功能。在小规模，项目上可以有效降低开发工作量。

`jetweb`仅适用于开发`web`后端程序，因为`jetweb`对接口的请求，返回格式做出了限定，以此追求便捷的自动映射功能。

- [0. 概述](#0-%e6%a6%82%e8%bf%b0)
- [1. 快速入门](#1-%e5%bf%ab%e9%80%9f%e5%85%a5%e9%97%a8)
  - [1.0. 安装](#10-%e5%ae%89%e8%a3%85)
  - [1.1. HelloWorld](#11-helloworld)
  - [1.2. 控制器与路径映射](#12-%e6%8e%a7%e5%88%b6%e5%99%a8%e4%b8%8e%e8%b7%af%e5%be%84%e6%98%a0%e5%b0%84)
  - [1.3. 请求体与参数注入](#13-%e8%af%b7%e6%b1%82%e4%bd%93%e4%b8%8e%e5%8f%82%e6%95%b0%e6%b3%a8%e5%85%a5)
  - [1.4. 返回值与响应](#14-%e8%bf%94%e5%9b%9e%e5%80%bc%e4%b8%8e%e5%93%8d%e5%ba%94)
  - [1.5. 请求对象和响应对象](#15-%e8%af%b7%e6%b1%82%e5%af%b9%e8%b1%a1%e5%92%8c%e5%93%8d%e5%ba%94%e5%af%b9%e8%b1%a1)
- [2. 服务器选项](#2-%e6%9c%8d%e5%8a%a1%e5%99%a8%e9%80%89%e9%a1%b9)
  - [2.0. 端口号](#20-%e7%ab%af%e5%8f%a3%e5%8f%b7)
  - [2.1. 跨域](#21-%e8%b7%a8%e5%9f%9f)
  - [2.2. 静态映射](#22-%e9%9d%99%e6%80%81%e6%98%a0%e5%b0%84)

# 1. 快速入门

## 1.0. 安装

推荐使用`npm`包管理工具安装`jetweb`

~~~bash
npm install jetweb
~~~

您可以安装`@types/jetweb`来提供代码提示

~~~bash
npm install @types/jetweb
~~~

## 1.1. HelloWorld

以下`typescript`源码展示了如何轻松建立一个web服务器

~~~typescript
import {Web} from 'jetweb'

const web = new Web({
    user: {
        getSayHi() {
            return 'Hello world!'
        }
    }
})

web.run()
~~~

运行这份源码，您就可以使用浏览器访问`http://localhost:5000/user/say/hi`地址查看到效果了。

## 1.2. 控制器与路径映射

`jetweb`的使用流程如下:

1. 使用`Web`类构造web服务器
2. 调用`Web`实例的`run`方法

仅此而已，`Web`类的构造方法接受一个对象，内部的每个属性都会被认做一个`控制器`。
每个控制器的每个方法都会被认做一个`接口`函数，映射为一个访问路径。

接口函数的命名规则如下：

~~~
<method><Path1><Path2><Path3>...
~~~

- `<method>`表示访问方法，必须全小写
- `<Path1><Path2>...`访问路径，大写字母表示下一层路径。
- 控制器的名称大小写是随意的，其对应的路径总是全小写的。

## 1.3. 请求体与参数注入

若接口函数声明了参数，`jetweb`会在`查询请求`中寻找名称相同的字段，注入到参数中。

若请求头包含`ContentType: application/json`，则`jetweb`会试图解析请求体。

若请求体被解析为`对象`，则其中的属性也会被注入到参数中。

- 请注意：`jetweb`没办法为请求参数检查数据类型。

## 1.4. 返回值与响应

`jetweb`为所有的响应头都填写了如下选项：

~~~http
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET,POST
Access-Control-Allow-Headers: x-requested-with,content-type
~~~

这是为了方便应付跨域资源共享。

另外，您在`接口`函数返回的除了`undefined`外的任何内容，都会被**json编码**后作为响应体发送。

## 1.5. 请求对象和响应对象

请注意:<u>接口函数每次运行前，都会被绑定在由请求对象和响应对象构成临时上下文上，因此`this`引用不能用于访问`控制器`对象。</u>

您可以将注入物`injection`注入控制器对象，即可在`IDE`中得到正确的代码提示。但是您的`this`仍然指向一个全新的对象。

~~~typescript
import {injection} from 'jetweb'
let controllers = {
    user {
        ... injection,
        postLogin( phone : string, password : string ) {
            ...
        }
    }
}
~~~

如此，在接口函数中，使用`this.request`即可访问请求对象，使用`this.response`即可访问响应对象。

`jetweb`为您在`this.request`对象中注入了若干变量，以便您迅速找到您想要的东西：

- `json`: 请求体被作为`json`解析后的产物
- `body`: 请求体的`string`类型原文
- `params`:请求体中的所有参数，包括查询请求的参数和请求体内部的参数

# 2. 服务器选项

`jetweb`服务器的构造方法还可以接受第二个参数，用于指定自定义的服务器选项。

服务器选项是一个对象，每一条选项都是其中的一个属性，所有的选项都是可选的。

## 2.0. 端口号

`jetweb`服务器默认监听`5000`端口，您可以使用如下代码指定`jetweb`服务器监听`80`端口。

~~~typescript
new Web(controllers,{port:80})
~~~

## 2.1. 跨域

`jetweb`服务器对跨域资源共享提供了粗略简便的处理办法。

跨域资源共享会在浏览器向服务器提出复杂请求之前，发送一个`header`请求询问是否能够进行跨域资源共享。

默认情况下，如果您没有编写接口来处理这个`header`请求，此请求将以`404`失败告终。

您可以指定`cors`选项为`true`，这样`jetweb`服务器会为您自动允许所有的跨域资源共享询问。

~~~typescript
new Web(controllers,{cors:true})
~~~

您可以指定`cors`为一个订制的函数来处理一般的情况：

~~~typescript
new Web(controllers,{cors:()=>{
    ...
}})
~~~

请允许我再次强调，跨域处理只发生在这个`header`请求没有被`接口`处理的情况下。也就是说，如果您想单独处理某个路径对应的`header`请求，这并不复杂:

~~~typescript
new Web({
    user: {
        headerLogin() {
            ...
        }
    }
})
~~~

## 2.2. 静态映射

默认情况下，`jetweb`会在每次请求到来时，拆解请求路径，然后与控制器对象中的接口匹配。这个设计为控制器保留了动态变化的可能性，但是降低了性能。

您可以指定`static`选项为`true`，`jetweb`将会在`Web`对象建立之初构造并启用一个一对一的静态映射表，提高运行效率。

~~~typescript
new Web(controllers, {static: true})
~~~