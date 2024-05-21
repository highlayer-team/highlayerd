const { open } = require('lmdb');


function LMDBStoreModule(_app, carrier) {
    try {
        const store = open({
            path: carrier.options.dbPath,
            useVersions: true, sharedStructuresKey: Symbol.for('dataStructures')
        });

        const dbs = {};
        if (carrier.options.databases && Array.isArray(carrier.options.databases)) {
            for (const dbReq of carrier.options.databases) {
                dbs[dbReq.name] = store.openDB(dbReq.dbName);
            }
        }


        carrier.highlayerNodeState = store
        carrier.dbs = dbs

        process.on("exit", async () => {
            for (const db of Object.values(dbs)) {
                await db.close();
            }
            await store.close();
        })




    } catch (err) {
        console.error(err)
    }
}

module.exports = LMDBStoreModule