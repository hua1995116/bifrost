const AgentPlugin = require('./agent-plugin');
const Logger = require('./logger');
const { configs, noop, nameSpace, getAgentRuntimeArgs } = require('./util');
const AgentProcessArgv = getAgentRuntimeArgs(process.argv);

module.exports = class Agent extends AgentPlugin {
  constructor() {
    super();
    
    this.timer = setInterval(noop, configs.agent.intervalTime);
    this.cwd = AgentProcessArgv.cwd;
    this.name = AgentProcessArgv.name;
    this.console = new Logger(this);
    this.logger = console;

    process.on('SIGINT', () => {
      this[nameSpace.agent.onExit]()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
    });

    this.on('message', this[nameSpace.agent.onMessage].bind(this));
  }

  [nameSpace.agent.onMessage](msg) {
    if (msg.body && msg.body.service && this.components[msg.body.service]) {
      const name = msg.body.service;
      delete msg.body.service;
      this.components[name].push(msg).render();
    } else {
      switch (msg.action) {
        case 'BIFROST:READY':
          if (this.bifrostReady) this.bifrostReady();
          break;
        default: this.emit('receiveMessage', msg);
      }
    }
  }

  async [nameSpace.agent.onAgentReady]() {
    await this.loadLifeCycle('agentDidReady');
    this.send('master', 'AGENT:READY');
  }

  async [nameSpace.agent.onAgentInit]() {
    if (this.beforeCreate) {
      await this.beforeCreate();
    }
    await this.loadLifeCycle('beforeStart');
    if (this.created) {
      await this.created();
    }
  }

  async [nameSpace.agent.onExit]() {
    if (this.beforeClose) {
      await this.beforeClose();
    }
    await this.loadLifeCycle('beforeStop');
    clearInterval(this.timer);
    if (this.closed) {
      await this.closed();
    }
  }
}