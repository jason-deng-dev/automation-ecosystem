'use client';
import { useState, useRef, useEffect } from 'react';

export default function XhsReAuthPanel({ dict }) {
	const [status, setStatus] = useState('idle'); // idle | starting | streaming | done | error
	const [frame, setFrame] = useState(null);
	const [hovered, setHovered] = useState(false);
	const esRef = useRef(null);

	useEffect(() => () => esRef.current?.close(), []);

	async function handleLogin() {
		setStatus('starting');
		setFrame(null);
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
					if (msg.type === 'done') { setStatus('done'); es.close(); }
					if (msg.type === 'error') { setStatus('error'); es.close(); }
				} catch {}
			};

			es.onerror = () => {
				if (status !== 'done') setStatus('error');
				es.close();
			};
		} catch {
			setStatus('error');
		}
	}

	const color = {
		idle: '#EDEDED', starting: '#F5A623', streaming: '#F5A623',
		done: '#3ECF8E', error: '#C8102E',
	}[status];

	const label = {
		idle: dict.login, starting: dict.triggering, streaming: dict.streaming,
		done: dict.loginDone, error: dict.loginFailed,
	}[status];

	return (
		<div className="flex flex-col gap-2">
			<button
				onClick={handleLogin}
				disabled={status === 'starting' || status === 'streaming'}
				onMouseEnter={() => setHovered(true)}
				onMouseLeave={() => setHovered(false)}
				className="w-full text-sm font-medium tracking-wide uppercase px-4 py-2 border transition-colors disabled:opacity-50"
				style={{
					borderColor: color,
					color: color,
					backgroundColor: hovered && status === 'idle' ? 'rgba(237,237,237,0.08)' : 'transparent',
				}}
			>
				{label}
			</button>
			{frame && (
				<img
					src={`data:image/jpeg;base64,${frame}`}
					alt="XHS login QR"
					className="w-full border"
					style={{ borderColor: '#2A2A2A' }}
				/>
			)}
		</div>
	);
}
