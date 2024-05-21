const msgpackr = require('msgpackr');
const uWS = require('uWebSockets.js');
module.exports = async function (app, carrier) {
	app.ws('/events', {
		compression: uWS.DISABLED,
		maxPayloadLength: 16 * 1024,
		idleTimeout: 10,
		closeOnBackpressureLimit: true,
		maxBackpressure: 1024,
		sendPingsAutomatically: true,

		open: (_ws) => {},
		message: (ws, message, isBinary) => {
			console.log(ws);
			const msg = msgpackr.unpack(message);
			console.log(msg);
			if (msg.event == 'subscribe') {
				ws.subscribe(msg.topic);
			} else if (msg.event == 'unsubscribe') {
				ws.unsubscribe(msg.topic);
			}
		},
		drain: (ws) => {},
		close: (ws, code, message) => {},
	});
};
