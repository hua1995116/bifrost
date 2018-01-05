const fs = require('fs');
const path = require('path');
const Agent = require('./lib/agent');

const {
  getAgentRuntimeArgs,
  loadFile,
  noop
} = require('./lib/util');

const AgentProcessArgv = getAgentRuntimeArgs(process.argv);
const agentFileExists = fs.existsSync(AgentProcessArgv.loader);
const agent = new Agent();
const loader = agentFileExists 
  ? loadFile(AgentProcessArgv.loader)
  : noop;

(async () => {
  await agent.setupPlugins();
  await loader(agent);
})()
.then(() => agent.createServer())
.then(() => agent.send('master', 'AGENT:READY'));