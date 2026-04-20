import { spawn } from 'child_process';
import { NextResponse } from 'next/server';
export const runtime = 'nodejs';

export async function POST(request) {
	const { postType } = await request.json().catch(() => ({}));
	const type = postType || 'race';
	const proc = spawn('docker', ['exec', 'xhs', 'node', 'scripts/run-manualPost.js', type], {
		detached: true, stdio: 'ignore',
	});
	proc.unref();
	return NextResponse.json({ ok: true });
}
