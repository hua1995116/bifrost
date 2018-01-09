const path = require('path');
const cfork = require('cfork');
const cluster = require('cluster');
const detectPort = require('detect-port');
const IPCMessage = require('ipc-message');
const childprocess = require('child_process');
const debug = require('debug')('nodebase:cluster:master');
const parseOptions = require('../utils/options');
const toString = Object.prototype.toString;
const agentWorkerFile = path.resolve(__dirname, './agent_worker.js');
const appWorkerFile = path.resolve(__dirname, './app_worker.js');

const agentLifeCycle = [
  'agent:beforeCreate',
  'agent:created',
  'agent:beforeMount',
  'agent:mounted',
  'agent:beforeDestroy',
  'agent:destroyed',
  'app:beforeCreate',
  'app:created',
  'app:beforeMount',
  'app:mounted',
  'app:beforeDestroy',
  'app:destroyed'
];

module.exports = class Master extends IPCMessage {
  constructor(options) {
    super();
    this.agentWorkerIndex = 0;
    this.status = 0;
    this.options = parseOptions(options);
    this.on('message', this.onReceiveMessageHandler.bind(this));

    let startTime = Date.now();
    
    detectPort((err, port) => {
      if (err) {
        err.name = 'ClusterPortConflictError';
        err.message = '[master] try get free port error, ' + err.message;
        // TODO: this.logger.error(err);
        debug('detectPort catch error', err);
        process.exit(1);
      }
      debug('detectPort success cost time:', (Date.now() - startTime) + 'ms');
      this.options.clusterPort = port;
      this.forkAgentWorker();
    });

    agentLifeCycle.forEach(life => this.on(life, costTime(`[${life}]:`)));
    this.on('agent:mounted', this.forkApplicationWorker.bind(this, this.options.max));
    this.on('agent:exit:child:done', this.agentWorkerExitDone.bind(this));
    this.on('app:exit:child:done', this.appWorkerExitDone.bind(this));
    this.on('agent:exit', () => this.status = 3);

    process.on('SIGINT', this.onSignal.bind(this, 'SIGINT'));
    process.on('SIGQUIT', this.onSignal.bind(this, 'SIGQUIT'));
    process.on('SIGTERM', this.onSignal.bind(this, 'SIGTERM'));
    process.on('exit', this.onExit.bind(this));

    function costTime(name) {
      return msg => {
        msg.body = parseInt(msg.body, 10);
        const delay = msg.body - startTime;
        startTime = msg.body;
        debug(name, delay + 'ms');
      }
    }
  }

  async onReceiveMessageHandler(message, socket) {
    if (socket) {
      return await this.emit(message, socket);
    }
    const action = message.action;
    if (path.isAbsolute(action)) {

    } else {
      await this.emit(action, message);
    }
  }

  forkAgentWorker() {
    this.agentStartTime = Date.now();
    const debugPort = 5800;
    const argvs = process.argv.slice(2);
    const opt = {
      cwd: this.options.cwd,
      stdout: process.stdout,
      stderr: process.stderr,
      env: process.env
    };
    if (this.options.isDebug) {
      opt.execArgv = process.execArgv.concat([`--debug-port=${debugPort}`]);
    }
    for (let i = 0; i < this.options.agents.length; i++) {
      const args = argvs.concat([JSON.stringify(this.options)]);
      args.push(this.options.agents[i].name, this.options.agents[i].path);
      const agentWorker = childprocess.fork(agentWorkerFile, args, opt);
      agentWorker.id = ++this.agentWorkerIndex;
      // agentWorker.on('error', err => {
      //   err.name = 'AgentWorkerError';
      //   err.id = agentWorker.id;
      //   err.pid = agentWorker.pid;
      //   // TODO: this.logger.error(err);
      //   debug('agent fork catch error:', err);
      // });
      // agentWorker.on('exit', (code, signal) => {
      //   debug('master:agent close')
      //   // this.send('master', 'agent-exit', {
      //   //   code, signal, pid: agentWorker.pid
      //   // });
      // });
      this.registAgent(this.options.agents[i].name, agentWorker);
    }
  }

  forkApplicationWorker(max) {
    const argvs = process.argv.slice(2);
    const args = argvs.concat([JSON.stringify(this.options)]);
    args.push(this.options.app);
    cfork({
      exec: appWorkerFile,
      args,
      silent: false,
      count: max,
      // don't refork in local env
      refork: false,
      env: process.env
    });
    cluster.on('exit', () => {
      if (this.status === 0) this.forkApplicationWorker(1);
    });
  }

  async agentWorkerExitDone(message) {
    this.send(message.from, 'agent:exit:child:destroy');
    if (!this._agets) this._agents = [];
    if (this.agents[message.body]) {
      this._agents.push(this.agents[message.body]);
      delete this.agents[message.body];
    }
    if (!Object.keys(this.agents).length) {
      await this.emit('agent:exit');
    }
  }

  async appWorkerExitDone(message) {
    this.send(message.from, 'app:exit:child:destroy');
  }

  onSignal(signal) {
    const timer = setInterval(() => {
      if (this.status === 1) {
        for (const id in cluster.workers) {
          if (!cluster.workers[id].isDead()) return;
        }
        this.status = 2;
        this.send('agents', 'agent:exit:child:notify');
      }
      
      if (this.status === 3) {
        // const err = this.status;
        // if (err instanceof Error || toString.call(err) === '[object Error]') {
        //   debug('master exit process catch error', err);
        //   clearInterval(timer);
        //   process.exit(1);
        // }
        if (this._agents.filter(a => !!a.connected).length) return;
        clearInterval(timer);
        debug('master ext process success');
        process.exit(0);
      }
    }, 100);
    
    if (this.status === 0) {
      this.send('workers', 'app:exit:child:notify');
      this.status = 1;
    }
  }

  onExit(code) {
    // istanbul can't cover here
    // https://github.com/gotwarlost/istanbul/issues/567
    //const level = code === 0 ? 'info' : 'error';
    //this.logger[level]('[master] exit with code:%s', code);
  }
}