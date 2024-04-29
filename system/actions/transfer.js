const Big = require("big.js")
module.exports = {
    calculateSpend(params, { highlayerNodeState, dbs }) {
        const balances = dbs.balances
        const { recipient, amount } = params;
        if (!recipient || !amount) {
            throw new Error("Invalid parameters");
        }
        let totalGas = 5000;
        if (!balances.doesExist(recipient)) {
            totalGas += 10000;//Cost for new address in database
        }
        return totalGas;
    },
    async execute(action, { highlayerNodeState, dbs, interaction }) {
        const balances = dbs.balances;
        let { amount, recipient } = action.params;
        let balance = Big(balances.get(interaction.sender) || "0");
        let recipientBalance = Big(balances.get(recipient) || "0");
        amount = new Big(amount);
        if (interaction.sender != "system") {
            if (balance.lt(amount)) {
                throw new Error("Insufficient funds");
            }
            balance = balance.minus(amount);
        }
        recipientBalance = recipientBalance.plus(amount);
        await Promise.all([balances.put(interaction.sender, balance.toString()), balances.put(recipient, recipientBalance.toString())])


    }
}