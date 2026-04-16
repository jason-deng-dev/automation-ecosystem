import 'dotenv/config';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';
const { Client } = pg;

const __dirname = dirname(fileURLToPath(import.meta.url));
const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');

// Default 7-day post schedule — mirrors the data-weighted rotation in the design doc.
// day: 0=Sun, 1=Mon ... 6=Sat (matches node-cron)
// time: HH:MM in Asia/Shanghai
const DEFAULT_SCHEDULE = [
	{ day: 1, time: '21:00', post_type: 'race' },
	{ day: 2, time: '21:00', post_type: 'nutritionSupplement' },
	{ day: 3, time: '21:00', post_type: 'training' },
	{ day: 4, time: '21:00', post_type: 'race' },
	{ day: 5, time: '21:00', post_type: 'race' },
	{ day: 6, time: '21:00', post_type: 'training' },
	{ day: 0, time: '21:00', post_type: 'wearable' },
];

async function seed() {
	const client = new Client({ connectionString: process.env.DATABASE_URL });
	await client.connect();

	console.log('Creating tables...');
	await client.query(schema);

	console.log('Seeding xhs_schedule...');
	// Wipe and re-seed so this script is idempotent
	await client.query(`DELETE FROM xhs_schedule`);
	for (const row of DEFAULT_SCHEDULE) {
		await client.query(
			`INSERT INTO xhs_schedule (day, time, post_type) VALUES ($1, $2, $3)`,
			[row.day, row.time, row.post_type],
		);
	}

	console.log('Seeding pipeline_state...');
	await client.query(`
		INSERT INTO pipeline_state (service, state)
		VALUES ('xhs', 'idle')
		ON CONFLICT (service) DO NOTHING
	`);

	await client.end();
	console.log('XHS seed complete.');
}

seed().catch((err) => {
	console.error('Seed failed:', err.message);
	process.exit(1);
});
