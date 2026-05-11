import { NextResponse } from 'next/server';
export const runtime = 'nodejs';

const ANALYTICS_URL = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:8000';

export async function POST(request) {
	const formData = await request.formData();
	const file = formData.get('file');
	if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

	const upstream = new FormData();
	upstream.append('file', file, file.name);

	let res;
	try {
		res = await fetch(`${ANALYTICS_URL}/analyze/xhs`, {
			method: 'POST',
			body: upstream,
		});
	} catch (err) {
		return NextResponse.json({ error: `Analytics service unreachable: ${err.message}` }, { status: 502 });
	}

	const text = await res.text();
	let data;
	try {
		data = JSON.parse(text);
	} catch {
		return NextResponse.json(
			{ error: `Analytics service returned non-JSON (status ${res.status})`, detail: text.slice(0, 500) },
			{ status: 502 },
		);
	}
	return NextResponse.json(data, { status: res.status });
}
