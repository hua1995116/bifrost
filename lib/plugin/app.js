const fs = require('fs');
const path = require('path');
const { loadFile, sortDependencies } = require('../util');

module.exports = resolvePlugin;

function resolvePlugin(configs, env) {
  const tree = {};
  for (const plugin in configs) {
    const config = configs[plugin];

    if (config.enable === undefined) config.enable = true;
    if (!config.env || config.env === '*') config.env = [];
    if (!Array.isArray(config.env)) config.env = [config.env];

    const next = 
      !config.enable || 
      (config.env.length && config.env.indexOf(env) === -1);
    if (next) continue;

    const pluginPackageName = config.package;
    const pluginPathName = config.path;

    if (!pluginPackageName && !pluginPathName) {
      // throw new Error('miss package');
      continue;
    }

    let pkgPath, modal, exportsPath;

    if (pluginPathName) {
      pkgPath = path.resolve(pluginPathName, 'package.json');
      if (!fs.existsSync(pkgPath)) {
        // throw new Error('miss package');
        continue;
      }
      modal = loadFile(pkgPath);
      exportsPath = path.resolve(pluginPathName, 'app.js');
    } else {
      modal = loadFile(pluginPackageName + '/package.json');
      exportsPath = path.resolve(pluginPackageName, 'app.js');
    }

    if (!modal.plugin || modal.plugin.name !== plugin) {
      // throw new Error('error plugin');
      continue;
    }

    if (fs.existsSync(exportsPath)) {
      tree[plugin] = {
        dependencies: modal.plugin.dependencies || [],
        exports: loadFile(exportsPath),
        config: config.config
      }
    }
  }

  return sortDependencies(tree);
}