import { readFileSync } from 'fs';

try {
	const pid = parseInt(readFileSync('/tmp/scheduler.pid', 'utf8').trim(), 10);
	process.kill(pid, 'SIGUSR2');
	console.log(`Sent SIGUSR2 to scheduler (PID ${pid})`);
} catch (err) {
	console.error(`Failed to signal scheduler: ${err.message}`);
	process.exit(1);
}
