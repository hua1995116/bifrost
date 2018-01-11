const path = require('path');
const NodebaseApplication = require('./index');
const Service = require('./agent-service');

module.exports = class Agent extends NodebaseApplication {
  constructor(options) {
    super(options, true);
    this.name = options.name;
    this.debug = require('debug')(`nodebase:agent:${options.name}`);
    this.__agentkeepAliveTimer__ = setInterval(() => {}, 24 * 60 * 60 * 1000);
    this.on('agent:exit:child:notify', this.close.bind(this));
    this.on('agent:exit:child:destroy', () => {
      if (this.status === 1) {
        clearInterval(this.__agentkeepAliveTimer__);
        this.status = 2;
      }
    })
  }

  async init() {
    await this.open('agent.js', Service);
  }

  async close() {
    await super.close();
    this.send('master', 'agent:exit:child:done', this.name);
  }

  async onAgentReceiveMessage(msg, socket) {
    const action = msg.action;
    if (path.isAbsolute(action) && msg.body.service) {
      const name = msg.body.service;
      delete msg.body.service;
      await this.plugin.onMacroService(name, msg);
    } else {
      await this.emit(action, msg, socket);
    }
  }
}