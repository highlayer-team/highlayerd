
module.exports = {
    calculateSpend(params, { highlayerNodeState, dbs }) {
        return  1000;
    },
    async execute(action, { highlayerNodeState, dbs, interaction, logger }) {
     logger.log(`Sender: ${interaction.sender}`,`Message: ${action.params.message}`)
    }
}