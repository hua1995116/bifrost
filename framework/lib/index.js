const fs = require('fs');
const path = require('path')
const IPCMessage = require('ipc-message');
const PluginFramework = require('./plugin');
const { loadFile } = require('../../utils');

module.exports = class Nodebase extends IPCMessage {
  constructor(options, isAgent) {
    super(isAgent);
    this.options = options;
    this.baseDir = options.baseDir;
    this.status = 0;
    this.on('message', async (msg, socket) => {
      await this.onReceiveMessageHandler(msg, socket);
    });
  }

  resolve(...args) {
    return path.resolve(this.baseDir, ...args);
  }

  checkLifeExit() {
    const timer = setInterval(() => {
      if (this.status === 2) {
        clearInterval(timer);
        process.exit(0);
      }
    }, 100);
  }

  async onReceiveMessageHandler(msg, socket) {
    if (this.type === 'agent') {
      await this.onAgentReceiveMessage(msg, socket);
    } else {
      await this.onApplicationReceiveMessage(msg, socket);
    }
  }

  async initPlugin(type, component) {
    if (!this.options.plugins) this.options.plugins = 'plugin.js';
    this.plugin = new PluginFramework(this, component);
    await this.plugin.installPlugins(type);
  }

  async loadFileWorker(...inject) {
    if (this.options.loader && fs.existsSync(this.options.loader)) {
      const exports = loadFile(this.options.loader);
      if (typeof exports === 'function') {
        const callback = await exports(this);
        if (typeof callback === 'function') {
          return await callback(...inject);
        }
        return callback;
      }
    }
  }

  async open(type, component) {
    await this.loadFileWorker();
    await this.emit('beforeCreate');
    await this.initPlugin(type, component);
    await this.emit('created');
    await this.emit('beforeMount');
    if (this.startWithService) {
      await this.startWithService();
    }
    await this.emit('mounted');
  }

  async close() {
    if (this.status !== 0) return;
    this.status = 1;
    await this.emit('beforeDestroy');
    await this.plugin.uninstallPlugins();
    await this.emit('destroyed');
  }
}

