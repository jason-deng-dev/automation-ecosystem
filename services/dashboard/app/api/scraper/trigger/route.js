import { runScraperTrigger, killScraperTrigger, getScraperProc, getScraperBuffer } from "@/app/lib/scrapperController";
import { NextResponse } from 'next/server';
export const runtime = 'nodejs';

export async function GET() {
	return NextResponse.json({ running: !!getScraperProc(), logs: getScraperBuffer() });
}

export async function POST() {
	runScraperTrigger();
	return NextResponse.json({ ok: true });
}

export async function DELETE() {
	killScraperTrigger();
	return NextResponse.json({ ok: true });
}
