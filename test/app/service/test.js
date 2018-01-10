const Application = require('../../../framework');

module.exports = class Test extends Application.Service {
  constructor(ctx) {
    super(ctx);
  }

  async hello() {
    const data = await this.base.fetch('agent://test1/a/b/c', {
      a:1,
      b:2
    });
    return 'Hello Nodebase Classic: ' + data.m + ' ' + data.n + '!';
  }
}