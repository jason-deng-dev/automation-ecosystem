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
			setScreenshot?.(line.slice('SCREENSHOT:'.length));
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
	}

	const color = { idle: '#EDEDED', running: '#F5A623', done: '#3ECF8E', error: '#C8102E' }[status];
	const label = { idle: dict.runNow, running: dict.triggering, done: dict.triggered, error: dict.triggerFailed }[status];

	return (
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

			{(logs.length > 0 || screenshot) && (
				<div style={{ border: '1px solid #2A2A2A', backgroundColor: '#0A0A0A', overflow: 'hidden' }}>
					<div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid #1A1A1A' }}>
						<span className="text-xs font-medium tracking-wide uppercase" style={{ color }}>
							{status === 'done' ? '完成' : status === 'error' ? '失败' : '运行中...'}
						</span>
						{status !== 'running' && (
							<button onClick={handleClose} style={{ color: '#555555', fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
						)}
					</div>
					{screenshot && (
						<img
							src={`data:image/jpeg;base64,${screenshot}`}
							alt="Browser state"
							style={{ width: '100%', display: 'block', borderBottom: '1px solid #1A1A1A' }}
						/>
					)}
					<div ref={logsContainerRef} style={{ height: '200px', overflowY: 'auto', overflowX: 'hidden', padding: '10px', fontFamily: 'monospace', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
						{logs.map((line, i) => (
							<span key={i} style={{
								wordBreak: 'break-all',
								color: line.includes('error') || line.includes('Error') || line.includes('failed') ? '#C8102E'
									: line.includes('successful') || line.includes('complete') ? '#3ECF8E'
									: '#AAAAAA',
							}}>{line}</span>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
