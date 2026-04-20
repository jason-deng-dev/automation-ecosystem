import { getScraperMetrics } from '../lib/scrapperController';
import ScraperTriggerButton from './ScraperTriggerButton';

export default async function ScraperMetric({ dict }) {
	const { lastRun, pipelineState, successRate, totalRaces, dataFreshness, racesScraped, nextScrape } = await getScraperMetrics();

	return (
		<div className="p-8 flex flex-col gap-6 flex-1" style={{ backgroundColor: '#111111', border: '1px solid #2A2A2A' }}>
			<h2 className="text-base font-semibold tracking-wide uppercase" style={{ color: '#EDEDED' }}>
				{dict.scraperPipeline}
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
					<span className="text-text-secondary">{dict.lastRun}</span>
					<span className="font-medium">
						{lastRun
							? new Date(lastRun.timestamp).toLocaleString('en-CA', { timeZone: 'Asia/Tokyo', hour12: false }) + ' (JST)'
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
								: `${dict.failed}${lastRun.error_msg ? ` — ${lastRun.error_msg}` : ''}`}
					</span>
				</div>
				<div className="flex justify-between text-base">
					<span className="text-text-secondary">{dict.totalRaces}</span>
					<span className="font-medium">{totalRaces}</span>
				</div>
				<div className="flex justify-between text-base">
					<span className="text-text-secondary">{dict.lastScraped}</span>
					<span className="font-medium" style={{ color: racesScraped.belowThreshold ? '#F5A623' : '#EDEDED' }}>
						{racesScraped.count}{racesScraped.belowThreshold ? ` (${dict.belowThreshold})` : ''}
					</span>
				</div>
				<div className="flex justify-between text-base">
					<span className="text-text-secondary">{dict.nextScrape}</span>
					<span className="font-medium">{nextScrape}</span>
				</div>
				<div className="flex justify-between text-base">
					<span className="text-text-secondary">{dict.dataFreshness}</span>
					<span className="font-medium">{dataFreshness}</span>
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

			<ScraperTriggerButton dict={dict} />
		</div>
	);
}
