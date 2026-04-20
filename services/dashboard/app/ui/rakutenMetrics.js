import { getRakutenMetrics } from '../lib/rakutenController';
import RakutenTriggerButton from './RakutenTriggerButton';

export default async function RakutenMetric({ dict }) {
	const { totalCached, totalPushed, lastUpdated, categories, lastRun, pipelineState } = await getRakutenMetrics();

	const hasErrors = lastRun?.errors?.length > 0;

	return (
		<div className="p-8 flex flex-col gap-6 flex-1" style={{ backgroundColor: '#111111', border: '1px solid #2A2A2A' }}>
			<h2 className="text-base font-semibold tracking-wide uppercase" style={{ color: '#EDEDED' }}>
				{dict.rakutenPipeline}
			</h2>

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
					<span className="text-text-secondary">{dict.catalogSize}</span>
					<span className="font-medium">{totalCached.toLocaleString()}</span>
				</div>
				<div className="flex justify-between text-base">
					<span className="text-text-secondary">{dict.wcLive}</span>
					<span className="font-medium">{totalPushed.toLocaleString()}</span>
				</div>
				<div className="flex justify-between text-base">
					<span className="text-text-secondary">{dict.lastSync}</span>
					<span className="font-medium">
						{lastRun
							? new Date(lastRun.createdAt).toLocaleString('en-CA', { timeZone: 'Asia/Tokyo', hour12: false }) + ' (JST)'
							: lastUpdated
								? new Date(lastUpdated).toLocaleString('en-CA', { timeZone: 'Asia/Tokyo', hour12: false }) + ' (JST)'
								: '—'}
					</span>
				</div>
				<div className="flex justify-between text-base">
					<span className="text-text-secondary">{dict.lastOperation}</span>
					<span className="font-medium">{lastRun?.operation ?? '—'}</span>
				</div>
				<div className="flex justify-between text-base">
					<span className="text-text-secondary">{dict.newPushed}</span>
					<span className="font-medium">{lastRun ? lastRun.newPushed : '—'}</span>
				</div>
				{hasErrors && (
					<div className="flex justify-between text-base">
						<span className="text-text-secondary">{dict.recentErrors}</span>
						<span className="font-medium text-accent">{lastRun.errors.length}</span>
					</div>
				)}
			</div>

			<div className="border-t border-border pt-5 flex flex-col gap-3">
				<span className="text-xs tracking-wide uppercase text-text-secondary">{dict.byCategory}</span>
				{categories.length === 0 ? (
					<span className="text-base text-text-secondary">—</span>
				) : (
					categories.map((cat) => (
						<div key={cat.category_name} className="flex justify-between text-base gap-2">
							<span className="text-text-secondary">
								{dict.categoryName?.[cat.category_name] ?? cat.category_name ?? '—'}
								<span className="ml-2 text-xs" style={{ color: '#555555' }}>({cat.subcategory_count} {dict.subcategories})</span>
							</span>
							<span className="font-medium shrink-0">
								{Number(cat.pushed)}/{Number(cat.total)}
							</span>
						</div>
					))
				)}
			</div>

			<RakutenTriggerButton dict={dict} />
		</div>
	);
}
