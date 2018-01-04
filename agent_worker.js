const {
  getAgentRuntimeArgs
} = require('./lib/util');
const path = require('path');
const Agent = require('./lib/agent');

const AgentProcessArgv = getAgentRuntimeArgs(process.argv);
const dir = path.dirname(AgentProcessArgv.loader);
const loader = require(AgentProcessArgv.loader);
const agent = new Agent(dir);

(async () => {
  await agent.setupPlugins();
  await loader(agent);
})()
.then(() => agent.createServer())
.then(() => agent.send('master', 'AGENT:READY'));