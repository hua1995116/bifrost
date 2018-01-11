const Middleware = require('./middleware');
const AgentContext = require('./agent-context');

module.exports = class AgentService extends Middleware {
  constructor(ctx) {
    super();
    this.base = ctx.parent;
    this.parent = ctx;
    this.context = {};
  }

  async cross(message) {
    await this.emit('task:start', message);
    await this.execute(new AgentContext(this.base, message, this.context));
    await this.emit('task:end', message);
  }
}