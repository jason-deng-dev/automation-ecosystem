import { rakutenPool } from './db/pool.js';

export async function getRakutenMetrics() {
	const [totalsRes, categoryRes, lastRunRes] = await Promise.all([
		rakutenPool.query(
			`SELECT total_cached, total_pushed, last_updated FROM product_stats WHERE id = 1`
		),
		rakutenPool.query(`
			SELECT c.name AS category_name, COUNT(*) AS total, COUNT(p.wc_product_id) AS pushed
			FROM products p
			LEFT JOIN subcategories s ON p.subcategory_id = s.id
			LEFT JOIN categories c ON s.category_id = c.id
			GROUP BY c.name
			ORDER BY c.name
		`),
		rakutenPool.query(
			`SELECT operation, new_products_pushed, created_at FROM run_logs ORDER BY created_at DESC LIMIT 1`
		),
	]);

	const stats = totalsRes.rows[0] ?? null;
	const categories = categoryRes.rows;
	const lastRun = lastRunRes.rows[0] ?? null;

	return {
		totalCached: Number(stats?.total_cached ?? 0),
		totalPushed: Number(stats?.total_pushed ?? 0),
		lastUpdated: stats?.last_updated ?? null,
		categories,
		lastRun,
	};
}
