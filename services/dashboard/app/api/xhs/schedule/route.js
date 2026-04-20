import { ecosystemPool } from '@/app/lib/db/pool';
import { spawn } from 'child_process';
import { NextResponse } from 'next/server';
export const runtime = 'nodejs';

export async function GET() {
	const res = await ecosystemPool.query(
		`SELECT id, day, time, post_type FROM xhs_schedule ORDER BY day, time`
	);
	return NextResponse.json(res.rows);
}

export async function POST(request) {
	const slots = await request.json();
	if (!Array.isArray(slots)) return NextResponse.json({ error: 'invalid' }, { status: 400 });

	const client = await ecosystemPool.connect();
	try {
		await client.query('BEGIN');
		await client.query('DELETE FROM xhs_schedule');
		for (const slot of slots) {
			await client.query(
				'INSERT INTO xhs_schedule (day, time, post_type) VALUES ($1, $2, $3)',
				[Number(slot.day), slot.time, slot.post_type]
			);
		}
		await client.query('COMMIT');
	} catch (err) {
		await client.query('ROLLBACK');
		return NextResponse.json({ error: err.message }, { status: 500 });
	} finally {
		client.release();
	}

	const proc = spawn('docker', ['exec', 'xhs', 'node', 'scripts/run-reloadSchedule.js'], {
		detached: true, stdio: 'ignore',
	});
	proc.unref();

	return NextResponse.json({ ok: true });
}
