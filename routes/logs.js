const HighlayerLogger = require("../helpers/logger")

module.exports = async function (fastify, opts) {
    fastify.get('/logs/:id', async function (request, reply) {
        let logger=new HighlayerLogger(request.params.id)
        reply.type("text/plain")
      return logger.dump()

    })
  }
  