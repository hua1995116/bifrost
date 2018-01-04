module.exports = (app, router) => {
  router.get('/', app.Controller.hello.send);
}