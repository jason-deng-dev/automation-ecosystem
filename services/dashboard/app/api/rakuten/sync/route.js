import { runRakutenSync, killRakutenSync, getRakutenProc, getRakutenBuffer } from "@/app/lib/rakutenController";
import { NextResponse } from 'next/server';
export const runtime = 'nodejs';

export async function GET() {
	return NextResponse.json({ running: !!getRakutenProc(), logs: getRakutenBuffer() });
}

export async function POST() {
	runRakutenSync();
	return NextResponse.json({ ok: true });
}

export async function DELETE() {
	killRakutenSync();
	return NextResponse.json({ ok: true });
}
