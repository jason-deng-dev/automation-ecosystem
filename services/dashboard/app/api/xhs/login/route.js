import { runReAuth } from "@/app/lib/xhsController";
import { NextResponse } from 'next/server';
export const runtime = 'nodejs';

export async function POST() {
	runReAuth();
	return NextResponse.json({ ok: true });
}
