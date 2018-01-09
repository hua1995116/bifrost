const path = require('path');
const Bifrost = require('../cluster');
const bifrost = new Bifrost({
  baseDir: __dirname,
  framework: path.resolve(__dirname, '../framework'),
  plugins: 'plugin.config.js'
});