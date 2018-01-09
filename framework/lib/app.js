const NodebaseApplication = require('./index');

module.exports = class Application extends NodebaseApplication {
  constructor(options) {
    super(options);
    this.on('app:exit:child:notify', this.close.bind(this));
    this.on('app:exit:child:destroy', () => {
      if (this.status === 1) {
        clearInterval(this.__agentkeepAliveTimer__);
        this.status = 2;
      }
    })
  }

  async init() {
    await this.open('app.js');
  }

  async close() {
    await super.close();
    this.send('master', 'app:exit:child:done');
  }
}