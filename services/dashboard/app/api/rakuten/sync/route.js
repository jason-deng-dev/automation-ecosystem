import { runRakutenSync, killRakutenSync } from "@/app/lib/rakutenController";
import { NextResponse } from 'next/server';
export const runtime = 'nodejs';

export async function POST() {
	runRakutenSync();
	return NextResponse.json({ ok: true });
}

export async function DELETE() {
	killRakutenSync();
	return NextResponse.json({ ok: true });
}
