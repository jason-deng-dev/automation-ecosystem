'use client';
import { useState, useRef, useEffect } from 'react';

const POST_TYPES = ['race', 'training', 'nutritionSupplement', 'wearable'];

export default function XhsTriggerButton({ dict }) {
	const [postType, setPostType] = useState('race');
	const [status, setStatus] = useState('idle');
	const [logs, setLogs] = useState([]);
	const [modalOpen, setModalOpen] = useState(false);
	const [hovered, setHovered] = useState(false);
	const esRef = useRef(null);
	const logsRef = useRef(null);

	useEffect(() => {
		fetch('/api/xhs/trigger')
			.then(r => r.json())
			.then(({ running, logs: buffered }) => {
				if (!buffered.length && !running) return;
				setLogs(buffered);
				if (running) {
					setStatus('running');
					setModalOpen(true);
					connect();
				}
			})
			.catch(() => {});
		return () => esRef.current?.close();
	}, []);

	useEffect(() => {
		if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight;
	}, [logs]);

	function connect() {
		const es = new EventSource('/api/xhs/trigger/stream');
		esRef.current = es;
		es.onmessage = (e) => {
			const line = e.data;
			setLogs(prev => [...prev, line]);
			if (line.includes('Generate complete')) { setStatus('done'); es.close(); }
			else if (line.includes('error') || line.includes('Error') || line.includes('failed')) setStatus('error');
		};
		es.onerror = () => { setStatus(s => s === 'running' ? 'error' : s); es.close(); };
	}

	async function handleTrigger() {
		if (status === 'running') return;
		setStatus('running');
		setLogs([]);
		setModalOpen(true);
		try {
			const res = await fetch('/api/xhs/trigger', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ postType }),
			});
			if (!res.ok) throw new Error();
			connect();
		} catch {
			setStatus('error');
		}
	}

	function handleClose() {
		esRef.current?.close();
		fetch('/api/xhs/trigger', { method: 'DELETE' });
		setStatus('idle');
		setLogs([]);
		setModalOpen(false);
	}

	const color = { idle: '#EDEDED', running: '#F5A623', done: '#3ECF8E', error: '#C8102E' }[status];
	const label = {
		idle: dict.generatePost,
		running: dict.generating,
		done: dict.generateDone,
		error: dict.generateFailed,
	}[status];

	return (
		<>
			<div className="flex flex-col gap-2">
				<select
					value={postType}
					onChange={e => setPostType(e.target.value)}
					className="w-full text-sm font-medium px-3 py-2 bg-transparent border outline-none"
					style={{ borderColor: '#2A2A2A', color: '#EDEDED' }}
				>
					{POST_TYPES.map(t => (
						<option key={t} value={t} style={{ backgroundColor: '#111111' }}>{dict.postType[t]}</option>
					))}
				</select>

				<button
					onClick={status !== 'idle' ? () => setModalOpen(true) : handleTrigger}
					onMouseEnter={() => setHovered(true)}
					onMouseLeave={() => setHovered(false)}
					className="w-full text-sm font-medium tracking-wide uppercase px-4 py-2 border transition-colors"
					style={{
						borderColor: color, color: color,
						backgroundColor: hovered ? 'rgba(237,237,237,0.08)' : 'transparent',
					}}
				>
					{label}
				</button>
			</div>

			{modalOpen && (
				<div style={{
					position: 'fixed', inset: 0,
					backgroundColor: 'rgba(0,0,0,0.85)',
					zIndex: 50,
					display: 'flex', alignItems: 'center', justifyContent: 'center',
				}}>
					<div style={{ position: 'relative' }}>
						<button onClick={handleClose} style={{
							position: 'absolute', top: '-32px', right: 0,
							color: '#EDEDED', fontSize: '20px', lineHeight: 1,
							background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
						}}>✕</button>
						<div style={{
							width: '360px',
							border: '1px solid #2A2A2A',
							backgroundColor: '#0A0A0A',
							padding: '12px',
							height: '50vh',
							overflowY: 'auto',
							fontFamily: 'monospace',
							fontSize: '11px',
							color: '#AAAAAA',
							display: 'flex',
							flexDirection: 'column',
							gap: '3px',
						}} ref={logsRef}>
							{logs.length === 0
								? <span style={{ color: '#444' }}>Waiting for logs...</span>
								: logs.map((line, i) => (
									<span key={i} style={{
										wordBreak: 'break-all',
										color: line.includes('error') || line.includes('Error') || line.includes('failed') ? '#C8102E'
											: line.includes('Generate complete') ? '#3ECF8E'
											: '#AAAAAA',
									}}>{line}</span>
								))
							}
						</div>
					</div>
				</div>
			)}
		</>
	);
}
