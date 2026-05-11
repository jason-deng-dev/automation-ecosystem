import { NextResponse } from 'next/server';
export const runtime = 'nodejs';

const ANALYTICS_URL = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:8000';

export async function POST(request) {
	const body = await request.json();

	const res = await fetch(`${ANALYTICS_URL}/tune/xhs`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});

	const data = await res.json();
	return NextResponse.json(data, { status: res.status });
}
