const HighlayerLogger = require("../helpers/logger")

module.exports =  function (app) {
  app.get('/logs/:id', async function (reply, request) {
    let aborted=false;
    reply.onAbort(() => {
      aborted=true
    })
    let logger = new HighlayerLogger(request.getParameter(0))
    logger.dump().then((res)=>{
      if(!aborted){
      reply.writeStatus("200 OK").writeHeader("Content-Type", "text/plain; charset=utf-8").tryEnd(Buffer.from(res||"[LOG EMPTY]"))
      }
    })

  })
}
