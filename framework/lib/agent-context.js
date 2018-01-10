module.exports = class AgentMessageReceiver {
  constructor(obj, msg, context) {
    this.app = obj;
    this.url = msg.action;
    this.body = msg.body.data;
    this.to = msg.to;
    this.from = msg.from;
    this.cid = msg.body.cid;
    for (const i in context) {
      this[i] = context[i];
    }
  }

  send(...args) {
    if (args.length === 1) {
      return this.reply(args[0]);
    }
    return this.app.send(...args);
  }

  reply(...args) {
    return this.app.send(this.from, this.cid, ...args);
  }
}