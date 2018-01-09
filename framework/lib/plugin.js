const fs = require('fs');
const path = require('path');
const Emitter = require('async-events-listener');
const resolvePluginOrder = require('../../utils/plugin');
const { loadFile } = require('../../utils')

module.exports = class NodebasePluginFramework extends Emitter {
  constructor(parent, component) {
    super();
    this.parent = parent;
    this.component = component;
    this.stacks = [];
  }

  resolvePlugins(file) {
    const plugin_path = this.parent.options.plugins;
    const cwd = this.parent.options.baseDir;
    const plugin_file = plugin_path ? path.resolve(cwd, plugin_path) : null;

    if (plugin_file && fs.existsSync(plugin_file)) {
      const pluginConfigs = loadFile(plugin_file);
      this.stacks = resolvePluginOrder(pluginConfigs, process.env.NODE_ENV, this.parent.name, file);
    }
  }

  async installPlugins(file) {
    this.resolvePlugins(file);
    for (let i = 0; i < this.stacks.length; i++) {
      const stack = this.stacks[i];
      if (this.component) {
        const target = new this.component();
        await stack.exports(target);
        this.stacks[i] = target;
      } else {
        await stack.exports(this.parent);
      }
    }
  }

  async uninstallPlugins() {
    if (this.component) {
      for (let i = 0; i < this.stacks.length; i++) {
        await this.stacks[i].emit('close');
      }
    } else {
      await this.parent.emit('app:plugin:destroy');
    }
  }
}