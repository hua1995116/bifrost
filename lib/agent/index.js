const IPCMessage = require('ipc-message');
const Channel = require('./channel');
const Logger = require('../logger');
const ResolvePlugins = require('../plugin/agent');
const {
  configs,
  noop,
  nameSpace,
  getAgentRuntimeArgs,
  loadFile
} = require('../util');

module.exports = class Agent extends IPCMessage {
  constructor(cwd) {
    super(true);

    this.argv = process.argv;
    const AgentProcessArgv = getAgentRuntimeArgs(this.argv);
    this.cwd = cwd || AgentProcessArgv.cwd;
    this.name = AgentProcessArgv.name;
    this.console = new Logger(this);
    this.logger = console;
    this.plugins = {};
    this.channels = {};
    this.plugin = AgentProcessArgv.plugin;
    this.env = process.env.NODE_ENV;

    process.on('SIGINT', () => {
      this.destroyServer()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
    });

    ['error', 'rejectionHandled', 'uncaughtException'].forEach(err => {
      process.on(err, e => this.emit('error', e));
    });

    this.on('message', this.onReceiveMessage.bind(this));
  }

  setupPlugins() {
    if (this.plugin) {
      const plugins = ResolvePlugins(loadFile(this.plugin), this.env, this.name);
      plugins.forEach(plugin => this.install(plugin.name, plugin.exports));
    }
  }

  install(name, callback) {
    this.plugins[name] = callback;
  }

  resolve(...args) {
    return path.resolve(this.cwd, ...args);
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
    this.timer = setInterval(noop, configs.agent.intervalTime);
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