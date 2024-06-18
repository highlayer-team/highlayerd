const Big = require('big.js');
const msgpackr = require('msgpackr');
const numberToPaddedHex = number => ((number.toString(16).length % 2 ? '0' : '') + number.toString(16));
module.exports = {
	calculateSpend(params, { highlayerNodeState, dbs }) {
		const { amount } = params;
		if (!amount) {
			throw new Error('Invalid parameters');
		}
		return -1; //Sequencer deposits are special, they are free
	},
	 execute(action, { highlayerNodeState, dbs, interaction, centralChannel,actionNumber }) {
		const balances = dbs.balances;
		let { amount, accountTo } = action.params;
        accountTo=accountTo||interaction.sender;

		let balance = Big(balances.get(interaction.sender) || '0');
		amount = new Big(amount);

		if (balance.lt(amount)) {
			throw new Error('Insufficient funds');
		}
		balance = balance.minus(amount);

		balances.put(interaction.sender, balance.toString())

		centralChannel.postMessage({
			type: 'publish',
			topic: 'sequencerDeposit',
			data: msgpackr.pack({ account: accountTo, amount: amount.toString(), depositId: Buffer.concat([Buffer.from(interaction.hash, "hex"), Buffer.from(numberToPaddedHex(actionNumber), "hex")]).toString("base64url") }),
		});

	},
};
