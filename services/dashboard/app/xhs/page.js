import { ecosystemPool } from '@/app/lib/db/pool';
import XhsTriggerButton from '@/app/ui/XhsTriggerButton';
import XhsScheduleEditor from '@/app/ui/XhsScheduleEditor';
import XhsReAuthPanel from '@/app/ui/XhsReAuthPanel';
import en from '@/app/lib/locales/en';
import zh from '@/app/lib/locales/zh';

export default async function XhsPage() {
	const lang = process.env.NEXT_PUBLIC_LANG || 'en';
	const dict = lang === 'en' ? en : zh;

	const [scheduleRes, runLogsRes, archiveRes] = await Promise.all([
		ecosystemPool.query(`SELECT id, day, time, post_type FROM xhs_schedule ORDER BY day, time`),
		ecosystemPool.query(
			`SELECT published_at, post_type, outcome, error_stage, error_msg, input_tokens, output_tokens
			 FROM xhs_run_logs ORDER BY published_at DESC LIMIT 30`
		),
		ecosystemPool.query(
			`SELECT id, published_at, post_type, race_name, title, hook, contents, cta, hashtags
			 FROM xhs_post_archive WHERE published = true ORDER BY published_at DESC LIMIT 30`
		),
	]);

	const slots = scheduleRes.rows;
	const runs = runLogsRes.rows;
	const archive = archiveRes.rows;

	return (
		<div className="p-8 flex flex-col gap-8">

			{/* Header */}
			<div className="flex items-center justify-between">
				<h1 className="text-base font-semibold tracking-wide uppercase" style={{ color: '#EDEDED' }}>
					{dict.xhsPipeline}
				</h1>
			</div>

			{/* Body: 1/3 controls | 2/3 logs */}
			<div className="grid gap-8 items-start" style={{ gridTemplateColumns: '1fr 2fr' }}>

				{/* Left — controls */}
				<div className="flex flex-col gap-6">
					<XhsReAuthPanel dict={dict} />
					<XhsTriggerButton dict={dict} />
					<XhsScheduleEditor slots={slots} dict={dict} />
				</div>

				{/* Right — logs */}
				<div className="flex flex-col gap-8 min-w-0">

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
								<table className="w-full text-sm table-fixed">
									<colgroup>
										<col style={{ width: '22%' }} />
										<col style={{ width: '16%' }} />
										<col style={{ width: '12%' }} />
										<col style={{ width: '14%' }} />
										<col style={{ width: '24%' }} />
										<col style={{ width: '12%' }} />
									</colgroup>
									<thead>
										<tr style={{ borderBottom: '1px solid #2A2A2A' }}>
											<th className="px-4 py-2 text-left font-medium tracking-wide" style={{ color: '#888888' }}>{dict.timestamp}</th>
											<th className="px-4 py-2 text-left font-medium tracking-wide" style={{ color: '#888888' }}>{dict.postTypes}</th>
											<th className="px-4 py-2 text-left font-medium tracking-wide" style={{ color: '#888888' }}>{dict.outcome}</th>
											<th className="px-4 py-2 text-left font-medium tracking-wide" style={{ color: '#888888' }}>{dict.stage}</th>
											<th className="px-4 py-2 text-left font-medium tracking-wide" style={{ color: '#888888' }}>{dict.errorMsg}</th>
											<th className="px-4 py-2 text-left font-medium tracking-wide" style={{ color: '#888888' }}>{dict.tokens}</th>
										</tr>
									</thead>
									<tbody>
										{runs.map((r, i) => (
											<tr key={i} className="row-hover" style={{ borderBottom: '1px solid #1A1A1A' }}>
												<td className="px-4 py-3 font-medium whitespace-nowrap">
													{new Date(r.published_at).toLocaleString('en-CA', { timeZone: 'Asia/Shanghai', hour12: false })}
												</td>
												<td className="px-4 py-3 text-text-secondary">{dict.postType[r.post_type] ?? r.post_type}</td>
												<td className="px-4 py-3 font-medium" style={{ color: r.outcome === 'success' ? '#3ECF8E' : '#C8102E' }}>
													{r.outcome === 'success' ? dict.success : dict.failed}
												</td>
												<td className="px-4 py-3 text-text-secondary">{dict.errorStage[r.error_stage] ?? r.error_stage ?? '—'}</td>
												<td className="px-4 py-3 text-text-secondary truncate">{r.error_msg ?? '—'}</td>
												<td className="px-4 py-3 text-text-secondary">{r.input_tokens + r.output_tokens}</td>
											</tr>
										))}
									</tbody>
								</table>
							)}
						</details>
					</div>

					{/* Post Archive */}
					<div style={{ border: '1px solid #2A2A2A' }}>
						<details open>
							<summary className="px-6 py-4 cursor-pointer text-sm font-semibold tracking-wide uppercase select-none flex items-center justify-between" style={{ color: '#EDEDED', borderBottom: '1px solid #2A2A2A' }}>
								{dict.postArchive} ({archive.length})
								<span className="chevron" style={{ color: '#555555', fontSize: '11px' }}>▼</span>
							</summary>
							{archive.length === 0 ? (
								<span className="px-6 py-5 block text-base text-text-secondary">—</span>
							) : (
								<div className="flex flex-col">
									{archive.map((p, i) => (
										<details key={i} style={{ borderBottom: '1px solid #1A1A1A' }}>
											<summary className="px-6 py-3 cursor-pointer select-none flex items-center gap-4 row-hover list-none">
												<span className="text-xs whitespace-nowrap" style={{ color: '#555555' }}>
													{new Date(p.published_at).toLocaleString('en-CA', { timeZone: 'Asia/Shanghai', hour12: false })}
												</span>
												<span className="text-xs px-2 py-0.5 border" style={{ color: '#888888', borderColor: '#2A2A2A', flexShrink: 0 }}>
													{dict.postType[p.post_type] ?? p.post_type}
												</span>
												<span className="text-sm font-medium truncate" style={{ color: '#EDEDED' }}>{p.title}</span>
												<span className="chevron ml-auto flex-none" style={{ color: '#444444', fontSize: '10px' }}>▼</span>
											</summary>
											<div className="px-6 pb-5 pt-3 flex flex-col gap-3" style={{ backgroundColor: '#0D0D0D' }}>
												{p.race_name && (
													<div className="text-xs" style={{ color: '#555555' }}>{p.race_name}</div>
												)}
												<div className="text-sm" style={{ color: '#EDEDED' }}>{p.hook}</div>
												{Array.isArray(p.contents) && p.contents.map((s, j) => (
													<div key={j} className="flex flex-col gap-1">
														{s.subtitle && <div className="text-xs font-medium tracking-wide" style={{ color: '#888888' }}>{s.subtitle}</div>}
														<div className="text-sm" style={{ color: '#EDEDED' }}>{s.body}</div>
													</div>
												))}
												{p.hashtags?.length > 0 && (
													<div className="flex flex-wrap gap-1 pt-1">
														{p.hashtags.map((tag, j) => (
															<span key={j} className="text-xs" style={{ color: '#C8102E' }}>{tag}</span>
														))}
													</div>
												)}
											</div>
										</details>
									))}
								</div>
							)}
						</details>
					</div>

				</div>
			</div>
		</div>
	);
}
