const fs = require('fs');
const Koa = require('koa');
const path = require('path');
const LookupLoader = require('./loader');
const LookupRouter = require('./router');
const { objectProxy, loadFile } = require('../util');

module.exports = class KoaFrameWork extends Koa {
  constructor(target) {
    super();
    this.base = target;
    this.context.base = target;
    this.cwd = target.options.cwd;
  }

  static bootstrap(options = {}) {
    return async base => {
      const app = new KoaFrameWork(base);
      app.loadClassicModule('Service', options.service);
      app.loadClassicModule('Controller', options.controller);
      app.loadClassicModule('Middleware', options.middleware);
      app.loadRouteModule(options.router);
      // TODO: 安装插件 ...
      app.loadInitModule(options.application);
      if (app.Router) {
        app.use(app.Router.routes(), app.Router.allowedMethods());
      }
      return app.callback();
    }
  }
  
  resolve(...args) {
    return path.resolve(this.cwd, ...args);
  }

  loadClassicModule(name, dir, target) {
    this[name] = {}
    this.context[name] = this[name];
    LookupLoader.classic(
      this.resolve(dir), 
      this[name], 
      // 如果不用objectProxy转换
      // 那么方法中无法使用this指向
      classic => objectProxy(new classic(target || this), 'app')
    );
  }

  loadRouteModule(dir) {
    this.Router = LookupRouter(this.resolve(dir), this);
  }

  loadInitModule(file) {
    if (file && fs.existsSync(file)) {
      const exports = loadFile(file);
      if (typeof exports === 'function') {
        exports(this);
      }
    }
  }
}