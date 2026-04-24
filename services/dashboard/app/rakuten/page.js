export const dynamic = 'force-dynamic';
import { rakutenPool } from '@/app/lib/db/pool';
import RakutenConfigEditor from '@/app/ui/RakutenConfigEditor';
import RakutenTriggerButton from '@/app/ui/RakutenTriggerButton';
import en from '@/app/lib/locales/en';
import zh from '@/app/lib/locales/zh';

export default async function RakutenPage() {
	const lang = process.env.NEXT_PUBLIC_LANG || 'en';
	const dict = lang === 'en' ? en : zh;

	const [configRes, runLogsRes, importLogsRes] = await Promise.all([
		rakutenPool.query(`SELECT * FROM config WHERE id = 1`),
		rakutenPool.query(
			`SELECT timestamp, operation, new_products_pushed, price_updates, removed_stale, errors
			 FROM run_logs ORDER BY timestamp DESC LIMIT 20`
		),
		rakutenPool.query(
			`SELECT timestamp, item_name, item_url, status, error_msg
			 FROM import_logs ORDER BY timestamp DESC LIMIT 50`
		),
	]);

	const config = configRes.rows[0] ?? null;
	const runs = runLogsRes.rows;
	const imports = importLogsRes.rows;

	return (
		<div className="p-8 flex flex-col gap-8">

			{/* Header */}
			<div className="flex items-center justify-between">
				<h1 className="text-base font-semibold tracking-wide uppercase" style={{ color: '#EDEDED' }}>
					{dict.rakutenPipeline}
				</h1>
			</div>

			{/* Body: 1/3 controls | 2/3 logs */}
			<div className="grid gap-8 items-start" style={{ gridTemplateColumns: '1fr 2fr' }}>

				{/* Left — controls */}
				<div className="flex flex-col gap-6">
					<RakutenTriggerButton dict={dict} />
					<RakutenConfigEditor config={config} dict={dict} />
				</div>

				{/* Right — logs */}
				<div className="flex flex-col gap-8 min-w-0">

			{/* Run Log */}
			<div style={{ border: '1px solid #2A2A2A' }}>
				<details open>
					<summary className="px-6 py-4 cursor-pointer text-sm font-semibold tracking-wide uppercase select-none flex items-center justify-between" style={{ color: '#EDEDED', borderBottom: '1px solid #2A2A2A' }}>
						{dict.runLog}
						<span className="chevron" style={{ color: '#555555', fontSize: '11px' }}>▼</span>
					</summary>
					{runs.length === 0 ? (
						<span className="px-6 py-5 block text-base text-text-secondary">—</span>
					) : (
						<table className="w-full text-sm table-fixed">
							<colgroup>
								<col style={{ width: '22%' }} />
								<col style={{ width: '27%' }} />
								<col style={{ width: '13%' }} />
								<col style={{ width: '13%' }} />
								<col style={{ width: '13%' }} />
								<col style={{ width: '12%' }} />
							</colgroup>
							<thead>
								<tr style={{ borderBottom: '1px solid #2A2A2A' }}>
									<th className="px-6 py-2 text-left font-medium tracking-wide" style={{ color: '#888888' }}>{dict.timestamp}</th>
									<th className="px-6 py-2 text-left font-medium tracking-wide" style={{ color: '#888888' }}>{dict.operation}</th>
									<th className="px-6 py-2 text-left font-medium tracking-wide" style={{ color: '#888888' }}>{dict.newPushed}</th>
									<th className="px-6 py-2 text-left font-medium tracking-wide" style={{ color: '#888888' }}>{dict.priceUpdates}</th>
									<th className="px-6 py-2 text-left font-medium tracking-wide" style={{ color: '#888888' }}>{dict.removedStale}</th>
									<th className="px-6 py-2 text-left font-medium tracking-wide" style={{ color: '#888888' }}>{dict.recentErrors}</th>
								</tr>
							</thead>
							<tbody>
								{runs.map((r, i) => (
									<tr key={i} className="row-hover" style={{ borderBottom: '1px solid #1A1A1A' }}>
										<td className="px-6 py-3 font-medium whitespace-nowrap">
											{new Date(r.timestamp).toLocaleString('en-CA', { timeZone: 'Asia/Tokyo', hour12: false })}
										</td>
										<td className="px-6 py-3 text-text-secondary">{r.operation ?? '—'}</td>
										<td className="px-6 py-3">{r.new_products_pushed ?? 0}</td>
										<td className="px-6 py-3">{r.price_updates ?? 0}</td>
										<td className="px-6 py-3">{r.removed_stale ?? 0}</td>
										<td className="px-6 py-3" style={{ color: r.errors?.length > 0 ? '#C8102E' : '#3ECF8E' }}>
											{r.errors?.length > 0 ? r.errors.length : dict.noErrors}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</details>
			</div>

			{/* Import Log */}
			<div style={{ border: '1px solid #2A2A2A' }}>
				<details>
					<summary className="px-6 py-4 cursor-pointer text-sm font-semibold tracking-wide uppercase select-none flex items-center justify-between" style={{ color: '#EDEDED', borderBottom: '1px solid #2A2A2A' }}>
						{dict.importLog} ({imports.length})
						<span className="chevron" style={{ color: '#555555', fontSize: '11px' }}>▼</span>
					</summary>
					{imports.length === 0 ? (
						<span className="px-6 py-5 block text-base text-text-secondary">—</span>
					) : (
						<table className="w-full text-sm table-fixed">
							<colgroup>
								<col style={{ width: '22%' }} />
								<col style={{ width: '40%' }} />
								<col style={{ width: '12%' }} />
								<col style={{ width: '26%' }} />
							</colgroup>
							<thead>
								<tr style={{ borderBottom: '1px solid #2A2A2A' }}>
									<th className="px-6 py-2 text-left font-medium tracking-wide" style={{ color: '#888888' }}>{dict.timestamp}</th>
									<th className="px-6 py-2 text-left font-medium tracking-wide" style={{ color: '#888888' }}>{dict.itemName}</th>
									<th className="px-6 py-2 text-left font-medium tracking-wide" style={{ color: '#888888' }}>{dict.itemStatus}</th>
									<th className="px-6 py-2 text-left font-medium tracking-wide" style={{ color: '#888888' }}>{dict.errorMsg}</th>
								</tr>
							</thead>
							<tbody>
								{imports.map((r, i) => (
									<tr key={i} className="row-hover" style={{ borderBottom: '1px solid #1A1A1A' }}>
										<td className="px-6 py-3 font-medium whitespace-nowrap">
											{new Date(r.timestamp).toLocaleString('en-CA', { timeZone: 'Asia/Tokyo', hour12: false })}
										</td>
										<td className="px-6 py-3 truncate">
											{r.item_url ? (
												<a href={r.item_url} target="_blank" rel="noreferrer" className="link-accent-hover">
													{r.item_name ?? '—'}
												</a>
											) : (r.item_name ?? '—')}
										</td>
										<td className="px-6 py-3 font-medium" style={{
											color: r.status === 'success' ? '#3ECF8E' : r.status === 'skipped' ? '#888888' : '#C8102E',
										}}>
											{r.status ?? '—'}
										</td>
										<td className="px-6 py-3 text-text-secondary truncate">{r.error_msg ?? '—'}</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</details>
			</div>

				</div> {/* end right logs */}
			</div> {/* end body */}
		</div>
	);
}
