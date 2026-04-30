import { ecosystemPool } from '@/app/lib/db/pool';
import { NextResponse } from 'next/server';

export async function POST(req) {
	const { id } = await req.json().catch(() => ({}));
	if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 });
	await ecosystemPool.query(`UPDATE xhs_post_archive SET published = true WHERE id = $1`, [id]);
	return NextResponse.json({ ok: true });
}
