const {
  getAgentRuntimeArgs,
  nameSpace
} = require('./lib/util');

const AgentProcessArgv = getAgentRuntimeArgs(process.argv);
const loader = require(AgentProcessArgv.loader);
const agent = new loader();

agent[nameSpace.agent.onAgentInit]().then(() => agent[nameSpace.agent.onAgentReady]());