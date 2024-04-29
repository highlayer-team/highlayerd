const fp = require('fastify-plugin');
const { open } = require('lmdb');


function fastifyLMDBStore(fastify, opts, done) {
    try {
        const store = open({
            path: opts.dbPath,
            useVersions: true, sharedStructuresKey: Symbol.for('dataStructures') 
        });

        const dbs = {};
        if (opts.databases && Array.isArray(opts.databases)) {
            for (const dbReq of opts.databases) {
                dbs[dbReq.name] = store.openDB(dbReq.dbName);
            }
        }

     
        fastify.decorate('highlayerNodeState', store);
        fastify.decorate('dbs', dbs);

        fastify.addHook('onClose', async (instance, done) => {
            for (const db of Object.values(dbs)) {
                await db.close();
            }
            await store.close();
            done();
        });

        done();
    } catch (err) {
        done(err);
    }
}

module.exports = fp(fastifyLMDBStore, {
    name: 'fastify-lmdb-store'
});