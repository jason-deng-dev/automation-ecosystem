export const dynamic = 'force-dynamic';
import { ecosystemPool } from '@/app/lib/db/pool';
import ScraperTriggerButton from '@/app/ui/ScraperTriggerButton';
import { getDict } from '@/app/lib/dict';

export default async function ScraperPage() {
	const dict = await getDict();

	const [runHistoryRes, racesRes, lastRunRes] = await Promise.all([
		ecosystemPool.query(
			`SELECT logged_at, outcome, races_scraped, failure_count, error_msg
			 FROM scraper_run_logs ORDER BY logged_at DESC LIMIT 20`
		),
		ecosystemPool.query(
			`SELECT name, name_zh, date, date_zh, location, location_zh, registration_open, url
			 FROM races ORDER BY date ASC`
		),
		ecosystemPool.query(
			`SELECT failed_urls FROM scraper_run_logs ORDER BY logged_at DESC LIMIT 1`
		),
	]);

	const runs = runHistoryRes.rows;
	const races = racesRes.rows;
	const failedUrls = lastRunRes.rows[0]?.failed_urls ?? [];
	const useZh = lang === 'zh';

	return (
		<div className="p-8 flex flex-col gap-8">

			{/* Header */}
			<div className="flex items-center justify-between">
				<h1 className="text-base font-semibold tracking-wide uppercase" style={{ color: '#EDEDED' }}>
					{dict.scraperPipeline}
				</h1>
			</div>

			{/* Trigger — full width so log panel expands properly */}
			<ScraperTriggerButton dict={dict} />

			{/* Run History */}
			<div style={{ border: '1px solid #2A2A2A' }}>
				<details open>
					<summary className="px-6 py-4 cursor-pointer text-sm font-semibold tracking-wide uppercase select-none flex items-center justify-between" style={{ color: '#EDEDED', borderBottom: '1px solid #2A2A2A' }}>
						{dict.runHistory}
						<span className="chevron" style={{ color: '#555555', fontSize: '11px' }}>▼</span>
					</summary>
					{runs.length === 0 ? (
						<span className="px-6 py-5 block text-base text-text-secondary">—</span>
					) : (
						<table className="w-full text-sm">
							<thead>
								<tr style={{ borderBottom: '1px solid #2A2A2A' }}>
									<th className="px-6 py-2 text-left font-medium tracking-wide whitespace-nowrap" style={{ color: '#888888', width: '200px' }}>{dict.timestamp}</th>
									<th className="px-6 py-2 text-left font-medium tracking-wide whitespace-nowrap" style={{ color: '#888888', width: '100px' }}>{dict.outcome}</th>
									<th className="px-6 py-2 text-left font-medium tracking-wide whitespace-nowrap" style={{ color: '#888888', width: '100px' }}>{dict.racesScraped}</th>
									<th className="px-6 py-2 text-left font-medium tracking-wide whitespace-nowrap" style={{ color: '#888888', width: '100px' }}>{dict.failures}</th>
									<th className="px-6 py-2 text-left font-medium tracking-wide" style={{ color: '#888888' }}>{dict.errorMsg}</th>
								</tr>
							</thead>
							<tbody>
								{runs.map((r, i) => (
									<tr key={i} className="row-hover" style={{ borderBottom: '1px solid #1A1A1A' }}>
										<td className="px-6 py-3 font-medium whitespace-nowrap">
											{new Date(r.logged_at).toLocaleString('en-CA', { timeZone: 'Asia/Tokyo', hour12: false })}
										</td>
										<td className="px-6 py-3 font-medium whitespace-nowrap" style={{ color: r.outcome === 'success' ? '#3ECF8E' : '#C8102E' }}>
											{r.outcome === 'success' ? dict.success : dict.failed}
										</td>
										<td className="px-6 py-3 whitespace-nowrap">{r.races_scraped ?? '—'}</td>
										<td className="px-6 py-3 whitespace-nowrap" style={{ color: r.failure_count > 0 ? '#F5A623' : '#EDEDED' }}>
											{r.failure_count ?? 0}
										</td>
										<td className="px-6 py-3 text-text-secondary">{r.error_msg ?? '—'}</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</details>
			</div>

			{/* Failed URLs */}
			{failedUrls.length > 0 && (
				<div style={{ border: '1px solid #2A2A2A' }}>
					<details>
						<summary className="px-6 py-4 cursor-pointer text-sm font-semibold tracking-wide uppercase select-none flex items-center justify-between" style={{ color: '#F5A623', borderBottom: '1px solid #2A2A2A' }}>
							{dict.failedUrls} ({failedUrls.length})
							<span className="chevron" style={{ color: '#F5A623', fontSize: '11px', opacity: 0.6 }}>▼</span>
						</summary>
						<div className="flex flex-col gap-1 px-6 pb-5 pt-3">
							{failedUrls.map((url, i) => (
								<a key={i} href={url} target="_blank" rel="noreferrer"
									className="text-sm truncate link-hover"
								>
									{url}
								</a>
							))}
						</div>
					</details>
				</div>
			)}

			{/* Races Table */}
			<div style={{ border: '1px solid #2A2A2A' }}>
				<details open>
					<summary className="px-6 py-4 cursor-pointer text-sm font-semibold tracking-wide uppercase select-none flex items-center justify-between" style={{ color: '#EDEDED', borderBottom: '1px solid #2A2A2A' }}>
						{dict.racesViewer} ({races.length})
						<span className="chevron" style={{ color: '#555555', fontSize: '11px' }}>▼</span>
					</summary>
					{races.length === 0 ? (
						<span className="px-6 py-5 block text-base text-text-secondary">—</span>
					) : (
						<table className="w-full text-sm table-fixed">
							<colgroup>
								<col style={{ width: '38%' }} />
								<col style={{ width: '18%' }} />
								<col style={{ width: '32%' }} />
								<col style={{ width: '12%' }} />
							</colgroup>
							<thead>
								<tr style={{ borderBottom: '1px solid #2A2A2A' }}>
									<th className="px-6 py-2 text-left font-medium tracking-wide" style={{ color: '#888888' }}>{dict.raceName}</th>
									<th className="px-6 py-2 text-left font-medium tracking-wide" style={{ color: '#888888' }}>{dict.raceDate}</th>
									<th className="px-6 py-2 text-left font-medium tracking-wide" style={{ color: '#888888' }}>{dict.raceLocation}</th>
									<th className="px-6 py-2 text-left font-medium tracking-wide" style={{ color: '#888888' }}>{dict.entryStatus}</th>
								</tr>
							</thead>
							<tbody>
								{races.map((r, i) => (
									<tr key={i} className="row-hover" style={{ borderBottom: '1px solid #1A1A1A' }}>
										<td className="px-6 py-3 font-medium">
											<a href={r.url} target="_blank" rel="noreferrer"
												className="link-accent-hover"
											>
												{useZh ? (r.name_zh || r.name) : r.name}
											</a>
										</td>
										<td className="px-6 py-3 text-text-secondary whitespace-nowrap">{useZh ? (r.date_zh || r.date) : r.date}</td>
										<td className="px-6 py-3 text-text-secondary">{useZh ? (r.location_zh || r.location) : r.location}</td>
										<td className="px-6 py-3 whitespace-nowrap">
											<span className="text-xs font-medium px-2 py-0.5"
												style={{
													color: r.registration_open ? '#3ECF8E' : '#888888',
													border: `1px solid ${r.registration_open ? '#3ECF8E' : '#2A2A2A'}`,
												}}>
												{r.registration_open ? dict.entryOpen : dict.entryClosed}
											</span>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</details>
			</div>
		</div>
	);
}
