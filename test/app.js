module.exports = app => {
  app.Router.get('/test', async ctx => {
    const type = ctx.query.type || 'test';
    const data = await ctx.base.fetch(`agent://${type}/a/b`, {
      a:4
    });
    ctx.body = data;
  });

  [
    'wroker:beforeStart',
    'wroker:started',
    'wroker:beforeStop',
    'wroker:stoped',
    'master:ready',
    'receive:message'
  ].forEach(name => {
    app.on(name, (...args) => {
      app.console.log('[worker]:', name, ...args);
    })
  });
}