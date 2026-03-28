import { getLastTimestamp, getLastRunStatus, getLastRun, getPipelineState, getSuccessRate, getDataFreshness, getRacesScraped, getFailedUrls } from "../lib/scrapperController";

export default function ScraperMetric({ dict }) {
	const pipelineState = getPipelineState();
	const lastTimestamp = getLastTimestamp();
	const lastRunStatus = getLastRunStatus();
	const lastRun = getLastRun();
	const successRate = getSuccessRate();
	const dataFreshness = getDataFreshness();
	const racesScraped = getRacesScraped();
	const failedUrls = getFailedUrls();

	return (
		<div className="p-6 flex flex-col gap-3 flex-1" style={{backgroundColor: '#111111', border: '1px solid #2A2A2A'}}>
			<h2 className="text-sm font-semibold tracking-wide uppercase" style={{color: '#EDEDED'}}>{dict.scraperPipeline}</h2>

			<div className="flex flex-col gap-1">
				<div className="flex justify-between text-sm">
					<span className="text-text-secondary">{dict.pipelineState}</span>
					<span className="font-medium" style={{
						color: pipelineState === 'running' ? '#3ECF8E' : pipelineState === 'failed' ? '#C8102E' : '#F5A623'
					}}>{dict.pipelineStateValue[pipelineState] ?? pipelineState}</span>
				</div>
				<div className="flex justify-between text-sm">
					<span className="text-text-secondary">{dict.lastRun}</span>
					<span className="font-medium">{new Date(lastTimestamp).toLocaleString('en-CA', { timeZone: 'Asia/Shanghai', hour12: false })} (CST)</span>
				</div>
				<div className="flex justify-between text-sm">
					<span className="text-text-secondary">{dict.lastStatus}</span>
					<span className={lastRunStatus === "success" ? "text-success font-medium" : "text-accent font-medium"}>
						{lastRunStatus === "success" ? dict.success : `${dict.failed}${lastRun.error_msg ? ` — ${lastRun.error_msg}` : ''}`}
					</span>
				</div>
				<div className="flex justify-between text-sm">
					<span className="text-text-secondary">{dict.racesScraped}</span>
					<span className="font-medium" style={{color: racesScraped.belowThreshold ? '#F5A623' : '#EDEDED'}}>
						{racesScraped.count}{racesScraped.belowThreshold ? ` (${dict.belowThreshold})` : ''}
					</span>
				</div>
				<div className="flex justify-between text-sm">
					<span className="text-text-secondary">{dict.dataFreshness}</span>
					<span className="font-medium">{dataFreshness}</span>
				</div>
				<div className="flex justify-between text-sm">
					<span className="text-text-secondary">{dict.successRate30d}</span>
					<span className="font-medium">
						{successRate === null ? "—" : `${successRate.success}/${successRate.total} (${Math.round(successRate.success / successRate.total * 100)}%)`}
					</span>
				</div>
			</div>

			<div className="border-t border-border pt-3 flex flex-col gap-1">
				<span className="text-xs tracking-wide uppercase text-text-secondary">{dict.failedUrls}</span>
				{failedUrls.length === 0 ? (
					<span className="text-sm text-text-secondary">{dict.noFailedUrls}</span>
				) : failedUrls.map((url, i) => (
					<div key={i} className="text-sm text-accent truncate">{url}</div>
				))}
			</div>
		</div>
	);
}
