'use client';

import { useState } from 'react';

export default function XhsRaceHistory({ initialRaces, dict }) {
	const [races, setRaces] = useState(initialRaces);

	async function handleRemove(raceName) {
		await fetch('/api/xhs/post-history', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ raceName }),
		});
		setRaces((prev) => prev.filter((r) => r !== raceName));
	}

	return (
		<div style={{ border: '1px solid #2A2A2A' }}>
			<details>
				<summary className="px-6 py-4 cursor-pointer select-none flex items-center justify-between" style={{ borderBottom: '1px solid #2A2A2A' }}>
					<span className="text-sm font-semibold tracking-wide uppercase" style={{ color: '#EDEDED' }}>
						{dict.raceHistoryTitle} ({races.length})
					</span>
					<span className="chevron" style={{ color: '#555555', fontSize: '11px' }}>▼</span>
				</summary>
				<div className="px-6 py-4 flex flex-col gap-2">
					{races.length === 0 ? (
						<span className="text-sm" style={{ color: '#555555' }}>{dict.raceHistoryEmpty}</span>
					) : (
						races.map((name) => (
							<div key={name} className="flex items-center justify-between gap-3">
								<span className="text-sm truncate" style={{ color: '#888888' }}>{name}</span>
								<button
									onClick={() => handleRemove(name)}
									className="text-xs px-2 py-0.5 shrink-0"
									style={{
										border: '1px solid #2A2A2A',
										color: '#555555',
										backgroundColor: '#111111',
										cursor: 'pointer',
									}}
								>
									{dict.raceHistoryReset}
								</button>
							</div>
						))
					)}
				</div>
			</details>
		</div>
	);
}
