const fs = require('fs');
const path = require('path');
const debug = require('debug')('nodebase:utils:custom');
let startTime = Date.now();

exports.loadFile = loadFile;
exports.costTime = costTime;
exports.camelize = camelize;
exports.objectProxy = objectProxy;

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

function camelize(filepath) {
  const properties = filepath.substring(0, filepath.lastIndexOf('.')).split('/');
  return properties.map(property => {
    if (!/^[a-z][a-z0-9_-]*$/i.test(property)) {
      throw new Error(`${property} is not match 'a-z0-9_-' in ${filepath}`);
    }
    property = property.replace(/[_-][a-z]/ig, s => s.substring(1).toUpperCase());
    let first = property[0].toLowerCase();
    return first + property.substring(1);
  });
}

function objectProxy(object, name) {
  return new Proxy(object, {
    get(obj, key) {
      if (key in obj) {
        const parentData = obj[key];
        return typeof parentData === 'function'
          ? parentData.bind(obj)
          : parentData;
      } else {
        const childData = obj[name][key];
        return typeof childData === 'function'
          ? childData.bind(obj[name])
          : childData;
      }
    }
  })
}