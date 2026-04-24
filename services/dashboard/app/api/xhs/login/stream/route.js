import { getReAuthProc } from "@/app/lib/xhsController";
export const runtime = 'nodejs';

export async function GET() {
	const proc = getReAuthProc();
	if (!proc) return new Response('No auth process running', { status: 404 });

	const encoder = new TextEncoder();
	const stream = new ReadableStream({
		start(controller) {
			let closed = false;

			const enqueue = (data) => {
				if (!closed) controller.enqueue(encoder.encode(`data: ${data}\n\n`));
			};

			proc.stdout.on('data', (chunk) => {
				chunk.toString().split('\n').filter(Boolean).forEach(enqueue);
			});

			proc.stderr.on('data', (chunk) => {
				chunk.toString().split('\n').filter(Boolean).forEach(line =>
					enqueue(JSON.stringify({ type: 'error', msg: line }))
				);
			});

			proc.on('exit', () => {
				if (!closed) { closed = true; controller.close(); }
			});

			return () => { closed = true; };
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
