const debug = require('debug')('Test:plugin:test1:app.js');
module.exports = app => {
  app.on('destroy', () => {
    debug(`lifecycle \`destroy\` is triggered.`);
  });
}