const request = require('brq');
const { BroadcastChannel, Worker } = require('node:worker_threads');
const lmdb = require('lmdb');
const path = require('path');
const ed25519 = require('bcrypto/lib/ed25519');
const { HighlayerTx } = require('../structs/highlayer-tx.js');
const config = require('../config.json');
const GeneratorQueue = require('../helpers/generator-queue.js');
const systemActions = require('../system/actionList');
const fs = require('fs');
const json5 = require('json5');
const process=require("process");
const bech32 = require('bcrypto/lib/encoding/bech32m');

const crypto = require('crypto');
const Glomium = require('glomium');
const calculateActionsGas = require('../helpers/calculateActionsGas');
const HighlayerLogger = require('../helpers/logger.js');

const genesisActions = json5.parse(
	fs.readFileSync(path.join(__dirname, '..', 'genesis-actions.json5'), 'utf-8')
);

(async () => {
	const highlayerNodeState = lmdb.open({
		cache:true,
		path: path.join(config.dataDir, 'node-state'),
		useVersions: true,
		sharedStructuresKey: Symbol.for('dataStructures'),
	});
	const highlayerNodeArchive = lmdb.open({
		cache:true,
		path: path.join(config.archiveDataDir, 'slow-node-state'),
		useVersions: true,
		sharedStructuresKey: Symbol.for('dataStructures'),
	});
	const dbs = {
		balances: highlayerNodeState.openDB('balances',{cache:true}),
		dataBlobs: highlayerNodeState.openDB('data-blobs',{cache:true}),
		contracts: highlayerNodeState.openDB('contracts',{cache:true}),
		accountKV: highlayerNodeState.openDB('account-kv',{cache:true}),
		transactions: highlayerNodeArchive.openDB('transactions',{cache:true}),
	};
	const currentLatestTxIndex = highlayerNodeState.get('current-executed-tx-i') || -1;
	const vm = new Glomium({
		gas: {
			limit: 100000,
			memoryByteCost: 1, // Define the gas cost per byte of memory used
		},
	});

	const executionCoreChannel = new BroadcastChannel('executionCore');
	const centralChannel = new BroadcastChannel('centralChannel');
	process.on('beforeExit',async ()=>{
		await highlayerNodeArchive.close()
		await highlayerNodeState.close()
	})
	let macroTasks = new GeneratorQueue([], currentLatestTxIndex+1, [], async function onNextItem(item) {
		let actionNumber = 0;
		let gasLeft = item.gas;
		while (item.actions.length > 0) {
			const action = item.actions.shift();
			const logger = new HighlayerLogger(action.program);
			try {
				
				if (action.program == 'system') {
					
					if (systemActions[action.action]) {
						await systemActions[action.action].execute(action, {
							highlayerNodeState,
							dbs,
							interaction: item,
							actionNumber,
							macroTasks,
							logger,
							centralChannel,
						});
						
					} else {
						throw new Error(`Unknown system action ${action.action}`);
					}
				} else {
					const contractSourceId = dbs.contracts.get(action.program);
					if (!contractSourceId) {
						throw new Error(`[${item.id}] Unknown program ${action.program}`);
					}
					let contractSource = dbs.dataBlobs.get(contractSourceId);
					if (!contractSource) {
						throw new Error(`Unknown program source ${contractSourceId}`);
					}

					contractSource = Buffer.from(contractSource).toString('utf-8');

					await vm.clear();
					await vm.setGas({
						limit: gasLeft + 10000,
						memoryByteCost: 1,
						used: 0,
					});
					vm.set('console', {
						log: logger.log.bind(logger),
						error: logger.error.bind(logger),
						warn: logger.error.bind(logger),
					});
					vm.set('KV', {
						get(key) {
							return dbs.accountKV.get(action.program + ':' + key)||null;
						}
					});

					vm.set('ContractError',(e)=>{

						throw new Error('Contract error: '+e);
					});
					vm.set("ContractAssert",(condition,errorMessage)=>{
						if(!condition){
							throw new Error(errorMessage);
						}
					})
					
	
					
					await vm.run(contractSource)
	
					const onTransaction = await vm.get('onTransaction');
		
					let outcome;
					try{
					outcome = await onTransaction({
						action:action.action,
						hash: item.hash,
						sender: item.sender,
						actionNumber: actionNumber,
						params: action.params,
					});
				}
				catch(e){
					console.error(e)
					logger.error(
						'Transaction: ' + item.hash+' | Sender: '+item.sender,
						e

					);
				}
		
					item.gas -= (await vm.getGas()).gasUsed - 10000;
					if (outcome && outcome.length > 0) {
						try {
							item.gas = calculateActionsGas(item.gas, outcome, {
								highlayerNodeState,
								dbs,
							});
						} catch (e) {
							console.log(e)
							logger.error(
								'Transaction: ' + interaction.hash,
								'Sender: ' + item.sender,
								'Error: '+e?.message
								
							);
							break;
						}
						if (item.gas < 1) {
							logger.error(
								'Transaction: ' + interaction.hash,
								'Sender: ' + item.sender,
								'Error: Out of gas'
							);
							break;
						}
						macroTasks.addToPriority({
							sender: action.program,
							actions: outcome,
							gas: item.gas,
							hash: crypto
								.createHash('blake2s256')
								.update(action.program + item.hash + actionNumber.toString(16))
								.digest('hex'),
						});
					}

					
				}
			} catch (e) {
				console.error(e)
				logger.error('Transaction: ' + item.hash, 'Sender: ' + item.sender, 'Error: '+ e?.message);
				break;
			}
			actionNumber++;
		}


		if(typeof item.id=="number"){
		
			highlayerNodeState.put('current-executed-tx-i', item.id);
		}
		
		return true;
	})



	executionCoreChannel.onmessage = async (interaction) => {
		macroTasks.addItem(interaction.data);
	};
	macroTasks.addItem({
		id: 0,
		sender: 'system',
		actions: genesisActions,
	});
})();
