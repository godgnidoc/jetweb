import * as http from 'http'


function log( str : any ) {
    let date = new Date()    
    console.log(`[${date.toLocaleString()}] => ${str.toString()}`)
}

export class WebServerOptions {
    methods = {}
    port? = 5000
}

class Proc {
    request : http.IncomingMessage
    response : http.ServerResponse

    constructor( req: http.IncomingMessage, res: http.ServerResponse ) {
        this.request = req
        this.response = res
    }

    public async route( entry : Function ) {
        this.response.setHeader('Access-Control-Allow-Origin','*')
        this.response.setHeader('Access-Control-Allow-Methods','GET,POST')
        this.response.setHeader('Access-Control-Allow-Headers','x-requested-with,content-type')
        log(`\x1b[1;36m[PARAMS]\x1b[0m ${JSON.stringify(this.request['params'])}`)
        if( !entry ) {
            log(`\x1b[1;33m[404]\x1b[0m ${this.request.url}`)
            this.response.statusCode = 404
            this.response.write(`Are U lost ?`)
        } else try {
            let args = []
            for( let name of entry['args'] )
                if( name in this.request['params'] ) {
                    args.push(this.request['params'][name])
                } else {
                    args.push(undefined)
                }
            let ret = await entry.apply(this, args)
            if( ret ) {
                this.response.setHeader('ContentType', 'application/json')
                ret = JSON.stringify(ret)
                this.response.write(ret)
                log(`\x1b[1;36m[RETURN]\x1b[0m ${ret}`)
            }
            log(`\x1b[1;32m[200]\x1b[0m ${this.request.url} routed to ${entry.name}`)
        } catch( e ) {
            log(e)
            this.response.statusCode = 500
            log(`\x1b[1;31m[500]\x1b[0m ${this.request.url} routed to ${entry.name}`)
        }
        this.response.end()
    }
}

export class Web {
    methods: {}
    port : number = 5000
    server : http.Server
    constructor( options : WebServerOptions ) {
        this.methods = options.methods
        if( options.port )
            this.port = options.port
        this.bindArgs()
        this.server = http.createServer(( req : http.IncomingMessage, res : http.ServerResponse ) => {
            let url = new URL('http://localhost'+req.url)
            let entry = this.getEntry(url.pathname, req.method)
            
            req['params'] = {}
            url.searchParams.forEach( ( v, k ) => {req['params'][k] = v})
            req['body'] = ''
            req.on('data', data => {req['body'] += data})
            req.on('end', () => {
                try{
                    req['json'] = JSON.parse(req['body'])
                    if( typeof req['json'] == 'object' ) {
                        req['params'] = {
                            ... req['params'],
                            ... req['json']
                        }
                    }
                } catch( e ) {
                    /* Do nothing */
                }
                let proc = new Proc( req, res )
                proc.route( entry )
            })
        })
    }

    private getEntry( the_path : string, method : string ) : Function {
        let name = method.toLowerCase()
        for( var path of the_path.split('/') )
            name += path.charAt(0).toUpperCase() + path.slice(1)
        log(`\x1b[1;34m[MAPPING ${the_path} -> ${name} ]\x1b[0m `)
        if( name in this.methods )
            return this.methods[name]
        else
            return null
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
        for( let i in this.methods ) {
            let method = this.methods[i]
            method.args = this.getArgs(method)
        }
    }

    public run( port ?: number ) {
        if( port ) this.port = port
        log(`web server listening localhost:${this.port}`)
        this.server.listen(this.port)
    }
}