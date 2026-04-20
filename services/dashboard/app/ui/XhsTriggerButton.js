'use client';
import { useState } from 'react';

const POST_TYPES = ['race', 'training', 'nutritionSupplement', 'wearable'];

export default function XhsTriggerButton({ dict }) {
	const [postType, setPostType] = useState('race');
	const [status, setStatus] = useState('idle');
	const [hovered, setHovered] = useState(false);

	async function handleTrigger() {
		setStatus('triggering');
		try {
			const res = await fetch('/api/xhs/trigger', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ postType }),
			});
			if (!res.ok) throw new Error();
			setStatus('triggered');
		} catch {
			setStatus('error');
		}
		setTimeout(() => setStatus('idle'), 4000);
	}

	const color = { idle: '#EDEDED', triggering: '#F5A623', triggered: '#3ECF8E', error: '#C8102E' }[status];
	const label = { idle: dict.runNow, triggering: dict.triggering, triggered: dict.triggered, error: dict.triggerFailed }[status];

	return (
		<div className="flex flex-col gap-2">
			<select
				value={postType}
				onChange={e => setPostType(e.target.value)}
				className="w-full text-sm font-medium px-3 py-2 bg-transparent border outline-none"
				style={{ borderColor: '#2A2A2A', color: '#EDEDED' }}
			>
				{POST_TYPES.map(t => (
					<option key={t} value={t} style={{ backgroundColor: '#111111' }}>
						{dict.postType[t]}
					</option>
				))}
			</select>
			<button
				onClick={handleTrigger}
				disabled={status === 'triggering'}
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
		</div>
	);
}
