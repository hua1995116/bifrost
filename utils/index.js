const fs = require('fs');
const path = require('path');
const debug = require('debug')('nodebase:utils:custom');
let startTime = Date.now();

exports.loadFile = loadFile;
exports.costTime = costTime;

function loadFile(filepath) {
  try {
    // if not js module, just return content buffer
    const extname = path.extname(filepath);
    if (![ '.js', '.node', '.json', '' ].includes(extname)) {
      return fs.readFileSync(filepath);
    }
    // require js module
    const obj = require(filepath);
    if (!obj) return obj;
    // it's es module
    if (obj.__esModule) return 'default' in obj ? obj.default : obj;
    return obj;
  } catch (err) {
    err.message = `load file: ${filepath}, error: ${err.message}`;
    throw err;
  }
}

function costTime(name) {
  return msg => {
    const time = parseInt(msg.body.time, 10);
    const pid = msg.body.pid;
    const delay = time - startTime;
    startTime = time;
    debug(`[${pid}]`, `\`${name}\``, 'lifecycle is triggered by', delay + 'ms');
  }
}