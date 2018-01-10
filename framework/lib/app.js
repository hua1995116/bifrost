const koa = require('koa');
const http = require('http');
const https = require('https');
const assert = require('assert');
const NodebaseApplication = require('./index');
const { loadFile, objectProxy } = require('../../utils');
const debug = require('debug')('nodebase:application:worker');
const FileLoader = require('./loader');
const is = require('is-type-of');
const ServiceClassBasic = require('../basic/service');
const ControllerClassBasic = require('../basic/controller');
const MiddlewareClassBasic = require('../basic/middleware');
const classBasic = require('../basic/basic');

module.exports = class Application extends NodebaseApplication {
  constructor(options) {
    super(options);
    this.app = new koa();
    this.reploads = [];
    this.on('app:exit:child:notify', this.close.bind(this));
    this.on('app:exit:child:destroy', () => {
      if (this.status === 1) {
        clearInterval(this.__agentkeepAliveTimer__);
        this.status = 2;
      }
    });
  }

  async init() {
    await this.open('app.js');
  }

  async close() {
    await super.close();
    this.send('master', 'app:exit:child:done');
  }

  preload(cb) {
    this.preloads.push(cb);
  }

  loadServiceModules() {
    if (!this.options.service) this.options.service = 'app/service';
    this.options.service = this.resolve(this.options.service);
    const loader = new FileLoader({
      dir: this.options.service,
      ignore: []
    });
    loader.installize((target, name, exports, file, fullpath) => {
      if (is.class(exports)) {
        const obj = new exports(this);
        assert(obj.type === 'service', `Class file: ${fullpath} should extends from Application.Service`);
        return objectProxy(obj, 'base');
      } else if (is.function(exports)) {
        const object = new ServiceClassBasic(this);
        exports(object);
        return objectProxy(object, 'base');
      }
    });
    this.service = loader.load();
  }

  loadMiddlewareModules() {
    if (!this.options.middleware) this.options.middleware = 'app/middleware';
    this.options.middleware = this.resolve(this.options.middleware);
    const loader = new FileLoader({
      dir: this.options.middleware,
      ignore: []
    });
    loader.installize((target, name, exports, file, fullpath) => {
      if (is.class(exports)) {
        const obj = new exports(this);
        assert(obj.type === 'middleware', `Class file: ${fullpath} should extends from Application.Middleware`);
        return objectProxy(obj, 'base');
      } else if (is.function(exports)) {
        const object = new MiddlewareClassBasic(this);
        exports(object);
        return objectProxy(object, 'base');
      }
    });
    this.middleware = loader.load();
  }

  loadControllerModules() {
    if (!this.options.controller) this.options.controller = 'app/middleware';
    this.options.controller = this.resolve(this.options.controller);
    const loader = new FileLoader({
      dir: this.options.controller,
      ignore: []
    });
    loader.installize((target, name, exports, file, fullpath) => {
      if (is.class(exports)) {
        const obj = new exports(this);
        assert(obj.type === 'controller', `Class file: ${fullpath} should extends from Application.Controller`);
        return objectProxy(obj, 'base');
      } else if (is.function(exports)) {
        const object = new ControllerClassBasic(this);
        exports(object);
        return objectProxy(object, 'base');
      }
    });
    this.controller = loader.load();
  }

  async startWithService() {
    this.loadServiceModules();
    this.loadMiddlewareModules();
    this.loadControllerModules();
    for (let i = 0; i < this.reploads.length; i++) {
      await this.reploads[i].call(this, FileLoader, classBasic);
    }
    this.app.use(async ctx => {
      ctx.body = 'hello world';
    });
    await this.createServer(this.app.callback());
  }

  async createServer(callback) {
    await this.emit('app:beforeServerStart');
    const netWork = this.options.https ? https : http;
    const port = this.options.port || 8080;
    const options = [];
    if (this.options.secure) {
      options.push({
        key: this.options.key, 
        cert: this.options.cert
      }, callback);
    } else {
      options.push(callback);
    }
    await new Promise((resolve, reject) => {
      this.server = netWork.createServer(...options);
      this.server.listen(port, err => {
        if (err) return reject(err);
        const httpname = this.options.https ? 'https' : 'http';
        const hostname = '127.0.0.1';
        debug('[%d] Start service on %s://%s:%d', this.pid, httpname, hostname, port);
        resolve();
      });
    })
  }
}