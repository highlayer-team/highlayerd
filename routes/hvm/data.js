module.exports = async function (app, carrier) {
    app.get('/data/:id', async function (reply, request) {
      reply.writeStatus("200")
      .writeHeader("Content-Type", "application/octet-stream")
      .tryEnd(carrier.dbs.dataBlobs.get(request.getParameter(0)))
    })
  }
  