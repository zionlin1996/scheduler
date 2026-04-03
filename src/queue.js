const { Queue, Worker } = require("bullmq");
const { publisher, bullConnection } = require("./redis");

const QUEUE_NAME = "scheduler";

const queue = new Queue(QUEUE_NAME, { connection: bullConnection });

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    const { channel = "notifications", payload } = job.data;
    await publisher.publish(channel, JSON.stringify(payload));
    console.log(`[worker] fired job ${job.id} → channel "${channel}"`);
  },
  { connection: bullConnection }
);

worker.on("failed", (job, err) => {
  console.error(`[worker] job ${job.id} failed:`, err.message);
});

module.exports = { queue };
