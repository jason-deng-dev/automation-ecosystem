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

	async function handleCalibrate() {
		const file = fileRef.current?.files?.[0];
		setLoading(true); setError(null); setResult(null);
		try {
			const fd = new FormData();
			if (file) fd.append('file', file);
			const res  = await fetch('/api/analytics/calibrate', { method: 'POST', body: fd });
			let data;
			try {
				data = await res.json();
			} catch {
				throw new Error(`Server returned non-JSON (${res.status})`);
			}
			if (!res.ok) throw new Error(data.error ?? data.detail ?? 'Calibration failed');
			setResult(data);
		} catch (e) {
			setError(e.message);
		} finally {
			setLoading(false);
		}
	}

	const topType      = result?.ranked_types?.[0]?.post_type;
	const topTypeLabel = topType ? (dict.postTypeLabel?.[topType] ?? topType) : '';

	return (
		<div style={{ border: '1px solid #2A2A2A' }}>
			<div className="px-6 py-4" style={{ borderBottom: '1px solid #2A2A2A' }}>
				<span className="text-sm font-semibold tracking-wide uppercase" style={{ color: '#EDEDED' }}>
					{dict.analyticsTitle}
				</span>
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
							{result.ingested?.updated > 0 && (
								<>{result.ingested.updated} {dict.analyticsSummaryMatched} · </>
							)}
							<span style={{ color: '#EDEDED', fontWeight: 600 }}>{topTypeLabel}</span>{' '}
							{dict.analyticsSummaryBest}
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
											<span style={{ color: '#444444', fontSize: '10px' }}>▼</span>
										</summary>
										<div className="flex flex-col gap-2 pb-3">
											{posts.map((p, i) => (
												<div key={i} className="flex flex-col gap-0.5 pl-4 pr-2">
													<div className="flex items-baseline gap-2 text-sm">
														<span style={{ color: '#555555', flexShrink: 0 }}>{i + 1}.</span>
														<span style={{ color: '#EDEDED' }} className="truncate">{p.title}</span>
													</div>
													<div className="flex gap-3 text-xs pl-4" style={{ color: '#555555' }}>
														<span>{p.views.toLocaleString()} {dict.analyticsViews}</span>
														<span>{p.saves} {dict.analyticsSaves}</span>
														<span>CTR {(p.ctr * 100).toFixed(1)}%</span>
														<span style={{ color: '#3ECF8E', marginLeft: 'auto' }}>
															{dict.analyticsScore} {p.ewma_score.toLocaleString()}
														</span>
													</div>
												</div>
											))}
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
