import { runManualPost, killManualPost, getManualPostProc, getManualPostBuffer } from "@/app/lib/xhsController";
import { NextResponse } from 'next/server';
export const runtime = 'nodejs';

export async function GET() {
	return NextResponse.json({ running: !!getManualPostProc(), logs: getManualPostBuffer() });
}

export async function POST(request) {
	const { postType } = await request.json().catch(() => ({}));
	const type = postType || 'race';
	runManualPost(type);
	return NextResponse.json({ ok: true });
}

export async function DELETE() {
	killManualPost();
	return NextResponse.json({ ok: true });
}
