# Bifrost

**彩虹桥**，被用作此架构名，意在进入神域的通道。而此架构，是开发所有`nodejs`应用的主架构。它实现了进程化管理以及微服务插件的概念，具有非常强大的扩展性和丰富的生命周期供开发者创建自己的应用服务。

## Install

```bash
npm install bifroster --save
```

## Usage

```javascript
const path = require('path');
const Bifrost = require('bifroster');
const bifrost = new Bifrost({
  cwd: __dirname,
  app_worker: path.resolve(__dirname, 'app.js'),
  agents: {
    agent: path.resolve(__dirname, 'agent.js')
  }
});
```

## Bifrost

```javascript
new Bifrost({ ...options });
```

### Bifrost#options

- **max** `number` 最大启动子进程个数
- **cwd** `string` 项目目录
- **agents** `object` agent进程列表，格式为 `{"agentName": "/where/to/path.js", ...}`
- **app_worker** `string` 子进程启动文件路径
- **secure** `object` 启动安全协议的配置 `{key, cert}`组合，使用`https`协议
- **port** `number` 服务启动端口
- **host** `string` 服务启动ip

## Master#Events

- **agent:ready** Agent服务准备就绪
- **agent:exit** Agent服务关闭
- **exit** 整个应用关闭
- **ready** 整个应用准备就绪

```javascript
[
  'agent:ready',
  'ready',
  'agent:exit',
  'exit'
].forEach(name => {
  bifrost.on(name, (...args) => {
    bifrost.console.log(`[${bifrost.type}]:`, name, ...args);
  });
});
```

## IPC-Message

请看[这里](https://github.com/cevio/ipc-message)

## Agent

微服务部署核心类。

### Create Agent

agent.js =>

```javascript
const Bifrost = require('bifroster');
// agent自定义插件
const Component = require('./component');

module.exports = class AgentProcess extends Bifrost.Agent {
  constructor() {
    super();
    this.install('component', Component);
    [
      'receive:message',
      'master:ready',
      'agent:beforeCreate',
      'agent:created',
      'agent:beforeDestroy',
      'agent:destroyed'
    ].forEach(name => {
      this.on(name, (...args) => {
        this.console.log('[agent]:', name, ...args);
      })
    });
  }
}
```

### Agent lifecycles

- **receive:message** 自定义接收未进入微服务的消息处理事件
- **agent:beforeCreate** Agent被创建前
- **agent:created** Agent被创建完毕
- **agent:beforeDestroy** Agent开始停止服务前
- **agent:destroyed** Agent服务被停止后
- **master:ready** 由顶层进程通知过来的关于整个应用准备完毕后调用的生命周期


### Agent install plugins

安装微服务插件。

```javascript
this.install(name, plugin);
```

### Make Plugin

微服务中可以理解为为整个一个工程，每条业务线都是流水作业。所以我们通过不断询问流水线负责人来确认是否要进入此微服务来获取数据。如果负责人现在的状态是`locked`，而且他答应处理（可能由于业务太多忙不过来），那么他会将消息暂时存入堆栈，等到空闲了再处理，相当于任务的调度。

实际情况下，我们采用路由中间件的模式来处理这些请求，从而返回数据。

首先来认识4个生命周期：

- **task:start** 任务开始
- **task:done** 任务结束
- **server:start** 注册服务初始化的函数
- **server:destroy** 注册服务将要停止的函数

```javascript
module.exports = component => {
  [
    'task:start',
    'task:done',
    'server:start',
    'server:destroy'
  ].forEach(name => {
    component.on(name, (...args) => {
      console.log('[agent]:', '[channel]:', name, ...args);
    })
  });

  component.use(async(ctx, next) => {
    ctx.send({
      a: 1,
      b: 2,
      c: ctx.body
    });
    await next();
  })
}
```

我们可以看到，里面的数据都是通过中间件模式被返回的，这个在使用nodejs的开发者是最清楚如何使用，这里我就不再多说。

> 注意：这里的`ctx.send`只有一个参数，意思说明，现在的数据需要按原路返回给请求者。

## Start file

当我们指定`agent`和`app`的执行文件后，系统将会自动调用这些文件。`agent`文件结构我就不多说类，我来说下`app`文件的启动结构。

生命周期如下：

- **wroker:beforeStart** app被创建前
- **wroker:started** app被创建完毕
- **wroker:beforeStop** app开始停止服务前
- **wroker:stoped** app服务被停止后
- **master:ready** 整个服务准备完毕
- **receive:message** 接收额外的消息

**app.js**

```javascript
const Koa = require('koa');
module.exports = app => {
  const koa = new Koa();
  koa.context.base = app;
  koa.use(async ctx => {
    if (ctx.req.url === '/favicon.ico') {
      return;
    }
    const data = await ctx.base.fetch('agent://component/a/b', {
      a:4
    });
    ctx.body = data
  });

  [
    'wroker:beforeStart',
    'wroker:started',
    'wroker:beforeStop',
    'wroker:stoped',
    'master:ready',
    'receive:message'
  ].forEach(name => {
    app.on(name, (...args) => {
      app.console.log('[worker]:', name, ...args);
    })
  });

  return koa.callback();
}
```

> 注意：我们需要返回一个`callback`才能启动服务。

## Test

You can see how to write through the examples in the test folder, and you can test the class by using the `npm run test` command.

## License

Bifrost is [MIT licensed](https://opensource.org/licenses/MIT).