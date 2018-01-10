const Basic = require('./basic');

module.exports = class Controller extends Basic {
  constructor(ctx) {
    super(ctx);
    this.type = 'controller';
  }

  get service() {
    return this.base.service;
  }

  get middleware() {
    return this.base.middleware;
  }
}