const server = require('fastify')({
  logger: true
})
const path = require('path')
const AutoLoad = require('@fastify/autoload')
const vdf=require("./weselowski-vdf-native.js/lib/index.js")
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

  console.log(await vdf.generateVDF("test",1000,2048))
}
start(server,{})

server.listen({ port: 3000 }, function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  console.log("Highlayerd node listening on "+address)
  // Server is now listening on ${address}
})