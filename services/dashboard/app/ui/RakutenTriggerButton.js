'use client';

import { useState } from 'react';

export default function RakutenTriggerButton({ dict }) {
	const [status, setStatus] = useState('idle');
	const [hovered, setHovered] = useState(false);

	async function handleTrigger() {
		setStatus('triggering');
		try {
			const res = await fetch('/api/rakuten/sync', { method: 'POST' });
			if (!res.ok) throw new Error();
			setStatus('triggered');
		} catch {
			setStatus('error');
		}
		setTimeout(() => setStatus('idle'), 4000);
	}

	const label = {
		idle: dict.runSync,
		triggering: dict.triggering,
		triggered: dict.triggered,
		error: dict.triggerFailed,
	}[status];

	const color = {
		idle: '#EDEDED',
		triggering: '#F5A623',
		triggered: '#3ECF8E',
		error: '#C8102E',
	}[status];

	return (
		<button
			onClick={handleTrigger}
			disabled={status === 'triggering'}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			className="mt-2 w-full text-sm font-medium tracking-wide uppercase px-4 py-2 border transition-colors disabled:opacity-50"
			style={{
				borderColor: color,
				color: color,
				backgroundColor: hovered && status === 'idle' ? 'rgba(237,237,237,0.08)' : 'transparent',
			}}
		>
			{label}
		</button>
	);
}
