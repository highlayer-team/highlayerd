module.exports = async function (app, carrier) {
	app.get('/tx/:id', async function (reply, request) {
		reply.writeStatus('200')
		.writeHeader('Content-Type', 'application/vnd.msgpack')
		.tryEnd(carrier.dbs.transactions.get(request.getParameter(0)));
	});
};
