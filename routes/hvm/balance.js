module.exports = async function (app, carrier) {
    app.get('/balance/:id', async function (reply, request) {
      reply.writeStatus("200 OK");
      reply.writeHeader("Content-Type", "application/octet-stream")
      reply.tryEnd(carrier.dbs.balances.get(request.getParameter(0)))
    })
  }
  