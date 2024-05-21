const msgpackr = require("msgpackr");
const crypto = require("crypto");
const config = require("../config.json")
const ed25519 = require("bcrypto/lib/ed25519");
const { base58 } = require("bstring");
const bip322 = require("bip322-js")
const systemActions=require("../system/actionList")
class HighlayerTx {
    constructor({
        address,
        signature,
        nonce,
        actions,
        bundlePosition,
        ledgerPosition,
        parentBundleHash,
        sequencerSignature,
    }) {
        this.address = address || "";
        this.signature = signature || null;
        this.nonce = nonce || crypto.randomBytes(4).readUInt32BE(0);
        this.actions = actions || [];
        this.bundlePosition = bundlePosition || null;
        this.ledgerPosition = ledgerPosition || null;
        this.parentBundleHash = parentBundleHash || null;
        this.sequencerSignature = sequencerSignature || null;
    }

    encode() {
        return base58.encode(
            msgpackr.encode({
                address: this.address,
                signature: this.signature,
                nonce: this.nonce,
                actions: this.actions,
                bundlePosition: this.bundlePosition,
                ledgerPosition: this.ledgerPosition,
                parentBundleHash: this.parentBundleHash,
                sequencerSignature: this.sequencerSignature,
            })
        );
    }

    extractPrototype() {
        return base58.encode(
            msgpackr.encode({
                address: this.address,
                signature: null,
                nonce: this.nonce,
                actions: this.actions,
                bundlePosition: null,
                ledgerPosition: null,
                parentBundleHash: null,
                sequencerSignature: null,
            })
        );
    }
    txID(){
        return crypto.createHash("sha256").update(msgpackr.encode({
            address: this.address,
            signature: this.signature,
            nonce: this.nonce,
            actions: this.actions,
            bundlePosition: null,
            ledgerPosition: null,
            parentBundleHash: null,
            sequencerSignature: null,
        })).digest("hex");
    }
getActionsGas(interactionGas=0,{highlayerNodeState,dbs}){

  
    
    let gasActions=this.actions.filter(a=>a.program==="system"&&a.action==="buyGas")
    let otherActions=this.actions.filter(a=>a.program!=="system"||a.action!=="buyGas")

   this.actions=[...gasActions,...otherActions]// gas actions must go first to avoid unfortunate security issues
    for (const action of this.actions) {
      if(action.program!="system"){
        interactionGas-= 20000;//Each contract invocation involves starting engine, costing around 10k gas, plus 10k is minimal gas that gets added to execution
      }else{
        let systemAction=systemActions[action.action];
        
        if(typeof systemAction=="undefined"){
            throw new Error(`"Error during gas calculation: System action ${action.action} not found`);
        }
        try{
      
         interactionGas-=systemAction.calculateSpend(action.params,{highlayerNodeState,dbs});
        }catch(e){
            console.log(action,e)
   
            throw new Error("Error during gas calculation: "+e.message);
        }
      }
    }
    return interactionGas;

}
    static decode(base58encoded) {
        try{
        const buffer = base58.decode(base58encoded);
        const decodedObject = msgpackr.decode(buffer);
        return new HighlayerTx({
            address: decodedObject.address,
            signature: decodedObject.signature,
            nonce: decodedObject.nonce,
            actions: decodedObject.actions,
            bundlePosition: decodedObject.bundlePosition,
            ledgerPosition: decodedObject.ledgerPosition,
            parentBundleHash: decodedObject.parentBundleHash,
            sequencerSignature: decodedObject.sequencerSignature,
        });
    }catch(e){
        return null
    }
    }
    static verifySignatures(encodedHighlayerTx) {
        const sequencerUnsigned = Buffer.from(new HighlayerTx({ ...encodedHighlayerTx, sequencerSignature: null }).encode())
        const dataHash = crypto.createHash("sha256").update(sequencerUnsigned).digest();
        const isSequencerSignatureValid = ed25519.verify(
            dataHash,
            base58.decode(encodedHighlayerTx.sequencerSignature),
            Buffer.from(config.sequencerPubkey, "hex")
        );
        const isEOASignatureValid = bip322.Verifier.verifySignature(encodedHighlayerTx.address, encodedHighlayerTx.extractPrototype(), encodedHighlayerTx.signature)

        return isEOASignatureValid && isSequencerSignatureValid;

    }
}

module.exports = { HighlayerTx };
