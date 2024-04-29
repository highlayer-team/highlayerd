const {Lock} = require('bmutex');
module.exports=class GeneratorQueue {
    constructor(items=[],initialId=0,priorityQueue=[],onNextItem=null){
        this.items=new Map(items.map(item=>([item.id,item])));
        this.nextId=initialId;
        this.priorityQueue=priorityQueue;
        this.onNextItem=onNextItem
        this.processingLock=Lock.create()
    }
    addItem(item){
        if(item.id>=this.nextId){
            this.items.set(item.id, item);
        }
            this.triggerNextItem();

        
    }
    addToPriority(item){
        this.priorityQueue.push(item)
            this.triggerNextItem();
       
    }
    next(){
       
        if(this.priorityQueue.length>0){
            return this.priorityQueue.shift()
        }
        if (this.items.has(this.nextId)) {
            const item = this.items.get(this.nextId);
            this.items.delete(this.nextId);  
            this.nextId++;                
            return item;
        }
        return null
    }
    async triggerNextItem() {
       const unlock=await this.processingLock()

        if (typeof this.onNextItem === 'function') {
         
            if (this.priorityQueue.length > 0) {
                const priorityItem = this.priorityQueue.shift();
                await this.onNextItem(priorityItem);
            }else if(this.items.has(this.nextId)){
         
                const item = this.items.get(this.nextId);
   
                    await this.onNextItem(item);
                
               
                this.items.delete(this.nextId)
                this.nextId++

            }
            if(this.items.has(this.nextId)){
                this.triggerNextItem()
            }
        }

        unlock()
    }
}