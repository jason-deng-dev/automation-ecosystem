'use client';

import { useRef, useState } from 'react';

const POST_TYPE_LABELS = {
	race_guide:           '赛事攻略',
	training:             '训练科学',
	nutrition_supplement: '营养补剂',
	wearables:            '装备测评',
	health_recovery:      '健康恢复',
};

function WeightBar({ label, weight, ci, markowitz }) {
	const pct = Math.round((weight ?? 0) * 100);
	const ciLow  = ci ? Math.round(ci.low  * 100) : null;
	const ciHigh = ci ? Math.round(ci.high * 100) : null;
	const mwPct  = markowitz ? Math.round(markowitz * 100) : null;
	return (
		<div className="flex flex-col gap-1">
			<div className="flex items-center justify-between text-sm">
				<span style={{ color: '#AAAAAA' }}>{label}</span>
				<div className="flex items-center gap-3">
					{mwPct !== null && (
						<span className="text-xs" style={{ color: '#555555' }}>MV: {mwPct}%</span>
					)}
					{ciLow !== null && (
						<span className="text-xs" style={{ color: '#555555' }}>[{ciLow}–{ciHigh}%]</span>
					)}
					<span className="font-medium" style={{ color: '#EDEDED' }}>{pct}%</span>
				</div>
			</div>
			<div style={{ height: '4px', backgroundColor: '#1A1A1A', borderRadius: '2px' }}>
				<div style={{
					height: '100%', width: `${pct}%`,
					backgroundColor: '#3ECF8E', borderRadius: '2px',
					transition: 'width 0.4s ease',
				}} />
			</div>
		</div>
	);
}

export default function XhsAnalyticsPanel() {
	const fileRef   = useRef(null);
	const [loading, setLoading]   = useState(false);
	const [result,  setResult]    = useState(null);
	const [error,   setError]     = useState(null);
	const [tuning,  setTuning]    = useState({});   // { post_type: 'loading' | 'done' | error }
	const [tuned,   setTuned]     = useState({});   // { post_type: { updated_prompt } }

	async function handleCalibrate() {
		const file = fileRef.current?.files?.[0];
		if (!file) { setError('Select an Excel file first.'); return; }
		setLoading(true); setError(null); setResult(null);
		try {
			const fd = new FormData();
			fd.append('file', file);
			const res = await fetch('/api/analytics/calibrate', { method: 'POST', body: fd });
			const data = await res.json();
			if (!res.ok) throw new Error(data.detail ?? 'Calibration failed');
			setResult(data);
		} catch (e) {
			setError(e.message);
		} finally {
			setLoading(false);
		}
	}

	async function handleTune(postType) {
		if (!result) return;
		const topPosts = result.top_posts?.[postType] ?? [];
		setTuning(t => ({ ...t, [postType]: 'loading' }));
		try {
			const res = await fetch('/api/analytics/tune', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					post_type: postType,
					top_posts: topPosts,
					current_prompt: '',
				}),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.detail ?? 'Tune failed');
			setTuned(t => ({ ...t, [postType]: data }));
			setTuning(t => ({ ...t, [postType]: 'done' }));
		} catch (e) {
			setTuning(t => ({ ...t, [postType]: e.message }));
		}
	}

	return (
		<div style={{ border: '1px solid #2A2A2A' }}>
			{/* Header */}
			<div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #2A2A2A' }}>
				<span className="text-sm font-semibold tracking-wide uppercase" style={{ color: '#EDEDED' }}>
					Content Calibration
				</span>
				{result && (
					<span className="text-xs" style={{ color: '#555555' }}>
						{new Date(result.computed_at).toLocaleString('en-CA', { timeZone: 'Asia/Shanghai', hour12: false })}
					</span>
				)}
			</div>

			<div className="px-6 py-5 flex flex-col gap-5">
				{/* Upload + trigger */}
				<div className="flex items-center gap-3">
					<input
						ref={fileRef}
						type="file"
						accept=".xlsx,.xls"
						className="text-sm"
						style={{ color: '#888888', flex: 1 }}
					/>
					<button
						onClick={handleCalibrate}
						disabled={loading}
						className="text-sm px-4 py-2 font-medium"
						style={{
							backgroundColor: loading ? '#1A1A1A' : '#111111',
							border: '1px solid #2A2A2A',
							color: loading ? '#555555' : '#EDEDED',
							cursor: loading ? 'not-allowed' : 'pointer',
							whiteSpace: 'nowrap',
						}}
					>
						{loading ? 'Running…' : 'Calibrate'}
					</button>
				</div>

				{error && (
					<span className="text-sm" style={{ color: '#C8102E' }}>{error}</span>
				)}

				{result && (
					<>
						{/* Ingestion summary */}
						<div className="flex gap-6 text-sm" style={{ color: '#555555' }}>
							<span>Updated: <span style={{ color: '#EDEDED' }}>{result.ingested?.updated}</span></span>
							<span>Skipped: <span style={{ color: '#EDEDED' }}>{result.ingested?.skipped_unknown}</span></span>
							<span>Best type: <span style={{ color: '#3ECF8E' }}>{POST_TYPE_LABELS[result.best_post_type] ?? result.best_post_type}</span></span>
						</div>

						{/* Flags */}
						{result.flags?.length > 0 && (
							<div className="flex flex-col gap-1">
								{result.flags.map((f, i) => (
									<span key={i} className="text-xs px-3 py-1.5" style={{ backgroundColor: 'rgba(245,166,35,0.08)', color: '#F5A623', border: '1px solid rgba(245,166,35,0.2)' }}>
										⚠ {f}
									</span>
								))}
							</div>
						)}

						{/* Weight bars */}
						<div className="flex flex-col gap-3">
							<span className="text-xs tracking-wide uppercase" style={{ color: '#555555' }}>
								Content Weights — EWMA · Monte Carlo [5th–95th%] · Mean-Variance
							</span>
							{Object.entries(result.content_weights ?? {}).map(([type, weight]) => (
								<WeightBar
									key={type}
									label={POST_TYPE_LABELS[type] ?? type}
									weight={weight}
									ci={result.monte_carlo_ci?.[type]}
									markowitz={result.markowitz_weights?.[type]}
								/>
							))}
						</div>

						{/* Top posts per type + tune buttons */}
						<div className="flex flex-col gap-4">
							<span className="text-xs tracking-wide uppercase" style={{ color: '#555555' }}>
								Top Posts per Type
							</span>
							{Object.entries(result.top_posts ?? {}).map(([type, posts]) => (
								<details key={type} style={{ borderTop: '1px solid #1A1A1A' }}>
									<summary className="py-3 cursor-pointer select-none flex items-center justify-between list-none">
										<span className="text-sm" style={{ color: '#AAAAAA' }}>
											{POST_TYPE_LABELS[type] ?? type}
										</span>
										<div className="flex items-center gap-3">
											{tuning[type] === 'done' && (
												<span className="text-xs" style={{ color: '#3ECF8E' }}>tuned ✓</span>
											)}
											{tuning[type] === 'loading' && (
												<span className="text-xs" style={{ color: '#555555' }}>tuning…</span>
											)}
											{tuning[type] && tuning[type] !== 'loading' && tuning[type] !== 'done' && (
												<span className="text-xs" style={{ color: '#C8102E' }}>{tuning[type]}</span>
											)}
											<button
												onClick={e => { e.preventDefault(); handleTune(type); }}
												disabled={tuning[type] === 'loading'}
												className="text-xs px-3 py-1"
												style={{
													border: '1px solid #2A2A2A',
													color: '#888888',
													backgroundColor: '#111111',
													cursor: tuning[type] === 'loading' ? 'not-allowed' : 'pointer',
												}}
											>
												Auto-tune prompt
											</button>
											<span className="text-xs" style={{ color: '#444444' }}>▼</span>
										</div>
									</summary>
									<div className="flex flex-col gap-2 pb-3">
										{posts.map((p, i) => (
											<div key={i} className="flex items-baseline gap-3 text-sm pl-2">
												<span style={{ color: '#555555', flexShrink: 0 }}>{i + 1}.</span>
												<span style={{ color: '#EDEDED' }} className="truncate">{p.title}</span>
												<span className="text-xs whitespace-nowrap" style={{ color: '#555555', marginLeft: 'auto' }}>
													{Math.round(p.score)} pts
												</span>
											</div>
										))}
										{tuned[type] && (
											<div className="mt-2 p-3" style={{ backgroundColor: '#0D0D0D', border: '1px solid #2A2A2A' }}>
												<span className="text-xs tracking-wide uppercase block mb-2" style={{ color: '#555555' }}>Updated Prompt</span>
												<pre className="text-xs whitespace-pre-wrap" style={{ color: '#AAAAAA', fontFamily: 'inherit' }}>
													{tuned[type].updated_prompt}
												</pre>
											</div>
										)}
									</div>
								</details>
							))}
						</div>
					</>
				)}
			</div>
		</div>
	);
}
