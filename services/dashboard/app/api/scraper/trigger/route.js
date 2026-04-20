import { spawn } from 'child_process';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST() {
	const proc = spawn('docker', ['exec', 'scraper', 'node', 'scripts/run-scraper.js'], {
		detached: true,
		stdio: 'ignore',
	});
	proc.unref();
	return NextResponse.json({ ok: true });
}
