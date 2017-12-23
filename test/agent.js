const Agent = require('../lib/agent');
const Component = require('./component');

module.exports = class AgentProcess extends Agent {
  constructor() {
    super();
    this.install('component', Component);
    this.on('receiveMessage', msg => {
      this.console.log(msg);
    })
  }

  beforeCreate() {
    this.console.log('agent beforeCreate');
  }

  created() {
    this.console.log('agent created');
  }

  beforeClose() {
    this.console.log('agent beforeClose');
  }

  closed() {
    this.console.log('agent closed');
  }

  bifrostReady() {
    this.console.log('agent bifrostReady');
  }
}