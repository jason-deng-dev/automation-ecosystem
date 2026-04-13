import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { createClient } from "redis";

const redisClient = createClient({ url: process.env.REDIS_URL });

redisClient.connect().catch((err) => {
	console.error("[rate-limit] Redis connection failed:", err);
});

export const productRequestLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 100,
	standardHeaders: "draft-8",
	legacyHeaders: false,
	store: new RedisStore({
		sendCommand: (...args: string[]) => redisClient.sendCommand(args),
	}),
	message: { success: false, error: "Too many requests — try again in 15 minutes." },
});
