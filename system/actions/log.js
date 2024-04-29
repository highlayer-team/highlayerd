
module.exports = {
    calculateSpend(params, { highlayerNodeState, dbs }) {
        return  1000;
    },
    async execute(action, { highlayerNodeState, dbs, interaction }) {
     console.log(`\n--LOG--\nSender: ${interaction.sender}\nMessage: ${action.params.message}\n--LOG--\n`)
    }
}