const Basic = require('./basic');

module.exports = class Service extends Basic {
  constructor(ctx) {
    super(ctx);
    this.type = 'service';
  }
}