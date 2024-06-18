const msgpackr=require("msgpackr")
module.exports = async function (app, carrier) {
    app.get('/balance/:id', async function (reply, request) {
      reply.writeStatus("200 OK");
      reply.writeHeader("Content-Type", "application/vnd.msgpack")
      reply.tryEnd(msgpackr.encode({balance:carrier.dbs.balances.get(request.getParameter(0))||'0'}))
    })
  }
  