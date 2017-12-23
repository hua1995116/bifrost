const IPCMessage = require('ipc-message');
const { nameSpace } = require('./util');
const Plugin = require('./plugin.js');

module.exports = class AgentPlugin extends IPCMessage {
  constructor() {
    super(true);
    this.components = {};
  }

  install(key, cb) {
    const component = new Plugin(this);
    cb(component);
    component.poly();
    this.components[key] = component;
    return this;
  }

  async loadLifeCycle(name, ...args) {
    for (const i in this.components) {
      const component = this.components[i];
      if (!component[nameSpace.plugin.isLocked] && component.lifeCycles[name]) {
        await component.lifeCycles[name].call(this, ...args);
      }
    }
  }
}