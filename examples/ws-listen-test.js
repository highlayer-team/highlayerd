const WebSocket = require("ws");
const msgpack = require("msgpackr");

const ws = new WebSocket("http://localhost:3000/events");

ws.on("open", () => {
	const subscribeMsg = msgpack.encode({
		event: "subscribe",
		topic: "sequencerDeposit",
	});
	ws.send(subscribeMsg);
});

ws.on("message", (data) => {
	console.log(data)
	const event = msgpack.decode(data);
	console.log("Received event:", event);
});
