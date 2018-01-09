const debug = require('debug')('nodebase:cluster:application');
const options = JSON.parse(process.argv[2]);
const loader = process.argv[3];
options.loader = loader;

const Application = require(options.framework).Application;
const app = new Application(options);

// // Agent lifecycle binding.
[
  'beforeCreate',
  'created',
  'beforeMount',
  'mounted',
  'beforeDestroy',
  'destroyed'
].forEach(life => {
  app.on(life, () => 
    app.send('master', `app:${life}`, Date.now())
  );
});

process.on('SIGTERM', () => app.checkLifeExit())
process.on('SIGINT', () => app.checkLifeExit());
process.on('SIGQUIT', () => app.checkLifeExit());
process.on('exit', code => {
  debug('app is exited', code);
});

app.init();