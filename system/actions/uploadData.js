const Big=require("big.js")
const numberToHexPaddedEven = number => ((number.toString(16).length % 2 ? '0' : '') + number.toString(16));
module.exports={
    calculateSpend(params,{highlayerNodeState,dbs}){
        const {data}=params;
        if(typeof data!="string"){
            throw new Error("Invalid parameters");
        }

    
        return Buffer.from(data,'base64').byteLength*700;
    },
   async execute(action,{highlayerNodeState,dbs,interaction,actionNumber}){
       let dataId=interaction.hash+numberToHexPaddedEven(actionNumber);
       console.log(dataId)
       await dbs.dataBlobs.put(dataId,Buffer.from(action.params.data,'base64'))
    }
}
