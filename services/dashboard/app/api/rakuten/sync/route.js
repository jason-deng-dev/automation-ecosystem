import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST() {
	const rakutenUrl = process.env.RAKUTEN_SERVICE_URL;
	if (!rakutenUrl) return NextResponse.json({ error: 'RAKUTEN_SERVICE_URL not set' }, { status: 500 });

	const res = await fetch(`${rakutenUrl}/api/sync`, { method: 'POST' });
	if (!res.ok) return NextResponse.json({ error: 'Sync failed' }, { status: 502 });

	return NextResponse.json({ ok: true });
}
