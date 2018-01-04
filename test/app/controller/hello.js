const Bifrost = require('../../../index');
module.exports = class Hello extends Bifrost.Controller {
  constructor(app) {
    super(app)
  }

  send(ctx) {
    ctx.status = 200;
    ctx.body = this.Service.hello.send();
  }
}