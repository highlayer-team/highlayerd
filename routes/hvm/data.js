module.exports = async function (fastify, opts) {
    fastify.get('/data/:id', async function (request, reply) {
        console.log(request.params.id)
      return fastify.dbs.dataBlobs.get(request.params.id)
    })
  }
  