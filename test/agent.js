const Agent = require('../lib/agent');
const Component = require('./component');
module.exports = agent => {
  agent.install('component', Component);
  [
    'receive:message',
    'master:ready',
    'agent:beforeCreate',
    'agent:created',
    'agent:beforeDestroy',
    'agent:destroyed'
  ].forEach(name => {
    agent.on(name, (...args) => {
      agent.console.log('[agent]:', name, ...args);
    })
  });
}