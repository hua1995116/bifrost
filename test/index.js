const path = require('path');
const Bifrost = require('../index');
const bifrost = new Bifrost({
  cwd: __dirname,
  app_worker: path.resolve(__dirname, 'app.js'),
  agents: {
    agent: path.resolve(__dirname, 'agent.js')
  }
});

[
  'agent:ready',
  'ready',
  'agent:exit',
  'exit'
].forEach(name => {
  bifrost.on(name, (...args) => {
    bifrost.console.log(`[${bifrost.type}]:`, name, ...args);
  });
});