const fs = require('fs');
const Koa = require('koa');
const path = require('path');
const LookupLoader = require('./loader');
const LookupRouter = require('./router');
const { objectProxy, loadFile } = require('../util');
const resolvePlugin = require('../plugin/app');

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
      await app.loadPlugins();
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

  regist(name, object) {
    this[name] = object;
    this.context[name] = this[name];
    return this[name];
  }

  async loadPlugins() {
    const plugin = this.resolve('plugin.js');
    if (fs.existsSync(plugin)) {
      const plugins = resolvePlugin(loadFile(plugin), this.base.env);
      for (let i = 0; i < plugins.length; i++) {
        const { exports, config } = plugins[i];
        if (typeof exports === 'function') {
          await exports(this, config);
        }
      }
    }
  }

  loadModule(name, dir, callback) {
    LookupLoader.classic(this.resolve(dir), this.regist(name, {}), callback);
  }

  loadClassicModule(name, dir, target) {
    this.loadModule(name, dir, 
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