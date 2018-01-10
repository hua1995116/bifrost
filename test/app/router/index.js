module.exports = (app, router) => {
  router.get('/', ctx => {
    ctx.body = 'hello nodebase';
  })
}