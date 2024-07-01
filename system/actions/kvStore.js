const msgpackr=require('msgpackr')
module.exports = {
    calculateSpend(params, { highlayerNodeState, dbs }) {
        const { key, value } = params;
       if(typeof key!="string"){
            throw new Error("Invalid parameters");
        }
        return 1000+Buffer.from(key).byteLength*700+Buffer.from(msgpackr.encode(value)).byteLength*100;
    },

    execute(action, { highlayerNodeState, dbs, interaction, actionNumber, macroTasks }) {
        const { key, value } = action.params;
        console.log("Putting key:"+interaction.sender+':'+key+" value:"+value)
        dbs.accountKV.put(interaction.sender+':'+key,value);
    }
}