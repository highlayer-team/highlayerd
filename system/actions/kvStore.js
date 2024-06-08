const Big = require("big.js");
const bech32 = require("bcrypto/lib/encoding/bech32m")
const crypto = require("crypto")
const calculateActionsGas = require("../../helpers/calculateActionsGas");
const numberToPaddedHex = number => ((number.toString(16).length % 2 ? '0' : '') + number.toString(16));
module.exports = {
    calculateSpend(params, { highlayerNodeState, dbs }) {
        const { key, value } = params;
       if(typeof key!="string"){
            throw new Error("Invalid parameters");
        }
        return 1000+Buffer.from(key).byteLength*700+Buffer.from(msgpackr.encode(value)).byteLength*100;
    },

    async execute(action, { highlayerNodeState, dbs, interaction, actionNumber, macroTasks }) {
        const { key, value } = action.params;
        await dbs.accountKV.put(interaction.sender+':'+key,value);
    }
}