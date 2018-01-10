module.exports = function(controller) {
  controller.hello = function(ctx) {
    ctx.body = controller.service.home.hello();
  }
}