const { nameSpace, AgentMessageReceiver } = require('./util');
const Middleware = require('./middleware');

module.exports = class Plugin extends Middleware {
  constructor(agent) {
    super();
    this[nameSpace.plugin.isLocked] = false;
    this.lifeCycles = {};
    this.agent = agent;
    this.messages = [];
  }

  push(msg) {
    this.messages.push(msg);
    return this;
  }

  async render() {
    if (this.messages.length && !this[nameSpace.plugin.isLocked]) {
      const msg = this.messages[0];
      await this.execute(new AgentMessageReceiver(this.agent, msg));
      this.messages.splice(0, 1);
      await this.render();
    }
  }

  lock() {
    this[nameSpace.plugin.isLocked] = true;
  }

  unLock() {
    this[nameSpace.plugin.isLocked] = false;
    this.render();
  }

  beforeStart(cb) {
    this.lifeCycles['beforeStart'] = cb;
  }

  beforeStop(cb) {
    this.lifeCycles['beforeStop'] = cb;
  }

  agentDidReady(cb) {
    this.lifeCycles['agentDidReady'] = cb;
  }
}