const { request } = require('undici');
const { BroadcastChannel, Worker } = require('node:worker_threads');
const lmdb = require('lmdb');
const path = require('path');
const ed25519 = require('bcrypto/lib/ed25519');
const { HighlayerTx } = require('../structs/highlayer-tx.js');
const config = require('../config.json');
const wait = require('../helpers/wait.js');

const highlayerNodeState = lmdb.open({
	path: path.join(config.dataDir, 'node-state'),
	useVersions: true,
	sharedStructuresKey: Symbol.for('dataStructures'),
});
const highlayerNodeArchive = lmdb.open({
	path: path.join(config.archiveDataDir, "slow-node-state"),
	useVersions: true,
	sharedStructuresKey: Symbol.for("dataStructures"),
});

const dbs = {
	balances: highlayerNodeState.openDB('balances'),
	sequencerSigToNumber: highlayerNodeState.openDB('sequencer-sig-to-number'),
	transactions:highlayerNodeArchive.openDB("transactions")
};


let currentTxN = highlayerNodeState.get('current-fetched-tx') || 1;
const executionCoreChannel = new BroadcastChannel('executionCore');
const panicChannel = new BroadcastChannel('panic');

(async () => {
	while (true) {
		try {
			const url = `${config.sequencerHttpURL}ledger/${currentTxN}`;
			const { body, statusCode } = await request(url);

			if (statusCode !== 200) {
				console.log('No new transactions, latest: ' + currentTxN);
				await wait(1000);
				continue;
			}
			const arrayBuf=await body.arrayBuffer()
			const resp = Buffer.from(new Uint8Array(arrayBuf));
			addToProcessing(resp);
			currentTxN++;
			if (currentTxN % 10 === 0) {
				 highlayerNodeState.put('current-fetched-tx', currentTxN);
			}
		} catch (e) {
			
			console.error(e);
			await wait(1000);
		}
	}
})();

async function addToProcessing(tx) {
	const decoded = HighlayerTx.decode(tx);

	if (!decoded) {
		return;
	}
	const validSignatures = HighlayerTx.verifySignatures(decoded);

	if (!validSignatures) {
		return;
	}
	const alreadyRegisteredSignature = dbs.sequencerSigToNumber.get(decoded.sequencerTxIndex);

	if (alreadyRegisteredSignature && alreadyRegisteredSignature != decoded.sequencerSignature) {
		console.error(
			'---PANIC---\nSequencer double-signed. Local highlayerd (and likely whole network) is stopped. Double-sign detected at ledger position ' +
				decoded.sequencerTxIndex +
				' with 2 signatures ' +
				decoded.sequencerSignature +
				' and ' +
				sequencerSigToNumber.get(decoded.sequencerTxIndex) +
				'.\n Please communicate hardfork replacing compromised sequencer with other node operators \n---PANIC---'
		);
		panicChannel.postMessage('panic');
	}
	let afterActionsGas;
	try {
		afterActionsGas = decoded.getActionsGas(0, { highlayerNodeState, dbs });
	} catch (e) {
		executionCoreChannel.postMessage({
			sender: 'system',
			actions: [],
			gas: 0,
			id: currentTxN,
			hash: null,
		});

		return;
	}
	if (afterActionsGas < 0) {
		executionCoreChannel.postMessage({
			sender: 'system',
			actions: [],
			gas: 0,
			id: currentTxN,
			hash: null,
		});
		return;
	}
	let hash=decoded.txID()
	if(hash){
	
		dbs.transactions.ifNoExists(hash, () => {
			dbs.transactions.put(hash, tx);
		});

	}
	executionCoreChannel.postMessage({
		sender: decoded.address,
		actions: decoded.actions,
		gas: afterActionsGas,
		id: decoded.sequencerTxIndex,
		hash,
	});
}
