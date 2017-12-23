module.exports = component => {
  component.beforeStart(() => {
    console.log('component beforeStart');
  });

  component.beforeStop(() => {
    console.log('component beforeStop');
  })

  component.agentDidReady(() => {
    console.log('component agentDidReady');
  })

  component.use(async (ctx, next) => {
    ctx.send({a:1,b:2, c:ctx.body});
    await next();
  })
}