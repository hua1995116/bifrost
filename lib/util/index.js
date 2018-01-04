const fs = require('fs');
const path = require('path');

exports.nameSpace = require('./namespace');
exports.configs = {
  agent: {
    intervalTime: 24 * 60 * 60 * 1000
  }
}
exports.noop = () => {};
exports.loadFile = loadFile;
exports.sortDependencies = sortDependencies;
exports.camelize = camelize;
exports.replacePrefix = replacePrefix;
exports.objectProxy = objectProxy;

exports.getAgentRuntimeArgs = function(argv) {
  const result = {};
  const fileString = '--AGENT-RUNTIME-';
  const runtimeArg = argv.filter(arg => arg.indexOf(fileString) > -1);
  runtimeArg.forEach(arg => {
    const entry = arg.split('=');
    switch (entry[0]) {
      case fileString + 'LOADER':
        result.loader = entry[1];
        break;
      case fileString + 'CWD':
        result.cwd = entry[1];
        break;
      case fileString + 'NAME':
        result.name = entry[1];
        break;
      case fileString + 'PLUGIN':
        result.plugin = entry[1];
        break;
    }
  });
  return result;
}

exports.AgentMessageReceiver = function(obj, msg) {
  this.app = obj;
  this.url = msg.action;
  this.body = msg.body.data;
  this.to = msg.to;
  this.from = msg.from;
  this.cid = msg.body.cid;
}

exports.AgentMessageReceiver.prototype.send = function(...args) {
  if (args.length === 1) {
    return this.reply(args[0]);
  }
  return this.app.send(...args);
}

exports.AgentMessageReceiver.prototype.reply = function(data) {
  return this.app.send(this.from, this.cid, data);
}

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

function sortDependencies(tree) {
  const s = Object.keys(tree);
  const m = [];
  let j = s.length;
  while (j--) {
    const obj = tree[s[j]];

    Object.defineProperty(obj, 'deep', {
      get() {
        if (!obj.dependencies.length) return 0;
        return Math.max(...obj.dependencies.map(d => tree[d].deep)) + 1
      }
    });
  }

  for (const i in tree) {
    tree[i].name = i;
    m.push(tree[i]);
  }
  
  return m.sort((a, b) => a.deep - b.deep);
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

function replacePrefix(d) {
  return d.replace(/\.js$/, '');
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