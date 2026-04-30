import { NextResponse } from 'next/server';
import fs from 'fs';

const AUTH_PATH = '/home/ubuntu/xhs/auth.json';

export async function POST(req) {
	const secret = req.headers.get('x-auth-secret');
	if (!secret || secret !== process.env.XHS_AUTH_SECRET) {
		return NextResponse.json({ error: 'forbidden' }, { status: 403 });
	}

	let body;
	try {
		body = await req.json();
	} catch {
		return NextResponse.json({ error: 'invalid' }, { status: 400 });
	}

	if (!Array.isArray(body.cookies) || !Array.isArray(body.origins)) {
		return NextResponse.json({ error: 'invalid' }, { status: 400 });
	}

	try {
		fs.writeFileSync(AUTH_PATH, JSON.stringify(body, null, 2));
	} catch (e) {
		return NextResponse.json({ error: 'write_failed', detail: e.message }, { status: 500 });
	}

	return NextResponse.json({ ok: true });
}
