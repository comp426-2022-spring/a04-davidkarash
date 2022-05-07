// Import minimist early and check for --help flag
import min from 'minimist';
let args = min(process.argv.slice(2), {'default':{'port':5555,'debug':false,'log':true}});
if (args['help']) {
    console.log(`server.js [options]

        --port	Set the port number for the server to listen on. Must be an integer
                    between 1 and 65535.
      
        --debug	If set to \`true\`, creates endlpoints /app/log/access/ which returns
                    a JSON access log from the database and /app/error which throws 
                    an error with the message "Error test successful." Defaults to 
                    \`false\`.
      
        --log		If set to false, no log files are written. Defaults to true.
                    Logs are always written to database.
      
        --help	Return this message and exit.`)
        process.exit(0);
}
// Other imports after --help check
import express from 'express';
import morgan from 'morgan';
import fs from 'fs';
import { coinFlip, coinFlips, countFlips, flipACoin } from './coin.mjs';
// Setup before starting app
const app = express();
app.use(express.urlencoded({extended:true}));
app.use(express.json());
const port = args['port']
const server = app.listen(port, () => {
    console.log('App listening on port %PORT%'.replace('%PORT%', port))
})
import pkg from './database.cjs'
import { exit } from 'process';
app.use( (req, res, next) => {
    let logdata = {
        remoteaddr: req.ip,
        remoteuser: req.user,
        time: Date.now().toString(),
        method: req.method,
        url: req.url,
        protocol: req.protocol,
        httpversion: req.httpVersion,
        secure: req.secure,
        status: res.statusCode,
        referer: req.headers['referer'],
        useragent: req.headers['user-agent']
    }
    const stmt = pkg.accesslog.prepare('INSERT INTO accesslog (remoteaddr, remoteuser, time, method, url, protocol, httpversion, secure, status, referer, useragent) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
    stmt.run(logdata.remoteaddr, logdata.remoteuser, logdata.time, logdata.method, logdata.url, logdata.protocol, logdata.httpversion, logdata.secure.toString(),logdata.status,logdata.referer,logdata.useragent);
    next()
})
if (args['log']) {
    const filestream = fs.createWriteStream('./access.log', {flags: 'a'});
    app.use(morgan('combined', { stream:filestream }))
}
if (args['debug']) {
    app.get('/app/log/access/', (req, res) => {
        try {
            const stmt = pkg.accesslog.prepare('SELECT * FROM accesslog').all()
            res.status(200).json(stmt)
        } catch {
            console.error(e)
        }
    })
    app.get('/app/error/', (req, res) => {
        res.send('500 Internal Server Error');
        // throw new Error('BROKEN');
    })
}
app.get('/app/', (req, res) => {
    res.statusCode = 200;
    res.statusMessage = 'OK';
    res.writeHead( res.statusCode, { 'Content-Type' : 'text/plain' });
    res.end(res.statusCode+ ' ' +res.statusMessage)
})
app.get('/app/flip/', (req, res) => {
    res.statusCode = 200;
    res.statusMessage = 'OK';
    res.json({'flip': coinFlip()})
})
app.get('/app/flips/:number', (req, res) => {
    res.statusCode = 200;
    res.statusMessage = 'OK';
    let results = coinFlips(req.params.number)
    res.json({'raw':results,'summary':countFlips(results)})
})
app.get('/app/flip/call/:call', (req, res) => {
    res.statusCode = 200;
    res.statusMessage = 'OK'
    if (req.params.call == 'heads') {
        res.json(flipACoin('heads'));
    } else if (req.params.call == 'tails') {
        res.json(flipACoin('tails'));
    } else {
        res.status(404).send('404 NOT FOUND');
    }
})
// Default response for any invalid request
app.use(function(req, res) {
    res.status(404).send('404 NOT FOUND');
})