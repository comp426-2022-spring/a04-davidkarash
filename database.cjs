const bsqlite3 = require('better-sqlite3')

const accesslog = new bsqlite3('log.db')

const stmt = accesslog.prepare(`SELECT name FROM sqlite_master WHERE type='table' and name='accesslog';`);

let row = stmt.get();

if (row === undefined) {
    console.log('Your database appears to be empty.  Initializing now.');
    const sqlInit = `CREATE TABLE accesslog (remoteaddr TEXT, remoteuser TEXT, time TEXT, method TEXT, url TEXT, protocol TEXT, httpversion TEXT, secure TEXT, status TEXT, referer TEXT, useragent TEXT);`
    accesslog.exec(sqlInit);
    console.log('Database has been initialized with a new table and required log info.');
}

module.exports = {accesslog}