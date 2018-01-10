const fs = require('fs');
const path = require('path');
const Router = require('koa-router');
const { loadFile } = require('../../utils');

module.exports = function(app) {
  app.router = loadRoutesModules(app.resolve('app/router'), app);
  if (app.router) {
    app.router.convert = function() {
      return [app.router.routes(), app.router.allowedMethods()];
    }
  }
}

function loadRoutesModules(dir, inject) {
  return load(dir);

  function load(dir, name, route) {
    if (!fs.existsSync(dir)) return;
    const {
      files,
      dirs
    } = collectDirs(dir);

    const indexRouter = files['index.js'];
  
    if (indexRouter) {
      const router = parse(inject, indexRouter);

      for (const i in files) {
        if ('index.js' === i) continue;
        const _router = parse(inject, files[i]);
        router.use('/' + replacePrefix(i), _router.routes(), _router.allowedMethods());
      }
  
      for (const j in dirs) {
        load(dirs[j], j, router);
      }

      if (name) {
        route.use('/' + name, router.routes(), router.allowedMethods());
      }
      return router;
    }
  }
}

function collectDirs(dir) {
  const files = fs.readdirSync(dir);
  const _files = {};
  const _dirs = {};

  files.forEach(file => {
    const _path = path.resolve(dir, file);
    if (fs.statSync(_path).isDirectory()) {
      _dirs[file] = _path;
    } else {
      _files[file] = _path;
    }
  });

  return {
    files: _files,
    dirs: _dirs
  }
}

function parse(inject, file) {
  const modal = loadFile(file);
  const router = new Router();
  modal(inject, router);
  return router;
}

function replacePrefix(d) {
  return d.replace(/\.js$/, '');
}