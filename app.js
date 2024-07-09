const uWS = require('uWebSockets.js');
const server = uWS.App();
const path = require('path');
const fs = require('fs');

const config = require('./config.json');

const { BroadcastChannel, Worker } = require('node:worker_threads');
const centralChannel = new BroadcastChannel('centralChannel');
const vdf = require('./weselowski-vdf-native.js/lib/index.js');
const start = async function (server, opts) {
	let carrier = { options: opts, config };
	const loadRoutes = (app, dirPath, carrier) => {
		const files = fs.readdirSync(dirPath);
		files.forEach((file) => {
			const fullPath = path.join(dirPath, file);
			if (fs.statSync(fullPath).isDirectory()) {
				loadRoutes(app, fullPath, carrier);
			} else if (path.extname(file) === '.js') {
				const route = require(fullPath);
				route(app, carrier);
			}
		});
	};
	loadRoutes(server, path.join(__dirname, 'plugins'), carrier);
	loadRoutes(server, path.join(__dirname, 'routes'), carrier);

	new Worker(path.join(__dirname, 'daemons', 'sequencer-tx-fetcher.js'));
	new Worker(path.join(__dirname, 'daemons', 'execution-core.js'));
	centralChannel.onmessage = async (interaction) => {
		if (interaction.data.type == 'publish') {
			server.publish(interaction.data.topic, Buffer.from(interaction.data.data), true);
		}
	};
	server.listen(config.port, function (listenSocket) {
		if (listenSocket) {
			console.log('Highlayerd node listening on port ' + config.port);
		}
	});
};
start(server, {
	dbPath: path.join(config.dataDir, 'node-state'),
	archiveDBPath: path.join(config.archiveDataDir, 'slow-node-state'),
	databases: [
		{
			name: 'transactions',
			dbName: 'transactions',
			archive: true,
		},
		{
			name: 'balances',
			dbName: 'balances',
		},
		{
			name: 'dataBlobs',
			dbName: 'data-blobs',
		},
		{
			name: 'sequencerSigToNumber',
			dbName: 'sequencer-sig-to-number',
		},
		{ name: 'contracts', dbName: 'contracts' },
		{
			name: 'accountKV',
			dbName: 'account-kv',
		},
	],
});
