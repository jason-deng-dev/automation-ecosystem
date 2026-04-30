import { runGenerate, killGenerate, getGenerateProc, getGenerateBuffer } from "@/app/lib/xhsController";
import { NextResponse } from 'next/server';
export const runtime = 'nodejs';

export async function GET() {
	return NextResponse.json({ running: !!getGenerateProc(), logs: getGenerateBuffer() });
}

export async function POST(request) {
	const { postType } = await request.json().catch(() => ({}));
	runGenerate(postType || 'race');
	return NextResponse.json({ ok: true });
}

export async function DELETE() {
	killGenerate();
	return NextResponse.json({ ok: true });
}
