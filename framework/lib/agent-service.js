const Emitter = require('async-events-listener');

module.exports = class AgentService extends Emitter {
  constructor() {
    super();
  }
}