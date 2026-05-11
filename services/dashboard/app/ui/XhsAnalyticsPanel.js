'use client';

import { useRef, useState } from 'react';

function TypeRankRow({ label, weight, isTop, postMoreLabel }) {
	const pct = Math.round(weight * 100);
	return (
		<div className="flex flex-col gap-1">
			<div className="flex items-center justify-between text-sm">
				<div className="flex items-center gap-2">
					<span style={{ color: isTop ? '#EDEDED' : '#888888', fontWeight: isTop ? 600 : 400 }}>
						{label}
					</span>
					{isTop && (
						<span className="text-xs px-2 py-0.5" style={{
							backgroundColor: 'rgba(62,207,142,0.1)',
							color: '#3ECF8E',
							border: '1px solid rgba(62,207,142,0.2)',
						}}>
							{postMoreLabel}
						</span>
					)}
				</div>
				<span className="font-medium text-sm" style={{ color: isTop ? '#3ECF8E' : '#AAAAAA' }}>
					{pct}%
				</span>
			</div>
			<div style={{ height: '4px', backgroundColor: '#1A1A1A', borderRadius: '2px' }}>
				<div style={{
					height: '100%',
					width: `${pct}%`,
					backgroundColor: isTop ? '#3ECF8E' : '#2A2A2A',
					borderRadius: '2px',
					transition: 'width 0.4s ease',
				}} />
			</div>
		</div>
	);
}

export default function XhsAnalyticsPanel({ dict }) {
	const fileRef = useRef(null);
	const [loading, setLoading] = useState(false);
	const [result,  setResult]  = useState(null);
	const [error,   setError]   = useState(null);
	const [tuning,  setTuning]  = useState({});
	const [tuned,   setTuned]   = useState({});

	async function handleCalibrate() {
		const file = fileRef.current?.files?.[0];
		if (!file) { setError(dict.analyticsSelectFile); return; }
		setLoading(true); setError(null); setResult(null);
		try {
			const fd = new FormData();
			fd.append('file', file);
			const res  = await fetch('/api/analytics/calibrate', { method: 'POST', body: fd });
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
			const res  = await fetch('/api/analytics/tune', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ post_type: postType, top_posts: topPosts, current_prompt: '' }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.detail ?? 'Tune failed');
			setTuned(t => ({ ...t, [postType]: data }));
			setTuning(t => ({ ...t, [postType]: 'done' }));
		} catch (e) {
			setTuning(t => ({ ...t, [postType]: e.message }));
		}
	}

	const topType      = result?.ranked_types?.[0]?.post_type;
	const topTypeLabel = topType ? (dict.postTypeLabel?.[topType] ?? topType) : '';

	return (
		<div style={{ border: '1px solid #2A2A2A' }}>
			<div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #2A2A2A' }}>
				<span className="text-sm font-semibold tracking-wide uppercase" style={{ color: '#EDEDED' }}>
					{dict.analyticsTitle}
				</span>
				{result && (
					<span className="text-xs" style={{ color: '#555555' }}>
						{new Date(result.computed_at).toLocaleString('en-CA', { timeZone: 'Asia/Shanghai', hour12: false })}
					</span>
				)}
			</div>

			<div className="px-6 py-5 flex flex-col gap-5">
				{/* Upload */}
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
							backgroundColor: '#111111',
							border: '1px solid #2A2A2A',
							color: loading ? '#555555' : '#EDEDED',
							cursor: loading ? 'not-allowed' : 'pointer',
							whiteSpace: 'nowrap',
						}}
					>
						{loading ? dict.analyticsAnalyzing : dict.analyticsAnalyze}
					</button>
				</div>

				{error && <span className="text-sm" style={{ color: '#C8102E' }}>{error}</span>}

				{result && (
					<>
						{/* Summary */}
						<div className="text-sm" style={{ color: '#888888' }}>
							{dict.analyticsSummary(topTypeLabel, result.ingested?.updated)}
						</div>

						{/* Flags */}
						{result.flags?.length > 0 && (
							<div className="flex flex-col gap-1">
								{result.flags.map((f, i) => (
									<span key={i} className="text-xs px-3 py-2" style={{
										backgroundColor: 'rgba(245,166,35,0.06)',
										color: '#F5A623',
										border: '1px solid rgba(245,166,35,0.15)',
									}}>
										{f}
									</span>
								))}
							</div>
						)}

						{/* Ranked types */}
						<div className="flex flex-col gap-3">
							<span className="text-xs tracking-wide uppercase" style={{ color: '#555555' }}>
								{dict.analyticsRanking}
							</span>
							{result.ranked_types?.map(({ post_type, weight }, i) => (
								<TypeRankRow
									key={post_type}
									label={dict.postTypeLabel?.[post_type] ?? post_type}
									weight={weight}
									isTop={i === 0}
									postMoreLabel={dict.analyticsPostMore}
								/>
							))}
						</div>

						{/* Top posts per type */}
						<div className="flex flex-col" style={{ borderTop: '1px solid #1A1A1A' }}>
							<span className="text-xs tracking-wide uppercase pt-4 pb-3" style={{ color: '#555555' }}>
								{dict.analyticsTopPosts}
							</span>
							{result.ranked_types?.map(({ post_type }) => {
								const posts = result.top_posts?.[post_type] ?? [];
								if (!posts.length) return null;
								return (
									<details key={post_type} style={{ borderTop: '1px solid #1A1A1A' }}>
										<summary className="py-3 cursor-pointer select-none flex items-center justify-between list-none">
											<span className="text-sm" style={{ color: '#888888' }}>
												{dict.postTypeLabel?.[post_type] ?? post_type}
											</span>
											<div className="flex items-center gap-3">
												{tuning[post_type] === 'done' && (
													<span className="text-xs" style={{ color: '#3ECF8E' }}>{dict.analyticsTuned}</span>
												)}
												{tuning[post_type] === 'loading' && (
													<span className="text-xs" style={{ color: '#555555' }}>{dict.analyticsTuning}</span>
												)}
												<button
													onClick={e => { e.preventDefault(); handleTune(post_type); }}
													disabled={tuning[post_type] === 'loading'}
													className="text-xs px-3 py-1"
													style={{
														border: '1px solid #2A2A2A',
														color: '#888888',
														backgroundColor: '#111111',
														cursor: tuning[post_type] === 'loading' ? 'not-allowed' : 'pointer',
													}}
												>
													{dict.analyticsAutoTune}
												</button>
												<span style={{ color: '#444444', fontSize: '10px' }}>▼</span>
											</div>
										</summary>
										<div className="flex flex-col gap-2 pb-3">
											{posts.map((p, i) => (
												<div key={i} className="flex items-baseline gap-3 text-sm pl-4">
													<span style={{ color: '#555555', flexShrink: 0 }}>{i + 1}.</span>
													<span style={{ color: '#EDEDED' }} className="truncate">{p.title}</span>
													<span className="text-xs whitespace-nowrap" style={{ color: '#555555', marginLeft: 'auto' }}>
														{p.views.toLocaleString()} {dict.analyticsViews}
													</span>
												</div>
											))}
											{tuned[post_type] && (
												<div className="mt-2 p-3 ml-4" style={{ backgroundColor: '#0D0D0D', border: '1px solid #2A2A2A' }}>
													<span className="text-xs tracking-wide uppercase block mb-2" style={{ color: '#555555' }}>
														{dict.analyticsUpdatedPrompt}
													</span>
													<pre className="text-xs whitespace-pre-wrap" style={{ color: '#AAAAAA', fontFamily: 'inherit' }}>
														{tuned[post_type].updated_prompt}
													</pre>
												</div>
											)}
										</div>
									</details>
								);
							})}
						</div>
					</>
				)}
			</div>
		</div>
	);
}
