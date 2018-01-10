const path = require('path');
const cfork = require('cfork');
const cluster = require('cluster');
const detectPort = require('detect-port');
const IPCMessage = require('ipc-message');
const childprocess = require('child_process');
const debug = require('debug')('nodebase:cluster:master');
const parseOptions = require('../utils/options');
const { costTime } = require('../utils');

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
    /**
     * Master进程状态
     * this.status
     * 
     * 0: 正常运行中
     * 1: 正在关闭workers进程
     * 2: 正在关闭Agents进程
     * 3: 正在关闭Master进程
     */
    this.status = 0;
    this.options = parseOptions(options);
    this.on('message', this.onReceiveMessageHandler.bind(this));
    
    detectPort(this.options.port, (err, port) => {
      if (err) {
        err.name = 'ClusterPortConflictError';
        err.message = '[master] try get free port error, ' + err.message;
        // TODO: this.logger.error(err);
        debug('detectPort catch error', err);
        process.exit(1);
      }
      this.options.clusterPort = port;
      this.forkAgentWorker();
    });

    // 监听各个生命周期花费时间
    agentLifeCycle.forEach(life => this.on(life, costTime(life)));

    this.onLifeCycleBinding();
    this.onExitEventBinding();
  }

  async onReceiveMessageHandler(message) {
    const action = message.action;
    await this.emit(action, message);
  }

  // 绑定系统使用的生命周期函数
  onLifeCycleBinding() {
    this.on('agent:mounted', this.onAgentsMounted.bind(this));
    this.on('agent:exit:child:done', this.agentWorkerExitDone.bind(this));
    this.on('app:exit:child:done', this.appWorkerExitDone.bind(this));
    this.on('agent:exit', () => this.status = 3);
  }

  // 绑定系统退出的事件处理机制
  onExitEventBinding() {
    process.on('SIGINT', this.onSignal.bind(this, 'SIGINT'));
    process.on('SIGQUIT', this.onSignal.bind(this, 'SIGQUIT'));
    process.on('SIGTERM', this.onSignal.bind(this, 'SIGTERM'));
    process.on('exit', this.onExit.bind(this));
  }

  /**
   * 轮询确定是否所有Agents都已经mounted完毕
   * 条件为在IPCMessage上注册的agent个数是否与我们指定的agent个数相同
   * 发生：在任意一个agent的mounted周期上轮询
   */
  onAgentsMounted() {
    const realAgentsCount = Object.keys(this.agents).length;
    const customAgentsCount = this.options.agents.length;
    if (realAgentsCount === customAgentsCount) {
      debug('All agents is mounted, now start to fork workers.');
      this.forkApplicationWorker(this.options.max);
    }
  }

  forkAgentWorker() {
    const argvs = process.argv.slice(2);
    const opt = {
      cwd: this.options.cwd,
      stdout: process.stdout,
      stderr: process.stderr,
      env: process.env,
      execArgv: process.execArgv
    }
    for (let i = 0; i < this.options.agents.length; i++) {
      const args = argvs.concat([JSON.stringify(this.options)]);
      args.push(this.options.agents[i].name, this.options.agents[i].path);
      this.registAgent(
        this.options.agents[i].name, 
        childprocess.fork(agentWorkerFile, args, opt)
      );
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
        this.emit('app:exit');
      }
      
      if (this.status === 3) {
        if (this._agents.filter(a => !!a.connected).length) return;
        clearInterval(timer);
        debug(`[${this.pid}]`, 'master is closing process with signal:', signal);
        process.exit(0);
      }
    }, 100);
    
    if (this.status === 0) {
      this.send('workers', 'app:exit:child:notify');
      this.status = 1;
    }
  }

  onExit(code) {
    debug(`[${this.pid}]`, 'master is exited with code:', code);
  }
}