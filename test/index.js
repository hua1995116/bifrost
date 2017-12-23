const path = require('path');
const Bifrost = require('../index');
const bifrost = new Bifrost({
  cwd: __dirname,
  app_worker: path.resolve(__dirname, 'app.js'),
  agents: {
    agent: path.resolve(__dirname, 'agent.js')
  }
});

bifrost.on('AGENT:READY', () => {
  console.log('AGENT:READY');
});

bifrost.on('BIFROST:READY', () => {
  console.log('BIFROST:READY');
});

bifrost.on('AGENT:EXIT', () => {
  console.log('AGENT:EXIT');
});