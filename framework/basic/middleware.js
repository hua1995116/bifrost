const Basic = require('./basic');

module.exports = class Middleware extends Basic {
  constructor(ctx) {
    super(ctx);
    this.type = 'middleware';
  }

  get service() {
    return this.base.service;
  }
}