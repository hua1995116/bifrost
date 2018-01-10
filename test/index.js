const path = require('path');
const Bifrost = require('../cluster');
const bifrost = new Bifrost({
  baseDir: __dirname,
  plugins: 'plugin.config.js'
});