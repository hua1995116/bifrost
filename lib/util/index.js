exports.nameSpace = require('./namespace');
exports.configs = {
  agent: {
    intervalTime: 24 * 60 * 60 * 1000
  }
}
exports.noop = () => {};

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
    return this.app.send(this.from, this.cid, args[0]);
  }
  return this.app.send(...args);
}