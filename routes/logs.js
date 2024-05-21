const HighlayerLogger = require("../helpers/logger")

module.exports = async function (app) {
  app.get('/logs/:id', async function (reply, request) {
    let logger = new HighlayerLogger(request.getParameter(0))
    reply.writeStatus("200 OK");
    reply.writeHeader("Content-Type", "text/plain; charset=utf-8")
    reply.tryEnd(logger.dump())

  })
}
