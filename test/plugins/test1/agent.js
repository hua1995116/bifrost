module.exports = component => {
  component.a = 1;

  component.use(async (ctx, next) => {
    if (ctx.url === '/a/b/c') {
      ctx.reply({
        m: 'hello',
        n: 'world'
      });
    }
  })
}