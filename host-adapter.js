const path = require('path');
const fs = require('fs');
const { fork } = require('child_process');
const { createConnection, receiveConnection, readMessages } = require('vscode-test-adapter-remoting-util');

const workerRole = 'server';

const ipcPort = 9225;

const origWorkerArgs = JSON.parse(process.argv[2]);
const workerArgs = { 
	...origWorkerArgs,
	mochaPath: 'mocha',
	ipcPort,
	ipcRole: workerRole
};
const workerArgsString = JSON.stringify(workerArgs);

const workerBundle = fs.readFileSync(path.join(origWorkerArgs.workerPath, 'bundle.js'), 'utf8');

const execArgv = [];
if (workerArgs.debuggerPort) {
	execArgv.push(`--inspect-brk=${workerArgs.debuggerPort}`);
}
const childProc = fork(
	'-',
	[ workerArgsString ],
	{
		stdio: [ 'pipe', 'inherit', 'inherit', 'ipc' ],
		execArgv
	}
);

childProc.stdin.write(workerBundle);
childProc.stdin.end();

const sendMessage = process.send ? msg => process.send(msg) : console.log;

if (workerRole === 'client') {
	receiveConnection(ipcPort, { log: console }).then(socket => {
		readMessages(socket, msg => sendMessage(msg));
	});
} else {
	createConnection(ipcPort, { log: console }).then(socket => {
		readMessages(socket, msg => sendMessage(msg));
	});
}
