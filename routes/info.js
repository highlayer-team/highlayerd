module.exports = async function (app,carrier) {
  app.get('/info', async function (reply,request) {

    reply.writeStatus("200 OK");
    reply.writeHeader("Content-Type", "application/json; charset=utf-8")
    reply.tryEnd(JSON.stringify({network:carrier.config.networkName}))

  })
}
