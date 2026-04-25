"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.productRequestLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const rate_limit_redis_1 = require("rate-limit-redis");
const redis_1 = require("redis");
const redisClient = (0, redis_1.createClient)({ url: process.env.REDIS_URL });
redisClient.connect().catch((err) => {
    console.error("[rate-limit] Redis connection failed:", err);
});
exports.productRequestLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    store: new rate_limit_redis_1.RedisStore({
        sendCommand: (...args) => redisClient.sendCommand(args),
    }),
    message: { success: false, error: "Too many requests — try again in 15 minutes." },
});
