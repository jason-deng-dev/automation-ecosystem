import pg from 'pg';
const { Pool } = pg;

// Singleton pools — persist across Next.js hot reloads in dev
const g = globalThis;

export const ecosystemPool = g._ecosystemPool ?? (g._ecosystemPool = new Pool({
	connectionString: process.env.DATABASE_URL,
}));

export const rakutenPool = g._rakutenPool ?? (g._rakutenPool = new Pool({
	connectionString: process.env.RAKUTEN_DATABASE_URL,
}));
