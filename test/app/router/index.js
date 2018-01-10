module.exports = (app, router) => {
  router.get('/', app.controller.home.hello);
  router.get('/test', app.controller.test.hello);
}