const Bifrost = require('../../../index');
module.exports = class Hello extends Bifrost.Service {
  constructor(app) {
    super(app);
  }
  add() {
    return 'hello world';
  }
  send() {
    return this.add();
  }
}