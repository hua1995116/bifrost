const Application = require('../../../framework');

module.exports = class Test extends Application.Controller {
  constructor(ctx) {
    super(ctx);
  }

  async hello(ctx) {
    ctx.body = await this.base.service.test.hello();
  }
}