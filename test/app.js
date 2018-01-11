const debug = require('debug')('Test:app.js');
module.exports = app => {
  // console.log('app invoke');
  [
    'beforeCreate',
    'created',
    'beforeMount',
    'mounted',
    'beforeDestroy',
    'destroyed',
  ].forEach(life => {
    app.on(life, () => {
      debug(`lifecycle \`${life}\` is triggered.`);
    })
  });
}