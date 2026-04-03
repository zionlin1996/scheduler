const express = require("express");
const { queue } = require("./queue");

const app = express();
app.use(express.json());

app.post("/", async (req, res) => {
  const { deliver_at, channel = "notifications", payload } = req.body;

  if (!deliver_at || !payload) {
    return res.status(400).json({ error: "deliver_at and payload are required" });
  }

  const delay = new Date(deliver_at).getTime() - Date.now();
  if (isNaN(delay) || delay < 0) {
    return res.status(400).json({ error: "deliver_at must be a future ISO 8601 timestamp" });
  }

  const job = await queue.add("notify", { channel, payload }, { delay });
  console.log(`[scheduler] job ${job.id} scheduled in ${Math.round(delay / 1000)}s`);

  res.json({ job_id: job.id });
});

app.get("/:job_id", async (req, res) => {
  const job = await queue.getJob(req.params.job_id);
  if (!job) return res.status(404).json({ error: "job not found" });

  const state = await job.getState();
  res.json({
    job_id: job.id,
    state,
    data: job.data,
    delay: job.opts.delay,
    created_at: new Date(job.timestamp).toISOString(),
    process_at: new Date(job.timestamp + (job.opts.delay || 0)).toISOString(),
  });
});

module.exports = app;
