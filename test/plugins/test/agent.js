module.exports = component => {
  [
    'task:start',
    'task:done',
    'server:start',
    'server:destroy'
  ].forEach(name => {
    component.on(name, (...args) => {
      console.log('[agent]:', '[channel]:', name, ...args);
    })
  });

  component.use(async(ctx, next) => {
    ctx.reply({
      a: 1,
      b: 3,
      c: ctx.body
    });
    await next();
  })
}