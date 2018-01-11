const debug = require('debug')('Test:agent.js');
module.exports = agent => {
  [
    'beforeCreate',
    'created',
    'beforeMount',
    'mounted',
    'beforeDestroy',
    'destroyed',
  ].forEach(life => {
    agent.on(life, () => {
      debug(`lifecycle \`${life}\` is triggered.`);
    })
  });
}