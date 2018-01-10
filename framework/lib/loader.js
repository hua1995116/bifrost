const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { loadFile, camelize } = require('../../utils');

module.exports = class NodebaseLoader {
  constructor(options) {
    this.options = options;
    this.cb = options.callback || ((target, name, exprots) => target[name] = exports);
    assert(options.dir, 'options.dir should exit');
    if (!this.options.ignore) this.options.ignore = [];
    if (!Array.isArray(this.options.ignore)) this.options.ignore = [this.options.ignore];
  }

  load() {
    const target = {};
    this.singleLoad(this.options.dir, target);
    return target;
  }

  installize(cb) {
    this.cb = cb;
  }

  singleLoad(dir, target) {
    if (!fs.existsSync(dir)) return;
    const callback = this.cb;
    fs.readdirSync(dir).forEach(file => {
      const fullpath = path.resolve(dir, file);
      if (fs.statSync(fullpath).isDirectory()) {
        const name = camelize(file);
        target[name] = {};
        this.singleLoad(fullpath, target[name]);
      } else {
        if (!this.ignore(file) && /.js$/.test(file)) {
          const exports = loadFile(fullpath);
          const name = camelize(file);
          const res = callback(target, name, exports, file, fullpath);
          if (res) {
            target[name] = res;
          }
        }
      }
    });
  }

  ignore(file) {
    for (let i = 0; i < this.options.ignore.length; i++) {
      const item = this.options.ignore[i];
      if (typeof item === 'string') {
        if (file.indexOf(item) > -1) return true;
      } else if (item instanceof RegExp) {
        if (item.test(file)) return true;
      } else if (typeof item === 'function') {
        if (item(file)) return true;
      }
    }
  }
}