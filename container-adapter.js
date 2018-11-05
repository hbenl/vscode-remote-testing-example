const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { createConnection, receiveConnection, readMessages } = require('vscode-test-adapter-remoting-util');
const { convertWorkerArgs, convertTestLoadMessage, convertTestRunMessage } = require('vscode-test-adapter-remoting-util/out/mocha');

// 'server': the worker sets up a TCP server and this adapter connects to it
// 'client': this adapter sets up a TCP server and the worker connects to it
//         - note that in this case the IP address of the host needs to be passed to the worker
const workerRole = 'server';

// use the port that is exposed by the docker container if the worker acts as a server
// otherwise, use an unused port
const ipcPort = (workerRole === 'server') ? 9226 : 9225;

// the path conversion functions
const localRoot = __dirname;
const remoteRoot = '/home/circleci';
function convertLocalToRemotePath(localPath) {
	const localRelative = path.relative(localRoot, localPath);
	const remoteRelative = localRelative.split(path.sep).join(path.posix.sep);
	return path.posix.resolve(remoteRoot, remoteRelative);
}
function convertRemoteToLocalPath(remotePath) {
	const remoteRelative = path.posix.relative(remoteRoot, remotePath);
	const localRelative = remoteRelative.split(path.posix.sep).join(path.sep);
	return path.resolve(localRoot, localRelative);
}

// converting the WorkerArgs
const origWorkerArgs = JSON.parse(process.argv[2]);
const workerArgs = { 
	...convertWorkerArgs(origWorkerArgs, convertLocalToRemotePath),
	mochaPath: 'mocha',
	ipcPort,
	ipcHost: (workerRole === 'client') ? '192.168.178.3': undefined, // insert your host IP address here
	ipcRole: workerRole
};
const workerArgsString = JSON.stringify(workerArgs);

// start the worker process
let debugOption = '';
if (origWorkerArgs.debuggerPort) {
	debugOption = `--inspect=0.0.0.0:${origWorkerArgs.debuggerPort}`;
}
const childProc = spawn(
	'docker-compose',
	[ 
		'exec', '-T', 'mocha-test-runner', 'bash', '-c',
		`cd /home/circleci ; node ${debugOption} - \'${workerArgsString}\'`
	],
	{
		stdio: [ 'pipe', 'inherit', 'inherit', 'ipc' ],
		execArgv: []
	}
);

// pass the worker bundle to the worker process
const workerBundle = fs.readFileSync(path.join(origWorkerArgs.workerPath, 'bundle.js'), 'utf8');
childProc.stdin.write(workerBundle);
childProc.stdin.end();

// receive the messages from the worker process, convert the paths in them and send them to the Test Explorer
const convertMessage = (workerArgs.action === 'loadTests') ? convertTestLoadMessage : convertTestRunMessage;
const sendMessage = process.send ? msg => process.send(msg) : console.log;
if (workerRole === 'client') {
	receiveConnection(ipcPort, { log: console }).then(socket => {
		readMessages(socket, msg => sendMessage(convertMessage(msg, convertRemoteToLocalPath)));
	});
} else {
	createConnection(ipcPort, { log: console }).then(socket => {
		readMessages(socket, msg => sendMessage(convertMessage(msg, convertRemoteToLocalPath)));
	});
}
