const IPCMessage = require('ipc-message');
const Channel = require('./channel');
const Logger = require('../logger');
const {
  configs,
  noop,
  nameSpace,
  getAgentRuntimeArgs
} = require('../util');

module.exports = class Agent extends IPCMessage {
  constructor() {
    super(true);

    this.timer = setInterval(noop, configs.agent.intervalTime);
    this.argv = process.argv;
    const AgentProcessArgv = getAgentRuntimeArgs(this.argv);
    this.cwd = AgentProcessArgv.cwd;
    this.name = AgentProcessArgv.name;
    this.console = new Logger(this);
    this.logger = console;
    this.plugins = {};
    this.channels = {};

    process.on('SIGINT', () => {
      this.destroyServer()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
    });

    this.on('message', this.onReceiveMessage.bind(this));
  }

  install(name, callback) {
    this.plugins[name] = callback;
  }

  async onReceiveMessage(msg) {
    if (msg.body && msg.body.service && this.channels[msg.body.service]) {
      const name = msg.body.service;
      delete msg.body.service;
      const channel = this.channels[name].addTask(msg);
      await channel.runTask();
    } else {
      switch (msg.action) {
        case 'MASTER:READY':
          await this.emit('master:ready');
          break;
        default:
          await this.emit('receive:message', msg);
      }
    }
  }

  async createServer() {
    await this.emit('agent:beforeCreate');
    for (const plugin in this.plugins) {
      const channel = new Channel(this);
      if (typeof this.plugins[plugin] === 'function') {
        this.plugins[plugin](channel);
        await channel.createServer();
        this.channels[plugin] = channel;
      }
    }
    delete this.plugins;
    await this.emit('agent:created');
  }

  async destroyServer() {
    await this.emit('agent:beforeDestroy');
    for (const channel in this.channels) {
      await this.channels[channel].destroyServer();
    }
    await this.emit('agent:destroyed');
  }
}