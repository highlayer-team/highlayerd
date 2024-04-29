
const calculateActionsGas = (interactionGas,actions,{highlayerNodeState,dbs}) => {
    const systemActions=require("../system/actionList")
    let gasActions=actions.filter(a=>a.program==="system"&&a.action==="buyGas")
    let otherActions=actions.filter(a=>a.program!=="system"||a.action!=="buyGas")

   actions=[...gasActions,...otherActions]// gas actions must go first to avoid unfortunate security issues
    for (const action of actions) {
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
   
            throw new Error("Error during gas calculation: "+e.message);
        }
      }
    }
    return interactionGas;
};
module.exports=calculateActionsGas