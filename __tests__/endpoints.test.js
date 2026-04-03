const request = require("supertest");

jest.mock("../src/queue", () => ({
  queue: {
    add: jest.fn(),
    getJob: jest.fn(),
  },
}));

const { queue } = require("../src/queue");
const app = require("../src/app");

const FUTURE = new Date(Date.now() + 60_000).toISOString();

beforeEach(() => jest.clearAllMocks());

describe("POST /", () => {
  it("returns 400 when deliver_at is missing", async () => {
    const res = await request(app).post("/").send({ payload: { text: "hi" } });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/deliver_at/);
  });

  it("returns 400 when payload is missing", async () => {
    const res = await request(app).post("/").send({ deliver_at: FUTURE });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/payload/);
  });

  it("returns 400 when deliver_at is in the past", async () => {
    const past = new Date(Date.now() - 1000).toISOString();
    const res = await request(app).post("/").send({ deliver_at: past, payload: { text: "hi" } });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/future/);
  });

  it("returns 400 when deliver_at is not a valid date", async () => {
    const res = await request(app).post("/").send({ deliver_at: "not-a-date", payload: { text: "hi" } });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/future/);
  });

  it("schedules a job and returns job_id", async () => {
    queue.add.mockResolvedValue({ id: "42" });

    const res = await request(app).post("/").send({
      deliver_at: FUTURE,
      channel: "notifications",
      payload: { chat_id: 123, text: "hello" },
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ job_id: "42" });
    expect(queue.add).toHaveBeenCalledWith(
      "notify",
      { channel: "notifications", payload: { chat_id: 123, text: "hello" } },
      expect.objectContaining({ delay: expect.any(Number) })
    );
  });

  it("defaults channel to 'notifications' when omitted", async () => {
    queue.add.mockResolvedValue({ id: "7" });

    await request(app).post("/").send({ deliver_at: FUTURE, payload: { text: "hi" } });

    expect(queue.add).toHaveBeenCalledWith(
      "notify",
      expect.objectContaining({ channel: "notifications" }),
      expect.any(Object)
    );
  });
});

describe("GET /:job_id", () => {
  it("returns 404 when job does not exist", async () => {
    queue.getJob.mockResolvedValue(null);

    const res = await request(app).get("/999");
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/);
  });

  it("returns job details when job exists", async () => {
    const now = Date.now();
    const delay = 60_000;
    const mockJob = {
      id: "42",
      getState: jest.fn().mockResolvedValue("delayed"),
      data: { channel: "notifications", payload: { chat_id: 123, text: "hello" } },
      opts: { delay },
      timestamp: now,
    };
    queue.getJob.mockResolvedValue(mockJob);

    const res = await request(app).get("/42");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      job_id: "42",
      state: "delayed",
      data: mockJob.data,
      delay,
      created_at: new Date(now).toISOString(),
      process_at: new Date(now + delay).toISOString(),
    });
  });
});
