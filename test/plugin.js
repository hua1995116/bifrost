const path = require('path');
module.exports = {
  test: {
    enable: true,
    env: '*',
    path: path.resolve(__dirname, 'plugins', 'test'),
    // package: 'component',
    agent: '*',
    config: {}
  },
  test2: {
    enable: true,
    env: '*',
    path: path.resolve(__dirname, 'plugins', 'test2'),
    // package: 'component',
    agent: '*',
    config: {}
  }
}