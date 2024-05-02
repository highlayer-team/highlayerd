const request = require("brq");
const { BroadcastChannel, Worker } = require("node:worker_threads");
const lmdb = require("lmdb");
const path = require("path");
const ed25519 = require("bcrypto/lib/ed25519");
const { HighlayerTx } = require("../structs/highlayer-tx.js");
const config = require("../config.json");
const wait = require("../helpers/wait.js");
const highlayerNodeState = lmdb.open({
	path: path.join(config.dataDir, "node-state"),
	useVersions: true,
	sharedStructuresKey: Symbol.for("dataStructures"),
});
const dbs = {
	balances: highlayerNodeState.openDB("balances"),
	sequencerSigToNumber: highlayerNodeState.openDB("sequencer-sig-to-number"),
};

let currentTxN = highlayerNodeState.get("current-fetched-tx") || 1;
const executionCoreChannel = new BroadcastChannel("executionCore");
const panicChannel = new BroadcastChannel("panic");
(async () => {
	while (true) {
		try {
			const resp = await request(
				config.sequencerHttpURL + "ledger/" + currentTxN
			)
				.then((r) => (r.statusCode == 200 ? r.text() : null))
				.catch((e) => {
					return null;
				});

			if (!resp) {
				await wait(1000);
				continue;
			}

			addToProcessing(resp);
			currentTxN++;
			if (currentTxN % 1000 == 0) {
				await highlayerNodeState.put("current-fetched-tx", currentTxN);
			}
		} catch (e) {
			console.error(e);
		}
	}
})();

async function addToProcessing(tx) {
	const decoded = HighlayerTx.decode(tx);

	const validSignatures = HighlayerTx.verifySignatures(decoded);
	if (!validSignatures) {
		return;
	}
	const alreadyRegisteredSignature = dbs.sequencerSigToNumber.get(
		decoded.ledgerPosition
	);

	if (
		alreadyRegisteredSignature &&
		alreadyRegisteredSignature != decoded.sequencerSignature
	) {
        console.error("---PANIC---\nSequencer double-signed. Local highlayerd (and likely whole network) is stopped. Double-sign detected at ledger position " +
        decoded.ledgerPosition +
        " with 2 signatures " +
        decoded.sequencerSignature +
        " and " +
        sequencerSigToNumber.get(decoded.ledgerPosition) +
        ".\n Please communicate hardfork replacing compromised sequencer with other node operators \n---PANIC---")
		panicChannel.postMessage("panic");
	}
	let afterActionsGas;
	try {
		afterActionsGas = decoded.getActionsGas(0, { highlayerNodeState, dbs });
	} catch (e) {
		executionCoreChannel.postMessage({
			sender: "system",
			actions: [],
			gas: 0,
			id: currentTxN,
			hash: null,
		});

		return;
	}
	if (afterActionsGas < 1) {
		executionCoreChannel.postMessage({
			sender: "system",
			actions: [],
			gas: 0,
			id: currentTxN,
			hash: null,
		});
		return;
	}

	executionCoreChannel.postMessage({
		sender: decoded.address,
		actions: decoded.actions,
		gas: afterActionsGas,
		id: decoded.ledgerPosition,
		hash: decoded.txID(),
	});
}
