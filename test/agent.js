const Agent = require('../lib/agent');
const Component = require('./component');

module.exports = class AgentProcess extends Agent {
  constructor() {
    super();
    this.install('component', Component);
    [
      'receive:message',
      'master:ready',
      'agent:beforeCreate',
      'agent:created',
      'agent:beforeDestroy',
      'agent:destroyed'
    ].forEach(name => {
      this.on(name, (...args) => {
        this.console.log('[agent]:', name, ...args);
      })
    });
  }
}