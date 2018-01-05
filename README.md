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
  agents: ['agent']
});
```

## Dir

```bash
Bifrost-project
├── package.json
├── index.js
├── app.js (可选)
├── agent.js (可选)
├── plugin.js (可选)
├── app
|   ├── router
│   |   └── index.js
│   ├── controller
│   |   └── home.js
│   ├── service (可选)
│   |   └── user.js
│   ├── middleware (可选)
│   |   └── response_time.js
```

## Bifrost

```javascript
new Bifrost({ ...options });
```

### Bifrost#options

- **max** `number` 最大启动子进程个数
- **cwd** `string` 项目目录
- **agents** `array` agent进程列表，格式为 `agents:['agent']`
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

/agent.js =>

```javascript
const Bifrost = require('bifroster');

module.exports = agent => {
  [
    'receive:message',
    'master:ready',
    'agent:beforeCreate',
    'agent:created',
    'agent:beforeDestroy',
    'agent:destroyed'
  ].forEach(name => {
    agent.on(name, (...args) => {
      agent.console.log('[agent]:', name, ...args);
    })
  });
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

在项目根目录下有一个文件`plugin.js`。

```javascript
const path = require('path');
module.exports = {
  test: {
    enable: true,
    env: '*',
    path: path.resolve(__dirname, 'plugins', 'test'),
    // package: 'component',
    agent: '*',
    config: {}
  },
  test2: {
    enable: true,
    env: '*',
    path: path.resolve(__dirname, 'plugins', 'test2'),
    // package: 'component',
    agent: '*',
    config: {}
  }
}
```

参数：

- **enable** `boolean` 是否可用 默认`true`
- **env** `array` 运行环境 默认全环境
- **path** `string` 插件文件夹 与`package`互斥
- **package** `string` 插件模块 与`path`互斥
- **agent** `array` 运行在哪个agent上 默认全agent
- **config** 插件配置

每个插件分2个入口:

- **agent.js** 运行在agent端入口
- **app.js** 运行在app端入口

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
> 同样的，`ctx.reply`就是`ctx.send`只有一个参数时候的作用

## Create application

/app.js

生命周期如下：

- **wroker:beforeStart** app被创建前
- **wroker:started** app被创建完毕
- **wroker:beforeStop** app开始停止服务前
- **wroker:stoped** app服务被停止后
- **master:ready** 整个服务准备完毕
- **receive:message** 接收额外的消息

**app.js**

```javascript
module.exports = app => {
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
}
```

## Test

You can see how to write through the examples in the test folder, and you can test the class by using the `npm run test` command.

## License

Bifrost is [MIT licensed](https://opensource.org/licenses/MIT).