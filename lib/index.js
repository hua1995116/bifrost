const os = require('os');
const path = require('path');
const http = require('http');
const https = require('https');
const cluster = require('cluster');
const IPCMessage = require('ipc-message');
const ChildProcess = require('child_process');
const Logger = require('./logger');
const { nameSpace } = require('./util');

module.exports = class Bifrost extends IPCMessage {
  /**
   * 参数说明：
   * @param {Object} options 
   *  max: 最大启动个数
   *  cwd: 项目目录
   *  agents: {key: value}: {"agentName": "/usr/evio/agent.js"}
   *  app_worker
   *  secure, {key, cert}
   *  port,
   *  host
   */
  constructor(options = {}) {
    super();

    this.options = options;
    this.console = new Logger(this);
    this.logger = console;
    this.agentReadyCount = 0;
    this.workerReadyCount = 0;
    this.callbacks = {};
    this.callbackId = 0;
    this.lifeCycles = {};

    if (!this.options.cwd) {
      this.options.cwd = process.cwd();
    }

    if (!this.options.timeout) {
      this.options.timeout = 2000;
    }

    process.on('SIGINT', () => {
      if ('master' === this.type) {
        this[nameSpace.master.onExit]()
          .then(() => process.exit(0))
          .catch(e => process.exit(1));
      } else {
        this[nameSpace.worker.onExit]()
          .then(() => process.exit(0))
          .catch(e => process.exit(1));
      }
    });

    this.on('message', msg => {
      if ('master' === this.type) {
        this[nameSpace.master.onMessage](msg);
      } else {
        this[nameSpace.worker.onMessage](msg);
      }
    });

    ['error', 'rejectionHandled', 'uncaughtException'].forEach(err => {
      process.on(err, e => this.emit('error', e));
    });

    if ('master' === this.type) {
      for (const agent in this.options.agents) {
        this[nameSpace.master.createAgent](agent, this.options.agents[agent]);
      }
    } else {
      this[nameSpace.worker.appRuntime]().then(
        callback => this[nameSpace.worker.createServer](callback)
      );
    }
  }

  [nameSpace.master.onExit]() {
    return new Promise(resolve => {
      let agentExited = false;
      this.exiting = true;
      clearInterval(this.timer);
      this.timer = setInterval(() => {
        for (const agent in this.agents) {
          if (this.agents[agent].connected) return;
        }
        !agentExited && this.emit('agent:exit');
        agentExited = true;
        for (const id in cluster.workers) {
          if (!cluster.workers[id].isDead()) return;
        }
        resolve();
        this.emit('exit');
      }, 100);
    })
  }

  async [nameSpace.worker.onExit]() {
    await this.emit('wroker:beforeStop');
    this.server.close();
    await this.emit('wroker:stoped');
  }

  async [nameSpace.worker.createServer](callback) {
    const netWork = this.options.secure ? https : http;
    const port = this.options.port || 8080;
    const host = this.options.host || '0.0.0.0';
    const options = [];
    if (this.options.secure) {
      options.push(this.options.secure, callback);
    } else {
      options.push(callback);
    }
    await this.emit('wroker:beforeStart');
    await new Promise((resolve, reject) => {
      try{
        this.server = netWork.createServer(...options);
        this.server.listen(port, host, () => {
          this.send('master', 'WORKER:READY');
          const httpname = this.options.secure ? 'https' : 'http';
          const hostname = host === '0.0.0.0' ? '127.0.0.1': host;
          this.console.info('[worker]: [%d]: => %s://%s:%d', this.pid, httpname, hostname, port);
          this.emit('wroker:started').then(resolve);
        });
      } catch(e) { reject(e); }
    });
  }

  async [nameSpace.worker.appRuntime]() {
    const appWorker = require(
      path.resolve(this.options.cwd, this.options.app_worker)
    );
    return await appWorker(this);
  }

  async [nameSpace.master.onMessage](msg) {
    switch (msg.action) {
      case 'AGENT:READY':
        this.agentReadyCount--;
        if (this.agentReadyCount === 0) {
          await this.emit('agent:ready');
          this[nameSpace.master.createWorker]();
        }
        break;
      case 'WORKER:READY':
        this.workerReadyCount--;
        if (this.workerReadyCount === 0) {
          this.send(['workers', 'agents'], 'MASTER:READY');
          await this.emit('ready');
        }
        break;
    }
  }

  [nameSpace.worker.onMessage](msg) {
    if (typeof msg.action === 'number') {
      const cb = this.callbacks[msg.action];
      if (msg.body.error) {
        return cb(new Error(msg.body.error))
      }
      cb(null, msg.body);
    } else {
      switch (msg.action) {
        case 'MASTER:READY':
          this.emit('master:ready', msg);
          break;
        default: this.emit('receive:message', msg);
      }
    }
  }

  [nameSpace.master.createAgent](name, file) {
    const agentRuntimeFile = path.resolve(__dirname, '..', 'agent_worker.js');
    process.argv.push('--AGENT-RUNTIME-LOADER=' + path.resolve(this.options.cwd, file));
    process.argv.push('--AGENT-RUNTIME-CWD=' + this.options.cwd);
    process.argv.push('--AGENT-RUNTIME-NAME=' + name);
    this.agentReadyCount++;
    const agent = ChildProcess.fork(agentRuntimeFile, process.argv, {
      cwd: this.options.cwd,
      stdout: process.stdout,
      stderr: process.stderr,
      stdin: process.stdin,
      stdio: process.stdio,
      env: process.env,
      execArgv: process.execArgv
    });
    this.registAgent(name, agent);
  }

  [nameSpace.master.createWorker]() {
    const cpus = os.cpus().length;
    this.options.max = this.options.max || cpus;
    if (this.options.max > cpus) this.options.max = cpus;
    if (this.options.max === 0) this.options.max = cpus;
    let i = this.options.max;
    cluster.on('fork', () => this.workerReadyCount++);
    cluster.on('exit', () => {
      if (this.exiting) return;
      cluster.fork();
    });
    while (i--) cluster.fork();
  }

  fetch(url, body) {
    if ('worker' !== this.type) {
      return;
    }

    const exec = /([^:]+):\/\/([^\/]+)\/?(.+)?/.exec(url);
    if (!exec) {
      return this.console.error('It is not a standard resource path.');
    }

    const agent = exec[1];
    const service = exec[2];
    const uri = exec[3] || '/';

    return new Promise((resolve, reject) => {
      const time = new Date().getTime();
      const id = this.callbackId++;
      const timer = setInterval(() => {
        if (new Date().getTime() - time > this.options.timeout) {
          delete this.callbacks[id];
          clearInterval(timer);
          reject(new Error('Timeout'));
        }
      }, 10);
      this.callbacks[id] = (err, data) => {
        delete this.callbacks[id];
        clearInterval(timer);
        if (err) return reject(err);
        resolve(data);
      }
      this.send(agent, uri, {
        service: service,
        data: body,
        cid: id
      });
    })
  }
}