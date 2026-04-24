import { runReAuth, killReAuth } from "@/app/lib/xhsController";
import { NextResponse } from 'next/server';
export const runtime = 'nodejs';

export async function POST() {
	runReAuth();
	return NextResponse.json({ ok: true });
}

export async function DELETE() {
	killReAuth();
	return NextResponse.json({ ok: true });
}
