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
const Router = require('./router');

module.exports = class Application extends NodebaseApplication {
  constructor(options) {
    super(options);
    this.app = new koa();
    this.reploads = [];
    this.callbackId = 0;
    this.callbacks = {};
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
    if (!this.options.controller) this.options.controller = 'app/controller';
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
    if (!this.router) {
      await Router(this, FileLoader, classBasic);
    }
    assert(this.router, 'Application.router is undefined, please make sure router is loaded');
    this.app.use(...this.router.convert());
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

  async fetch(url, body, socket, options = {}) {
    const exec = /([^:]+):\/\/([^\/]+)\/?(.+)?/.exec(url);
    assert(exec, 'It is not a standard resource path.');
    const agent = exec[1];
    const service = exec[2];
    const uri = exec[3] ? '/' + exec[3] : '/';
    return new Promise((resolve, reject) => {
      const time = new Date().getTime();
      const id = this.callbackId++;
      const timer = setInterval(() => {
        if (new Date().getTime() - time > (options.timerout || 10000)) {
          delete this.callbacks[id];
          clearInterval(timer);
          reject(new Error('Timeout'));
        }
      }, 10);
      this.callbacks[id] = (err, data) => {
        delete this.callbacks[id];
        clearInterval(timer);
        if (err) return reject(err);
        resolve(data);
      }
      debug('send message %j to `%s` by `%s`', {
        service: service,
        data: body,
        cid: id
      }, agent, uri);
      this.send(agent, uri, {
        service: service,
        data: body,
        cid: id
      }, socket);
    })
  }

  async onApplicationReceiveMessage(msg, socket) {
    debug('worker receive message:', msg, socket);
    const action = msg.action;
    if (typeof action === 'number') {
      const cb = this.callbacks[msg.action];
      if (msg.body.error) {
        return cb(new Error(msg.body.error))
      }
      cb(null, msg.body);
    } else {
      await this.emit(action, msg, socket);
    }
  }
}