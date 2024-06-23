const msgpackr = require('msgpackr');
const crypto = require('crypto');
const config = require('../config.json');
const ed25519 = require('bcrypto/lib/ed25519');
const bip322 = require('bip322-js');
const systemActions = require('../system/actionList');
const HighlayerLogger = require('../helpers/logger');
class HighlayerTx {
	constructor({
		address,
		signature,
		nonce,
		actions,
		bundlePosition,
		sequencerTxIndex,
		trueTxIndex,
		sequencerSignature,
		parentBundleHash,
	}) {
		this.address = address || '';
		this.signature = signature || null;
		this.nonce = nonce || crypto.randomBytes(4).readUInt32BE(0);
		this.actions = actions || [];
		this.bundlePosition = bundlePosition || null;
		(this.sequencerTxIndex = sequencerTxIndex || null), (this.trueTxIndex = trueTxIndex || null);
		this.parentBundleHash = parentBundleHash || null;
		this.sequencerSignature = sequencerSignature || null;
	}

	encode() {
		return msgpackr.encode({
			address: this.address,
			signature: this.signature,
			nonce: this.nonce,
			actions: this.actions,
			bundlePosition: this.bundlePosition,
			sequencerTxIndex: this.sequencerTxIndex,
			trueTxIndex: this.trueTxIndex,
			parentBundleHash: this.parentBundleHash,
			sequencerSignature: this.sequencerSignature,
		});
	}

	extractPrototype() {
		return msgpackr.encode({
			address: this.address,
			signature: null,
			nonce: this.nonce,
			actions: this.actions,
			bundlePosition: null,
			sequencerTxIndex: null,
			trueTxIndex: null,
			parentBundleHash: null,
			sequencerSignature: null,
		});
	}
	txID() {
		return crypto
			.createHash('blake2s256')
			.update( 
				msgpackr.encode({
					address: this.address,
					signature: this.signature,
					nonce: this.nonce,
					actions: this.actions,
					bundlePosition: null,
					sequencerTxIndex: null,
					trueTxIndex: null,
					parentBundleHash: null,
					sequencerSignature: null,
				})
			)
			.digest('hex');
	}
	getActionsGas(interactionGas = 0, { highlayerNodeState, dbs }) {
		let gasActions = this.actions.filter((a) => a.program === 'system' && a.action === 'buyGas');
		let otherActions = this.actions.filter((a) => a.program !== 'system' || a.action !== 'buyGas');

		this.actions = [...gasActions, ...otherActions]; // gas actions must go first to avoid unfortunate security issues
		for (const action of this.actions) {
			if (action.program != 'system') {
				interactionGas -= 20000; //Each contract invocation involves starting engine, costing around 10k gas, plus 10k is minimal gas that gets added to execution
			} else {
				let systemAction = systemActions[action.action];

				if (typeof systemAction == 'undefined') {
					throw new Error(
						`"Error during gas calculation: System action ${action.action} not found`
					);
				}
				try {
					interactionGas -= systemAction.calculateSpend(action.params, { highlayerNodeState, dbs });
				} catch (e) {
				new HighlayerLogger(this.address).error(
					"Error during gas calculation",
					"Transaction ID: "+this.txID(),
					"Action: "+action.action,
					"Params: ",action.params,
					"Error message: "+e.message
				)

					throw new Error('Error during gas calculation: ' + e.message);
				}
			}
		}
		return interactionGas;
	}
	rawTxID() {
		return crypto
			.createHash('blake2s256')
			.update(
				msgpackr.encode({
					address: this.address,
					signature: this.signature,
					nonce: this.nonce,
					actions: this.actions,
					bundlePosition: this.bundlePosition,
					sequencerTxIndex: this.sequencerTxIndex,
					trueTxIndex: null,
					parentBundleHash: this.parentBundleHash,
					sequencerSignature: this.sequencerSignature,
				})
			)
			.digest();
	}

	extractedRawTxID() {
		return crypto
			.createHash('blake2s256')
			.update(
				msgpackr.encode({
					address: this.address,
					signature: null,
					nonce: this.nonce,
					actions: this.actions,
					bundlePosition: null,
					sequencerTxIndex: null,
					trueTxIndex: null,
					parentBundleHash: null,
					sequencerSignature: null,
				})
			)
			.digest();
	}
	static decode(buffer) {
		try {
			const decodedObject = msgpackr.decode(buffer);
			return new HighlayerTx({
				address: decodedObject.address,
				signature: decodedObject.signature,
				nonce: decodedObject.nonce,
				actions: decodedObject.actions,
				bundlePosition: decodedObject.bundlePosition,
				sequencerTxIndex: decodedObject.sequencerTxIndex,
				parentBundleHash: decodedObject.parentBundleHash,
				sequencerSignature: decodedObject.sequencerSignature,
			});
		} catch (e) {
			return null;
		}
	}
	static verifySignatures(highlayerTx) {
		const sequencerUnsigned = new HighlayerTx({ ...highlayerTx, sequencerSignature: null });

		const isSequencerSignatureValid = ed25519.verify(
			crypto.createHash('blake2s256').update(sequencerUnsigned.rawTxID()).digest(),
			highlayerTx.sequencerSignature,
			Buffer.from(config.sequencerPubkey, 'hex')
		);

		const isEOASignatureValid = bip322.Verifier.verifySignature(
			highlayerTx.address,
			highlayerTx.extractedRawTxID(),
			highlayerTx.signature
		);

		return isEOASignatureValid && isSequencerSignatureValid;
	}
}

module.exports = { HighlayerTx };
