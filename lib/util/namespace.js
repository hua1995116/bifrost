const bifrost = 'BIFROST';
exports.master = {
  createAgent: Symbol(`${bifrost}:master:createAgent`),
  createWorker: Symbol(`${bifrost}:master:createWorker`),
  onMessage: Symbol(`${bifrost}:master:onMessage`),
  onExit: Symbol(`${bifrost}:master:onExit`)
}

exports.agent = {
  onMessage: Symbol(`${bifrost}:agent:onMessage`),
  onAgentReady: Symbol(`${bifrost}:agent:onAgentReady`),
  onAgentInit: Symbol(`${bifrost}:agent:onAgentInit`),
  onExit: Symbol(`${bifrost}:agent:onExit`)
}

exports.worker = {
  createServer: Symbol(`${bifrost}:worker:createServer`),
  appRuntime: Symbol(`${bifrost}:worker:appRuntime`),
  onMessage: Symbol(`${bifrost}:worker:onMessage`),
  onExit: Symbol(`${bifrost}:worker:onExit`)
}

exports.plugin = {
  isLocked: Symbol(`${bifrost}:plugin:isLocked`)
}