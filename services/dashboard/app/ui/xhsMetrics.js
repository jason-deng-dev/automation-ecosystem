import { getXhsMetrics } from '../lib/xhsController';

function timeUntil(slot) {
	const now = new Date();
	const slotDate = new Date();
	const daysUntil = (slot.day - now.getDay() + 7) % 7;
	slotDate.setDate(slotDate.getDate() + daysUntil);
	const [h, m] = slot.time.split(':');
	slotDate.setHours(Number(h), Number(m), 0, 0);
	const ms = slotDate - now;
	const hours = Math.floor(ms / (1000 * 60 * 60));
	const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
	return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

export default async function XhsMetric({ dict }) {
	const { lastRun, pipelineState, successRate, errorCountByType, tokenTotals, postTypeDistribution, upcomingPost, pendingCount, overdueCount } = await getXhsMetrics();

	return (
		<div className="p-8 flex flex-col gap-6 flex-1" style={{ backgroundColor: '#111111', border: '1px solid #2A2A2A' }}>
			<h2 className="text-base font-semibold tracking-wide uppercase" style={{ color: '#EDEDED' }}>
				{dict.xhsPipeline}
			</h2>

			{pendingCount > 0 && (
				<a href="/xhs" style={{
					display: 'flex', alignItems: 'center', gap: '8px',
					padding: '8px 12px', border: '1px solid',
					borderColor: overdueCount > 0 ? '#C8102E' : '#F5A623',
					backgroundColor: overdueCount > 0 ? 'rgba(200,16,46,0.06)' : 'rgba(245,166,35,0.06)',
					textDecoration: 'none',
				}}>
					<span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: overdueCount > 0 ? '#C8102E' : '#F5A623', flexShrink: 0 }} />
					<span style={{ fontSize: '12px', fontWeight: 600, color: overdueCount > 0 ? '#C8102E' : '#F5A623' }}>
						{pendingCount} pending{overdueCount > 0 ? ` · ${overdueCount} overdue` : ''}
					</span>
				</a>
			)}

			<div className="flex flex-col gap-3">
				<div className="flex justify-between text-base">
					<span className="text-text-secondary">{dict.pipelineState}</span>
					<span className="font-medium" style={{
						color: pipelineState === 'running' ? '#3ECF8E' : pipelineState === 'failed' ? '#C8102E' : '#F5A623',
					}}>
						{dict.pipelineStateValue[pipelineState] ?? pipelineState}
					</span>
				</div>
<div className="flex justify-between text-base">
					<span className="text-text-secondary">{dict.lastRun}</span>
					<span className="font-medium">
						{lastRun
							? new Date(lastRun.timestamp).toLocaleString('en-CA', { timeZone: 'Asia/Shanghai', hour12: false }) + ' (CST)'
							: '—'}
					</span>
				</div>
				<div className="flex justify-between text-base">
					<span className="text-text-secondary">{dict.lastStatus}</span>
					<span className={lastRun?.outcome === 'success' ? 'text-success font-medium' : 'text-accent font-medium'}>
						{!lastRun
							? '—'
							: lastRun.outcome === 'success'
								? dict.success
								: `${dict.failed} — ${dict.errorStage[lastRun.errorStage] ?? lastRun.errorStage}`}
					</span>
				</div>
				<div className="flex justify-between text-base">
					<span className="text-text-secondary">{dict.nextPost}</span>
					<span className="font-medium">
						{upcomingPost
							? `${dict.days[upcomingPost.day]} ${upcomingPost.time} — ${dict.postType[upcomingPost.type] ?? upcomingPost.type} (in ${timeUntil(upcomingPost)})`
							: '—'}
					</span>
				</div>
				<div className="flex justify-between text-base">
					<span className="text-text-secondary">{dict.successRate30d}</span>
					<span className="font-medium">
						{successRate === null
							? '—'
							: `${successRate.success}/${successRate.total} (${Math.round((successRate.success / successRate.total) * 100)}%)`}
					</span>
				</div>
			</div>

			<div className="border-t border-border pt-5 flex flex-col gap-3">
				<span className="text-xs tracking-wide uppercase text-text-secondary">{dict.errorsByType}</span>
				{Object.keys(errorCountByType).length === 0 ? (
					<span className="text-base text-text-secondary">—</span>
				) : (
					Object.entries(errorCountByType).map(([type, count]) => (
						<div key={type} className="flex justify-between text-base">
							<span className="text-text-secondary">{dict.errorStage[type] ?? type}</span>
							<span className="font-medium text-accent">{count}</span>
						</div>
					))
				)}
			</div>

			<div className="border-t border-border pt-5 flex flex-col gap-3">
				<span className="text-xs tracking-wide uppercase text-text-secondary">{dict.postTypes}</span>
				{Object.keys(postTypeDistribution).length === 0 ? (
					<span className="text-base text-text-secondary">—</span>
				) : (
					Object.entries(postTypeDistribution).map(([type, count]) => (
						<div key={type} className="flex justify-between text-base">
							<span className="text-text-secondary">{dict.postType[type] ?? type}</span>
							<span className="font-medium">{count}</span>
						</div>
					))
				)}
			</div>

			<div className="border-t border-border pt-5 flex flex-col gap-3">
				<span className="text-xs tracking-wide uppercase text-text-secondary">{dict.apiTokens}</span>
				<div className="flex justify-between text-base">
					<span className="text-text-secondary">{dict.input}</span>
					<span className="font-medium">{tokenTotals.input.toLocaleString()}</span>
				</div>
				<div className="flex justify-between text-base">
					<span className="text-text-secondary">{dict.output}</span>
					<span className="font-medium">{tokenTotals.output.toLocaleString()}</span>
				</div>
			</div>
		</div>
	);
}
