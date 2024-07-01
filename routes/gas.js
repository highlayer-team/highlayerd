const calculateActionsGas = require('../helpers/calculateActionsGas');
const { HighlayerTx } = require('../structs/highlayer-tx');
const lmdb = require('lmdb');
const config = require('../config.json');
const path = require('path');
const msgpackr = require('msgpackr');

function checkGas(res, req, dataStream, carrier) {
	let decodedTx = HighlayerTx.decode(dataStream);
	let actions = [...decodedTx.actions];
	let totalGas = 0;

	let gas = calculateActionsGas(totalGas, actions, carrier);

	res.writeStatus('200 OK');
	res.writeHeader('Content-Type', 'application/vnd.msgpack');
	res.tryEnd(
		msgpackr.encode({
			gas: gas,
		})
	);
}

module.exports = function (app, carrier) {
	app.post('/calculateTxGas', async function (res, req) {
		res.onAborted(() => {
			res.aborted = true;
		});

		const contentLength = parseInt(req.getHeader('content-length'));
		if (!contentLength) {
			res.writeStatus('411 Length Required');
			res.tryEnd(msgpackr.encode({ Error: 'Content-length header missing' }));
			return;
		}

		let totalBytesProcessed = 0;
		let dataStream = Buffer.allocUnsafe(contentLength);

		res.onData((chunk, isLast) => {
			totalBytesProcessed += chunk.byteLength;

			if (totalBytesProcessed > contentLength) {
				res.writeStatus('400 Bad Request');
				res.tryEnd(msgpackr.encode({ Error: 'Content-length mismatch' }));
				return;
			}

			Buffer.from(chunk).copy(dataStream, totalBytesProcessed - chunk.byteLength);

			if (isLast) {
				if (totalBytesProcessed !== contentLength) {
					res.writeStatus('400 Bad Request');
					res.tryEnd(msgpackr.encode({ Error: 'Content-length mismatch' }));
					return;
				}
				try {
					checkGas(res, req, dataStream, carrier);
				} catch (e) {
					console.error(e);
					res.writeStatus('500 Internal Server Error');
					res.tryEnd(msgpackr.encode({ Error: 'Failed to process transaction' }));
				}
			}
		});
	});
};
