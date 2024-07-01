const Big = require('big.js');
const bech32 = require('bcrypto/lib/encoding/bech32m');
const crypto = require('crypto');
const calculateActionsGas = require('../../helpers/calculateActionsGas');
const numberToPaddedHex = (number) =>
	(number.toString(16).length % 2 ? '0' : '') + number.toString(16);
module.exports = {
	calculateSpend(params, { highlayerNodeState, dbs }) {
		const { sourceId, initActions, gasForInitActions } = params;
		if (
			typeof sourceId != 'string' ||
			!Array.isArray(initActions) ||
			!Number.isSafeInteger(gasForInitActions) ||
			gasForInitActions < 1
		) {
			
			throw new Error('Invalid parameters');
		}

		const gas = calculateActionsGas(0, initActions, { highlayerNodeState, dbs });
		return -gas + gasForInitActions + 10000;
	},

	 execute(action, { highlayerNodeState, dbs, interaction, actionNumber, macroTasks }) {
		const { sourceId, initActions, gasForInitActions } = action.params;
		const contractId = bech32.encode(
			'hlcontract',
			0,
			crypto
				.createHash('blake2s256')
				.update(
					Buffer.concat([
						Buffer.from(interaction.hash, 'hex'),
						Buffer.from(numberToPaddedHex(actionNumber), 'hex'),
						Buffer.from(sourceId, 'hex'),
					])
				)
				.digest()
		);
		console.log("Deployed contract:"+contractId)
	 dbs.contracts.put(contractId, sourceId);
		macroTasks.addToPriority({
			sender: contractId,
			actions: initActions,
			gas: gasForInitActions,
			hash: crypto
				.createHash('blake2s256')
				.update(contractId + interaction.hash + numberToPaddedHex(actionNumber))
				.digest('hex'),
		});
	},
};
