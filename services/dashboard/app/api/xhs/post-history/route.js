import { ecosystemPool } from '@/app/lib/db/pool';
import { NextResponse } from 'next/server';

export async function DELETE(req) {
	const { raceName } = await req.json().catch(() => ({}));
	if (!raceName) return NextResponse.json({ error: 'missing raceName' }, { status: 400 });
	await ecosystemPool.query(
		`DELETE FROM xhs_post_history WHERE race_name = $1`,
		[raceName],
	);
	return NextResponse.json({ ok: true });
}
