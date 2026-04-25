'use client';
import { useState, useRef, useEffect } from 'react';

export default function XhsReAuthPanel({ dict, onDone }) {
	const [status, setStatus] = useState('idle'); // idle | starting | streaming | done | error
	const [frame, setFrame] = useState(null);
	const [qrSrc, setQrSrc] = useState(null);
	const [logs, setLogs] = useState([]);
	const [hovered, setHovered] = useState(false);
	const esRef = useRef(null);

	useEffect(() => () => esRef.current?.close(), []);

	async function handleLogin() {
		esRef.current?.close();
		await fetch('/api/xhs/login', { method: 'DELETE' });
		setStatus('starting');
		setFrame(null);
		setLogs([]);
		setQrSrc(null);
		try {
			const res = await fetch('/api/xhs/login', { method: 'POST' });
			if (!res.ok) throw new Error();
			setStatus('streaming');

			const es = new EventSource('/api/xhs/login/stream');
			esRef.current = es;

			es.onmessage = (e) => {
				try {
					const msg = JSON.parse(e.data);
					if (msg.type === 'frame') setFrame(msg.data);
					if (msg.type === 'qr-src') setQrSrc(msg.data);
					if (msg.type === 'qr-scanned') setQrSrc(null);
					if (msg.type === 'log') setLogs(prev => [...prev, msg.msg]);
					if (msg.type === 'done') { setStatus('done'); onDone?.(); }
					if (msg.type === 'error') { setStatus('error'); es.close(); }
				} catch {}
			};

			es.onerror = () => { setStatus('error'); es.close(); };
		} catch {
			setStatus('error');
		}
	}

	function handleClose() {
		esRef.current?.close();
		fetch('/api/xhs/login', { method: 'DELETE' });
		setStatus('idle');
		setFrame(null);
		setQrSrc(null);
	}

	const color = {
		idle: '#C8102E', starting: '#F5A623', streaming: '#F5A623',
		done: '#3ECF8E', error: '#C8102E',
	}[status];

	const label = {
		idle: dict.login, starting: dict.triggering, streaming: dict.streaming,
		done: dict.loginDone, error: dict.loginFailed,
	}[status];

	return (
		<>
			<button
				onClick={handleLogin}
				disabled={status === 'starting' || status === 'streaming'}
				onMouseEnter={() => setHovered(true)}
				onMouseLeave={() => setHovered(false)}
				className="w-full text-sm font-medium tracking-wide uppercase px-4 py-2 border transition-colors disabled:opacity-50"
				style={{
					borderColor: color,
					color: color,
					backgroundColor: hovered && status === 'idle' ? 'rgba(200,16,46,0.15)' : 'transparent',
				}}
			>
				{label}
			</button>

			{(status === 'streaming' || status === 'done') && (
				<div
					style={{
						position: 'fixed', inset: 0,
						backgroundColor: 'rgba(0,0,0,0.85)',
						zIndex: 50,
						display: 'flex', alignItems: 'center', justifyContent: 'center',
					}}
				>
					<div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', width: '75vw' }}>
						<div style={{ position: 'relative', flex: '1' }}>
							<button
								onClick={handleClose}
								style={{
									position: 'absolute', top: '8px', right: '8px',
									color: '#EDEDED', fontSize: '20px', lineHeight: 1, zIndex: 1,
									background: 'rgba(0,0,0,0.5)', border: 'none', cursor: 'pointer',
									padding: '4px 8px',
								}}
							>
								✕
							</button>

							{qrSrc ? (
								<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
									<img
										src={qrSrc}
										alt="XHS QR code"
										style={{ width: '240px', height: '240px', imageRendering: 'pixelated', border: '8px solid #fff', display: 'block' }}
									/>
									<p style={{ color: '#F5A623', fontSize: '13px', margin: 0 }}>Scan with phone</p>
								</div>
							) : frame ? (
								<img
									src={`data:image/jpeg;base64,${frame}`}
									alt="XHS login stream"
									style={{ width: '100%', display: 'block', border: '1px solid #2A2A2A' }}
								/>
							) : (
								<div style={{
									width: '100%', aspectRatio: '1',
									border: '1px solid #2A2A2A',
									display: 'flex', alignItems: 'center', justifyContent: 'center',
									color: '#555555', fontSize: '13px',
								}}>
									{dict.triggering}
								</div>
							)}

							<p className="text-sm text-center mt-3" style={{ color: '#F5A623' }}>
								{dict.streaming}
							</p>
						</div>

						<div style={{
							width: '280px', flexShrink: 0,
							border: '1px solid #2A2A2A',
							backgroundColor: '#0A0A0A',
							padding: '10px',
							height: '300px',
							overflowY: 'auto',
							fontFamily: 'monospace',
							fontSize: '12px',
							color: '#AAAAAA',
							display: 'flex',
							flexDirection: 'column',
							gap: '4px',
						}}>
							{logs.length === 0
								? <span style={{ color: '#444' }}>Waiting for logs...</span>
								: logs.map((line, i) => <span key={i}>{line}</span>)
							}
						</div>
					</div>
				</div>
			)}
		</>
	);
}
