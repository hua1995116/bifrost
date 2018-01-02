const {
  getAgentRuntimeArgs
} = require('./lib/util');
const Agent = require('./lib/agent');

const AgentProcessArgv = getAgentRuntimeArgs(process.argv);
const loader = require(AgentProcessArgv.loader);
const agent = new Agent();

(async () => await loader(agent))()
.then(() => agent.createServer())
.then(() => agent.send('master', 'AGENT:READY'));