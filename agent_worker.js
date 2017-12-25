const {
  getAgentRuntimeArgs
} = require('./lib/util');

const AgentProcessArgv = getAgentRuntimeArgs(process.argv);
const loader = require(AgentProcessArgv.loader);
const agent = new loader();

agent
  .createServer()
  .then(() => agent.send('master', 'AGENT:READY'));