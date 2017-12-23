const Koa = require('koa');
module.exports = app => {
  const koa = new Koa();
  koa.context.base = app;
  koa.use(async ctx => {
    if (ctx.req.url === '/favicon.ico') {
      return;
    }
    const data = await ctx.base.fetch('agent://component/a/b', {
      a:4
    });
    ctx.body = data
  });

  app.beforeStart(() => {
    app.console.log(`[${app.pid}]`, 'beforeStart');
  })
  app.started(() => {
    app.console.log(`[${app.pid}]`, 'started');
  })
  app.beforeStop(() => {
    app.console.log(`[${app.pid}]`, 'beforeStop');
  })
  app.stoped(() => {
    app.console.log(`[${app.pid}]`, 'stoped');
  })

  return koa.callback();
}