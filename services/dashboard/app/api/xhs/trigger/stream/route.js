import { subscribeManualPost, getManualPostProc, getManualPostBuffer } from "@/app/lib/xhsController";
export const runtime = 'nodejs';

export async function GET() {
	if (!getManualPostProc() && !getManualPostBuffer().length) return new Response('No manual post process running', { status: 404 });

	const encoder = new TextEncoder();
	const stream = new ReadableStream({
		start(controller) {
			let closed = false;

			const enqueue = (line) => {
				if (closed) return;
				try { controller.enqueue(encoder.encode(`data: ${line}\n\n`)); }
				catch { closed = true; }
			};

			const unsubscribe = subscribeManualPost(enqueue);

			const keepalive = setInterval(() => {
				if (closed) return;
				try { controller.enqueue(encoder.encode(': ping\n\n')); } catch { closed = true; }
			}, 15000);

			const proc = getManualPostProc();
			const onExit = () => {
				if (closed) return;
				closed = true;
				clearInterval(keepalive);
				unsubscribe();
				try { controller.close(); } catch {}
			};
			if (proc) {
				proc.once('exit', onExit);
			} else {
				closed = true;
				clearInterval(keepalive);
				unsubscribe();
				try { controller.close(); } catch {}
			}

			return () => {
				closed = true;
				clearInterval(keepalive);
				unsubscribe();
				proc?.off('exit', onExit);
			};
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
