
module.exports = {
    calculateSpend(params, { highlayerNodeState, dbs }) {
        return  1000;
    },
    execute(action, { highlayerNodeState, dbs, interaction, logger }) {
     logger.log(`Sender: ${interaction.sender}`,`Message: ${action.params.message}`)
    }
}