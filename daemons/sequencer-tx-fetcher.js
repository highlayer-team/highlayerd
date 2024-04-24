const request=require("brq")
const { BroadcastChannel, Worker } = require('node:worker_threads');
const lmdb=require("lmdb");
const path=require("path");
const ed25519=require("bcrypto/lib/ed25519");
const {HighlayerTx}=require("../structs/highlayer-tx.js")
const config=require("../config.json");

(async()=>{
const highlayerNodeState=lmdb.open({path:path.join(config.dataDir,"node-state")});
const currentTxN=highlayerNodeState.get("current-tx-n")||1;
while(true){
    try{
    const resp=await request(config.sequencerHttpURL+"ledger/"+currentTxN).then(r=>r.text());
    const decoded=HighlayerTx.decode(resp)
    console.log("Fetched transaction "+currentTxN);
   const validSignatures= HighlayerTx.verifySignatures(decoded);
   if(validSignatures){
    console.log("Signature check for "+currentTxN+" passed");
   }
    }catch(e){
        console.error(e)
    }
}
})()