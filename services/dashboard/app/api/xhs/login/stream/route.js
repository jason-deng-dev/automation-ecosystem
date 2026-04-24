import { subscribeReAuth, getReAuthProc } from "@/app/lib/xhsController";
export const runtime = 'nodejs';

export async function GET() {
	if (!getReAuthProc()) return new Response('No auth process running', { status: 404 });

	const encoder = new TextEncoder();
	const stream = new ReadableStream({
		start(controller) {
			let closed = false;

			const enqueue = (line) => {
				if (closed) return;
				try { controller.enqueue(encoder.encode(`data: ${line}\n\n`)); }
				catch { closed = true; }
			};

			const unsubscribe = subscribeReAuth(enqueue);

			const proc = getReAuthProc();
			if (proc) {
				proc.on('exit', () => {
					if (closed) return;
					closed = true;
					unsubscribe();
					try { controller.close(); } catch {}
				});
			} else {
				closed = true;
				unsubscribe();
				try { controller.close(); } catch {}
			}

			return () => { closed = true; unsubscribe(); };
		},
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'Connection': 'keep-alive',
		},
	});
}
