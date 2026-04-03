const Redis = require("ioredis");

// @todo: make Redis connection configurable via env var
const redisConfig = {
  host: "srv-captain--redis",
  port: 6379,
  password: process.env.REDIS_PASSWORD,
};

// Separate connections required — a subscriber connection cannot issue other commands
const publisher = new Redis(redisConfig);
const subscriber = new Redis(redisConfig);

// BullMQ requires its own connection
const bullConnection = { ...redisConfig };

module.exports = { publisher, subscriber, bullConnection };
