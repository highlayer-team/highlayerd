const Big = require("big.js");
const bech32 = require("bcrypto/lib/encoding/bech32m")
const crypto = require("crypto")
const calculateActionsGas = require("../../helpers/calculateActionsGas");
module.exports = {
    calculateSpend(params, { highlayerNodeState, dbs }) {
        const { sourceId, initActions, gasForInitActions } = params;
        if (typeof sourceId != "string" || !Array.isArray(initActions) || !Number.isSafeInteger(gasForInitActions) || gasForInitActions < 1) {
            throw new Error("Invalid parameters");
        }

        const gas = calculateActionsGas(0, initActions, { highlayerNodeState, dbs })
        return (-gas) + gasForInitActions + 10000;
    },

    async execute(action, { highlayerNodeState, dbs, interaction, actionNumber, macroTasks }) {
        const { sourceId, initActions, gasForInitActions } = action.params;
        const contractId = bech32.encode("hlcontract", 0, crypto.createHash("sha256").update(Buffer.concat([Buffer.from(interaction.hash, "hex"), Buffer.from(actionNumber.toString(16), "hex"), Buffer.from(sourceId, "hex")])).digest())

        dbs.contracts.put(contractId, sourceId)
        macroTasks.addToPriority({
            sender: contractId, actions: initActions, gas: gasForInitActions, hash: crypto.createHash("sha256").update(contractId + interaction.hash + actionNumber.toString(16)).digest("hex")
        })
    }
}