module.exports = async function (app, carrier) {
    app.get('/kv/:id', async function (reply, request) {
      reply.writeStatus("200 OK");
      reply.writeHeader("Content-Type", "application/vnd.msgpack")
      reply.tryEnd(carrier.dbs.accountKV.getBinary(request.getParameter(0)))
    })
  }
  