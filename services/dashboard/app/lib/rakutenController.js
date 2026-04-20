import { rakutenPool, ecosystemPool } from './db/pool.js';

export async function getRakutenMetrics() {
	const [totalsRes, categoryRes, lastRunRes, pipelineStateRes] = await Promise.all([
		rakutenPool.query(
			`SELECT total_cached, total_pushed, last_updated FROM product_stats WHERE id = 1`
		),
		rakutenPool.query(`
			SELECT c.name AS category_name, COUNT(*) AS total, COUNT(p.wc_product_id) AS pushed
			FROM products p
			JOIN subcategories s ON p.subcategory_id = s.id
			JOIN categories c ON s.category_id = c.id
			GROUP BY c.name
			ORDER BY c.name
		`),
		rakutenPool.query(
			`SELECT operation, new_products_pushed, errors, timestamp FROM run_logs ORDER BY timestamp DESC LIMIT 1`
		),
		ecosystemPool.query(`SELECT state FROM pipeline_state WHERE service = 'rakuten'`),
	]);

	const stats = totalsRes.rows[0] ?? null;
	const categories = categoryRes.rows;
	const lastRunRow = lastRunRes.rows[0] ?? null;
	const lastRun = lastRunRow ? {
		operation: lastRunRow.operation,
		newPushed: Number(lastRunRow.new_products_pushed ?? 0),
		errors: lastRunRow.errors ?? [],
		createdAt: lastRunRow.timestamp,
	} : null;

	const pipelineState = pipelineStateRes.rows[0]?.state ?? 'idle';

	return {
		totalCached: Number(stats?.total_cached ?? 0),
		totalPushed: Number(stats?.total_pushed ?? 0),
		lastUpdated: stats?.last_updated ?? null,
		categories,
		lastRun,
		pipelineState,
	};
}
