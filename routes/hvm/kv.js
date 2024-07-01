module.exports = function (app, carrier) {
    app.get('/kv/:contractId/:key', function (reply, request) {
     
      reply.writeStatus("200").writeHeader("Content-Type", "application/vnd.msgpack")
      .tryEnd(carrier.dbs.accountKV.getBinary(request.getParameter(0)+":"+request.getParameter(1)));
    })
  }
  