const server = require('fastify')({
  logger: true
})
const path = require('path')
const AutoLoad = require('@fastify/autoload')
const config = require("./config.json");
const {
  BroadcastChannel,
  Worker,
} = require('node:worker_threads');
const vdf = require("./weselowski-vdf-native.js/lib/index.js")
const start = async function (server, opts) {
  // Place here your custom code!

  // Do not touch the following lines

  // This loads all plugins defined in plugins
  // those should be support plugins that are reused
  // through your application
  server.register(AutoLoad, {
    dir: path.join(__dirname, 'plugins'),
    options: Object.assign({}, opts)
  })

  // This loads all plugins defined in routes
  // define your routes in one of these
  server.register(AutoLoad, {
    dir: path.join(__dirname, 'routes'),
    options: Object.assign({}, opts)
  })

  new Worker(path.join(__dirname, "daemons", "sequencer-tx-fetcher.js"));
  new Worker(path.join(__dirname, "daemons", "execution-core.js"));
}
start(server, {
dbPath: path.join(config.dataDir, "node-state"),
  databases: [{
    name: "balances",
    dbName: "balances"
  }, {
    name: "dataBlobs",
    dbName: "data-blobs"
  },
  {
    name: "sequencerSigToNumber",
    dbName: "sequencer-sig-to-number"
  },
{name:"contracts",dbName:"contracts"}]

})

server.listen({ port: 3000 }, function (err, address) {
  if (err) {
    server.log.error(err)
    process.exit(1)
  }
  console.log("Highlayerd node listening on " + address)
  // Server is now listening on ${address}
})