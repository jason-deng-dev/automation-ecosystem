import { rakutenPool } from '@/app/lib/db/pool';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
	const res = await rakutenPool.query(`SELECT * FROM config WHERE id = 1`);
	return NextResponse.json(res.rows[0] ?? null);
}

export async function POST(request) {
	const body = await request.json();
	const rakutenUrl = process.env.RAKUTEN_SERVICE_URL;
	if (!rakutenUrl) return NextResponse.json({ error: 'RAKUTEN_SERVICE_URL not set' }, { status: 500 });

	const fields = ['yen_to_yuan', 'markup_percent', 'search_fill_threshold', 'products_per_category'];
	await Promise.all(
		fields
			.filter(key => body[key] !== undefined)
			.map(key =>
				fetch(`${rakutenUrl}/api/config`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ key, value: body[key] }),
				})
			)
	);

	return NextResponse.json({ ok: true });
}
