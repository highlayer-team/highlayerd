module.exports = async function (app, carrier) {
	app.get('/tx/:id', async function (reply, request) {
		reply.writeStatus('200 OK');
		reply.writeHeader('Content-Type', 'application/vnd.msgpack');
		reply.tryEnd(carrier.dbs.transactions.get(request.getParameter(0)));
	});
};