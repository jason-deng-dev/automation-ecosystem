'use client';
import { useState, useRef, useEffect } from 'react';

export default function RakutenTriggerButton({ dict }) {
	const [status, setStatus] = useState('idle'); // idle | running | done | error
	const [logs, setLogs] = useState([]);
	const [hovered, setHovered] = useState(false);
	const esRef = useRef(null);
	const logsEndRef = useRef(null);

	useEffect(() => () => esRef.current?.close(), []);
	useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

	async function handleTrigger() {
		if (status === 'running') return;
		setStatus('running');
		setLogs([]);

		try {
			const res = await fetch('/api/rakuten/sync', { method: 'POST' });
			if (!res.ok) throw new Error();

			const es = new EventSource('/api/rakuten/sync/stream');
			esRef.current = es;

			es.onmessage = (e) => {
				const line = e.data;
				setLogs(prev => [...prev, line]);
				if (line.includes('complete') || line.includes('done') || line.includes('finished')) setStatus('done');
				if (line.includes('error') || line.includes('Error') || line.includes('failed')) setStatus('error');
			};
			es.onerror = () => { setStatus('error'); es.close(); };
		} catch {
			setStatus('error');
		}
	}

	function handleClose() {
		esRef.current?.close();
		fetch('/api/rakuten/sync', { method: 'DELETE' });
		setStatus('idle');
		setLogs([]);
	}

	const color = { idle: '#EDEDED', running: '#F5A623', done: '#3ECF8E', error: '#C8102E' }[status];
	const label = { idle: dict.runSync, running: dict.triggering, done: dict.triggered, error: dict.triggerFailed }[status];

	return (
		<div className="flex flex-col gap-2 mt-2">
			<button
				onClick={handleTrigger}
				disabled={status === 'running'}
				onMouseEnter={() => setHovered(true)}
				onMouseLeave={() => setHovered(false)}
				className="w-full text-sm font-medium tracking-wide uppercase px-4 py-2 border transition-colors disabled:opacity-50"
				style={{
					borderColor: color, color: color,
					backgroundColor: hovered && status === 'idle' ? 'rgba(237,237,237,0.08)' : 'transparent',
				}}
			>
				{label}
			</button>

			{logs.length > 0 && (
				<div style={{ border: '1px solid #2A2A2A', backgroundColor: '#0A0A0A' }}>
					<div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid #1A1A1A' }}>
						<span className="text-xs font-medium tracking-wide uppercase" style={{ color }}>
							{status === 'done' ? '完成' : status === 'error' ? '失败' : '运行中...'}
						</span>
						{status !== 'running' && (
							<button onClick={handleClose} style={{ color: '#555555', fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
						)}
					</div>
					<div style={{ height: '200px', overflowY: 'auto', padding: '10px', fontFamily: 'monospace', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
						{logs.map((line, i) => (
							<span key={i} style={{
								color: line.includes('error') || line.includes('Error') || line.includes('failed') ? '#C8102E'
									: line.includes('success') || line.includes('complete') || line.includes('done') ? '#3ECF8E'
									: '#AAAAAA',
							}}>{line}</span>
						))}
						<div ref={logsEndRef} />
					</div>
				</div>
			)}
		</div>
	);
}
