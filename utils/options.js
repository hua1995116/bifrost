const os = require('os');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { getFrameworkPath } = require('./framework');

module.exports = function(options) {
  const defaults = {
    framework: '',
    baseDir: process.cwd(),
    port: options.https ? 8443 : 8080,
    max: null,
    plugins: null,
    https: false,
    key: '',
    cert: '',
    agents: null,
    app: null
  };

  options = extend(defaults, options);
  if (!options.max) {
    options.max = os.cpus().length;
  }

  const pkgPath = path.join(options.baseDir, 'package.json');
  assert(fs.existsSync(pkgPath), `${pkgPath} should exist`);

  options.framework = getFrameworkPath({
    baseDir: options.baseDir,
    // compatible customNodebase only when call startCluster directly without framework
    framework: options.framework || options.customNodebase,
  });

  const nodebase = require(options.framework);
  assert(nodebase.Application, `should define Application in ${options.framework}`);
  assert(nodebase.Agent, `should define Agent in ${options.framework}`);

  if (!options.agents) options.agents = [{ name: 'agent', path: resolve(options.baseDir, 'agent.js') }];
  if (!Array.isArray(options.agents)) {
    if (typeof options.agents === 'string') {
      options.agents = [{ name: options.agents, path: resolve(options.baseDir, options.agents + '.js') }];
    } else if (typeof options.agents === 'object') {
      options.agents = [];
      for (const i in options.agents) {
        options.agents.push({
          name: i,
          path: resolve(options.baseDir, options.agents[i])
        });
      }
    } else {
      throw new Error(`options.agents is an unformated object: ${options.agents}`);
    }
  }

  options.agents = options.agents.map(agent => {
    if (typeof agent === 'string') return {
      name: agent,
      path: resolve(options.baseDir, agent + '.js')
    }

    if (
      typeof agent === 'object' && 
      agent.name && 
      agent.path && 
      path.isAbsolute(agent.path)
    ) return agent;
    
    return null;
  }).filter(agent => agent !== null);

  options.agents.forEach(agent => assert(
    fs.existsSync(agent.path), 
    `agent[${agent.name}]: ${agent.path} should exists`
  ));

  if (!options.app) {
    options.app = resolve(options.baseDir, 'app.js')
  }

  if (options.https) {
    assert(options.key && fs.existsSync(options.key), 'options.key should exists');
    assert(options.cert && fs.existsSync(options.cert), 'options.cert should exists');
  }

  options.port = parseInt(options.port, 10) || undefined;
  options.max = parseInt(options.max, 10);

  // don't print depd message in production env.
  // it will print to stderr.
  if (process.env.NODE_ENV === 'production') {
    process.env.NO_DEPRECATION = '*';
  }

  const isDebug = process.execArgv.some(argv => argv.includes('--debug') || argv.includes('--inspect'));
  if (isDebug) options.isDebug = isDebug;

  return options;
}

function extend(target, src) {
  const keys = Object.keys(src);
  for (const key of keys) {
    if (src[key] != null) {
      target[key] = src[key];
    }
  }
  return target;
}

function resolve(cwd, ...args) {
  return path.resolve(cwd, ...args);
}