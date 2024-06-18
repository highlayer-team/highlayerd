const msgpackr=require("msgpackr")
module.exports = async function (app,carrier) {
  app.get('/info', async function (reply,request) {

    reply.writeStatus("200 OK");
    reply.writeHeader("Content-Type", "application/vnd.msgpack")
    reply.tryEnd(msgpackr.encode({network:carrier.config.networkName}))

  })
}
