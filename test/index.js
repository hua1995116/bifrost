const path = require('path');
const Bifrost = require('../index');
const bifrost = new Bifrost({
  cwd: __dirname
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