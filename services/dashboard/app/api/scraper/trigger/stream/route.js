import { subscribeScraperTrigger, getScraperProc, getScraperBuffer } from "@/app/lib/scrapperController";
export const runtime = 'nodejs';

export async function GET() {
	if (!getScraperProc() && !getScraperBuffer().length) return new Response('No scraper process running', { status: 404 });

	const encoder = new TextEncoder();
	const stream = new ReadableStream({
		start(controller) {
			let closed = false;

			const enqueue = (line) => {
				if (closed) return;
				try { controller.enqueue(encoder.encode(`data: ${line}\n\n`)); }
				catch { closed = true; }
			};

			const unsubscribe = subscribeScraperTrigger(enqueue);
			const proc = getScraperProc();
			const onExit = () => {
				if (closed) return;
				closed = true;
				unsubscribe();
				try { controller.close(); } catch {}
			};
			if (proc) {
				proc.once('exit', onExit);
			} else {
				closed = true;
				unsubscribe();
				try { controller.close(); } catch {}
			}

			return () => { closed = true; unsubscribe(); proc?.off('exit', onExit); };
		},
	});

	return new Response(stream, {
		headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
	});
}
