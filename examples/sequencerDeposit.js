const { HighlayerTx } = require("../structs/highlayer-tx");

const { BIP322, Signer, Verifier, Address } = require("bip322-js");
const undici = require("undici");
const crypto = require("crypto");
const bitcoin = require("bitcoinjs-lib");
const { readFileSync } = require("fs");
const path = require("path");

let sendTx = async () => {
	try {
		const privateKey = "cPMB77TJ2CgHdv3dfyba5AhUjCeSBrpyGdJcnJZzsAMj85db9HoB";
		const address =
			"tb1p0wt007yyzfswhsnwnc45ly9ktyefzyrwznwja0m4gr7n9vjactes80klh4";

		const network = bitcoin.networks.testnet;

		const newTx = new HighlayerTx({
			address: address,
			nonce: crypto.randomInt(1000000000),
			actions: [
				{
					program: "system",
					action: "sequencerDeposit",
					params: {
						amount: 500000,
					},
				},
			],
		});

		newTx.signature = Signer.sign(privateKey, address, newTx.encode(), network);

		const { statusCode, body } = await undici.request(
			"http://127.0.0.1:2880/tx",
			{
				method: "POST",
				headers: { "Content-Type": "text/plain" },
				body: newTx.encode(),
			}
		);

		const data = await body.text();
		console.log("Response from sequencer:", data);
		console.log("Transaction hash:", newTx.txID());
		console.log("Content ID:", newTx.txID() + "01");
	} catch (error) {
		console.error("Error broadcasting transaction:", error);
	}
};



(async () => {
	await sendTx();
})();
