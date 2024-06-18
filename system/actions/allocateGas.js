const Big = require('big.js');
module.exports = {
	calculateSpend(params, { highlayerNodeState }) {
		const { amount } = params;
		return -amount;
	},
	execute(action, { highlayerNodeState, dbs, interaction }) {
		const balances = dbs.balances;
		let balance = Big(balances.get(interaction.sender) || '0');
		let { amount, price } = action.params;
		if (interaction.sender != 'system') {
			if (
				price < (highlayerNodeState.get('currentGasUnitPrice') || 1) ||
				!Number.isInteger(amount)
			) {
				throw new Error('Gas underpriced');
			} else if (balance.lt(amount)) {
				throw new Error('Insufficient funds');
			}
			balance = balance.minus(amount * price);
		}

		balances.put(interaction.sender, balance.toString());
	},
};
