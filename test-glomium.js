const Glomium=require("glomium")
const g=new Glomium()

g.set("test",{get:()=>{return "test"}})

g.set("console",console)
g.run('console.log(test.get("1"))')