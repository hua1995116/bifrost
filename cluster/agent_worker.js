const debug = require('debug')('nodebase:cluster:agent');

const options = JSON.parse(process.argv[2]);
const name = process.argv[3];
const loader = process.argv[4];
options.name = name;
options.loader = loader;

const Agent = require(options.framework).Agent;
const agent = new Agent(options);

[
  'beforeCreate',
  'created',
  'beforeMount',
  'mounted',
  'beforeDestroy',
  'destroyed'
].forEach(life => {
  agent.on(life, () => 
    agent.send('master', `agent:${life}`, {
      time: Date.now(),
      pid: agent.pid
    })
  );
});

process.on('SIGTERM', () => agent.checkLifeExit())
process.on('SIGINT', () => agent.checkLifeExit());
process.on('SIGQUIT', () => agent.checkLifeExit());
process.on('exit', code => debug(`[${agent.pid}]`, 'Agent worker is exited with code', code));

agent.init();