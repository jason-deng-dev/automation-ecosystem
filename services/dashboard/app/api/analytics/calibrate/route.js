import { NextResponse } from 'next/server';
export const runtime = 'nodejs';

const ANALYTICS_URL = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:8000';

export async function POST(request) {
	const formData = await request.formData();
	const file = formData.get('file');
	if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

	const upstream = new FormData();
	upstream.append('file', file, file.name);

	const res = await fetch(`${ANALYTICS_URL}/analyze/xhs`, {
		method: 'POST',
		body: upstream,
	});

	const data = await res.json();
	return NextResponse.json(data, { status: res.status });
}
