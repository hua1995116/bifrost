const Middleware = require('../middleware');
const AgentMessageReceiver = require('./context');

module.exports = class Channel extends Middleware {
  constructor(factory, config) {
    super();
    this.factory = factory;
    /**
     * Server status code:
     * @code 0: 关闭
     * @code 1: 锁定
     * @code 2: 启动
     */
    this.statusCode = 0;
    this.stacks = [];
    this.context = {};
    this.config = config;
  }

  get isRunning() {
    return this.stacks.length 
        && this.stacks[0].status;
  }

  lock() {
    this.statusCode = 1;
  }

  unlock() {
    this.statusCode = 2;
    this.runTask();
  }

  done() {
    return new Promise(resolve => {
      const timer = setInterval(() => {
        if (!this.stacks.length) {
          clearInterval(timer);
          resolve();
        }
      })
    });
  }

  addTask(msg) {
    this.stacks.push({
      status: false,
      message: msg
    });
    return this;
  }

  async runTask() {
    if (this.stacks.length && !this.isRunning && this.statusCode !== 1) {
      const msg = this.stacks[0];
      msg.status = true;
      await this.emit('task:start', msg.message);
      await this.execute(
        new AgentMessageReceiver(this.factory, msg.message, this.context)
      );
      await this.emit('task:done', msg.message);
      this.stacks.splice(0, 1);
      await this.runTask();
    }
  }

  async createServer() {
    if (!this.statusCode) {
      this.poly();
      await this.emit('server:start');
      this.statusCode = 2;
    }
  }

  async destroyServer() {
    if (this.stacks.length) {
      await this.done();
    }
    await this.emit('server:destroy');
  }
}