const fs = require('fs');
const path = require('path');
const { loadFile, camelize } = require('../util');

exports.classic = function classic(dir, target, callback) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(file => {
    const _path = path.resolve(dir, file);
    if (fs.statSync(_path).isDirectory()) {
      const name = camelize(file);
      target[name] = {};
      lookup(_path, target[name], callback);
    } else {
      if (/.js$/.test(file)) {
        target[camelize(file)] = callback(loadFile(_path));
      }
    }
  });
}