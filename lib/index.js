const os = require('os');
const ip = require('ip');
const net = require('net');
const path = require('path');
const http = require('http');
const https = require('https');
const Socket = require('socket.io');
const cluster = require('cluster');
const IPCMessage = require('ipc-message');
const ChildProcess = require('child_process');
const Logger = require('./logger');
const Application = require('./framework');
const Basic = require('./framework/basic');
const { nameSpace } = require('./util');

class Bifrost extends IPCMessage {
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
   *  socket
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
    this.env = process.env.NODE_ENV;

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
      if (!this.options.agents) this.options.agents = ['agent'];
      if (!Array.isArray(this.options.agents)) this.options.agents = [this.options.agents];
      for (let i = 0; i < this.options.agents.length; i++) {
        this[nameSpace.master.createAgent](this.options.agents[i]);
      }
    } else {
      this[nameSpace.worker.appRuntime]().then(
        callback => this[nameSpace.worker.createServer](callback)
      );
    }
  }

  get cwd() {
    return this.options.cwd;
  }

  createSocketServer() {
    if (!this.options.socket) return;
    this.emit('master:socket:beforeStart');
    this.io = net.createServer({ pauseOnConnect: true }, connection => {
      console.log('in master socket')
      if (!connection.remoteAddress) {
        return connection.close();
      }

      const worker = this.stickyWorker(connection.remoteAddress);
      if (worker) {
        worker.send('sticky-session:connection', connection);
      }
      // const addr = ip.toBuffer(connection.remoteAddress || '127.0.0.1');
      // const hash = this.hash(addr);
      // this.emit('master:socket:beforeSend');
      // // We received a connection and need to pass it to the appropriate
      // // worker. Get the worker for this connection's source IP and pass
      // // it the connection.
      // this.workers[hash % this.workers.length].send('sticky-session:connection', connection);
      // this.emit('master:socket:sent');
    }).listen(this.options.port, () => {
      console.log('socket created');
    });
    this.io.on('connection', () => {
      console.log('master socket connected')
    })
    this.emit('master:socket:started');
  }

  resolve(...args) {
    return path.resolve(this.cwd, ...args);
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
    await this.emit('wroker:beforeStart');
    const netWork = this.options.secure ? https : http;
    const port = this.options.port || 8080;
    const host = this.options.host || '0.0.0.0';
    const options = [];
    if (this.options.secure) {
      options.push(this.options.secure, callback);
    } else {
      options.push(callback);
    }
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

        if (this.options.socket) {
          process.on('message', (message, connection) => {
            if (message !== 'sticky-session:connection') {
              return;
            }
      
            // Emulate a connection event on the server by emitting the
            // event with the connection the master sent us.
            this.server.emit('connection', connection);
            connection.resume();
          });
          // const io = Socket(this.server);
          // const redis = require('socket.io-redis');
          // io.adapter(redis({ host: '192.168.2.200', port: 6379 }));
          // process.on('message', (message, connection) => {
          //   if (message !== 'sticky-session:connection') {
          //     return;
          //   }
        
          //   // Emulate a connection event on the server by emitting the
          //   // event with the connection the master sent us.
          //   this.server.emit('connection', connection);
        
          //   connection.resume();
          // });

          // var RedisStore = require('socket.io/lib/stores/redis');
          // const io = Socket(this.server, {
          //   store: new RedisStore({
          //     pub: redis.createClient({host:'192.168.2.200'}),
          //     sub: redis.createClient({host:'192.168.2.200'}),
          //     client: redis.createClient({host:'192.168.2.200'})
          //   })
          // });
          // io.sockets.on('connection', function (socket) {
          //   // all socket.on('eventname'... things go here
          //   console.log('connection')
          // });
        }
      } catch(e) { reject(e); }
    });
  }

  async [nameSpace.worker.appRuntime]() {
    const bootstrap = Application.bootstrap({
      service: this.options.service || 'app/service',
      controller: this.options.controller || 'app/controller',
      middleware: this.options.middleware || 'app/middleware',
      router: this.options.router || 'app/router',
      application: this.resolve('app.js')
    });
    return await bootstrap(this);
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
          this.createSocketServer();
          await this.emit('ready');
        }
        break;
    }
  }

  [nameSpace.worker.onMessage](msg, socket) {
    if (socket && msg === 'sticky:balance') {
      this.console.log('sticky:balance');
      return;
    }
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

  [nameSpace.master.createAgent](name) {
    const agentRuntimeFile = path.resolve(__dirname, '..', 'agent_worker.js');
    process.argv.push('--AGENT-RUNTIME-LOADER=' + this.resolve(name + '.js'));
    process.argv.push('--AGENT-RUNTIME-CWD=' + this.options.cwd);
    process.argv.push('--AGENT-RUNTIME-NAME=' + name);
    process.argv.push('--AGENT-RUNTIME-PLUGIN=' + this.resolve('plugin.js'));
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
    while (i--) {
      // cluster.setupMaster({
      //   cwd: this.options.cwd,
      //   stdout: process.stdout,
      //   stderr: process.stderr,
      //   stdin: process.stdin,
      //   stdio: process.stdio,
      // });
      cluster.fork(this.env);
    };
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

Bifrost.Service = Basic;
Bifrost.Controller = Basic;
Bifrost.Middleware = Basic;
module.exports = Bifrost;
