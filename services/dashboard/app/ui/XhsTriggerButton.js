'use client';
import { useState, useRef, useEffect } from 'react';

const POST_TYPES = ['race', 'training', 'nutritionSupplement', 'wearable'];

function inferStatus(logs) {
	const last = [...logs].reverse().find(l => l.trim());
	if (!last) return 'done';
	if (last.includes('error') || last.includes('Error') || last.includes('failed')) return 'error';
	return 'done';
}

function connectStream(url, setLogs, setStatus, esRef, doneKeyword, setScreenshot) {
	const es = new EventSource(url);
	esRef.current = es;
	let settled = false;
	es.onmessage = (e) => {
		const line = e.data;
		if (line.startsWith('SCREENSHOT:')) {
			setScreenshot(line.slice('SCREENSHOT:'.length));
			return;
		}
		setLogs(prev => [...prev, line]);
		if (line.includes(doneKeyword)) { settled = true; setStatus('done'); es.close(); }
		else if (line.includes('error') || line.includes('Error') || line.includes('failed')) { settled = true; setStatus('error'); }
	};
	es.onerror = () => { if (!settled) setStatus('error'); es.close(); };
}

export default function XhsTriggerButton({ dict }) {
	const [postType, setPostType] = useState('race');
	const [status, setStatus] = useState('idle');
	const [logs, setLogs] = useState([]);
	const [screenshot, setScreenshot] = useState(null);
	const [modalOpen, setModalOpen] = useState(false);
	const [hovered, setHovered] = useState(false);
	const esRef = useRef(null);
	const logsContainerRef = useRef(null);

	useEffect(() => {
		fetch('/api/xhs/trigger')
			.then(r => r.json())
			.then(({ running, logs: buffered }) => {
				if (!buffered.length) return;
				const textLogs = buffered.filter(l => !l.startsWith('SCREENSHOT:'));
				const lastShot = [...buffered].reverse().find(l => l.startsWith('SCREENSHOT:'));
				setLogs(textLogs);
				if (lastShot) setScreenshot(lastShot.slice('SCREENSHOT:'.length));
				if (running) {
					setStatus('running');
					setModalOpen(true);
					connectStream('/api/xhs/trigger/stream', setLogs, setStatus, esRef, 'Manual post complete', setScreenshot);
				} else {
					setStatus(inferStatus(textLogs));
				}
			})
			.catch(() => {});
		return () => esRef.current?.close();
	}, []);

	useEffect(() => {
		if (logsContainerRef.current) {
			logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
		}
	}, [logs]);

	async function handleTrigger() {
		if (status === 'running') return;
		setStatus('running');
		setLogs([]);
		setScreenshot(null);
		setModalOpen(true);
		try {
			const res = await fetch('/api/xhs/trigger', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ postType }),
			});
			if (!res.ok) throw new Error();
			connectStream('/api/xhs/trigger/stream', setLogs, setStatus, esRef, 'Manual post complete', setScreenshot);
		} catch {
			setStatus('error');
		}
	}

	function handleClose() {
		esRef.current?.close();
		fetch('/api/xhs/trigger', { method: 'DELETE' });
		setStatus('idle');
		setLogs([]);
		setScreenshot(null);
		setModalOpen(false);
	}

	const color = { idle: '#EDEDED', running: '#F5A623', done: '#3ECF8E', error: '#C8102E' }[status];
	const label = { idle: dict.runNow, running: dict.triggering, done: dict.triggered, error: dict.triggerFailed }[status];

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
					<div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', width: '80vw', maxWidth: '1100px' }}>

						{/* Screenshot feed */}
						<div style={{ position: 'relative', flex: '1' }}>
							<button
							onClick={handleClose}
							style={{
								position: 'absolute', top: '8px', right: '8px',
								color: '#EDEDED', fontSize: '20px', lineHeight: 1, zIndex: 1,
								background: 'rgba(0,0,0,0.5)', border: 'none', cursor: 'pointer',
								padding: '4px 8px',
							}}
						>✕</button>
							{screenshot ? (
								<img
									src={`data:image/jpeg;base64,${screenshot}`}
									alt="Browser state"
									style={{ width: '100%', display: 'block', border: '1px solid #2A2A2A' }}
								/>
							) : (
								<div style={{
									width: '100%', aspectRatio: '16/9',
									border: '1px solid #2A2A2A',
									display: 'flex', alignItems: 'center', justifyContent: 'center',
									color: '#555555', fontSize: '13px',
								}}>
									Waiting for screenshot...
								</div>
							)}
							<p className="text-sm text-center mt-2" style={{ color }}>
								{status === 'running' ? '运行中...' : status === 'done' ? '完成' : '失败'}
							</p>
						</div>

						{/* Logs */}
						<div style={{
							width: '300px', flexShrink: 0,
							border: '1px solid #2A2A2A',
							backgroundColor: '#0A0A0A',
							padding: '10px',
							height: '60vh',
							overflowY: 'auto',
							fontFamily: 'monospace',
							fontSize: '11px',
							color: '#AAAAAA',
							display: 'flex',
							flexDirection: 'column',
							gap: '3px',
						}} ref={logsContainerRef}>
							{logs.length === 0
								? <span style={{ color: '#444' }}>Waiting for logs...</span>
								: logs.map((line, i) => (
									<span key={i} style={{
										wordBreak: 'break-all',
										color: line.includes('error') || line.includes('Error') || line.includes('failed') ? '#C8102E'
											: line.includes('successful') || line.includes('complete') ? '#3ECF8E'
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
