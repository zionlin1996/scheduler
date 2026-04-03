# Scheduler

A lightweight internal job scheduling service for zycloud (CapRover). Accepts HTTP requests to schedule one-shot delayed notifications, then publishes them to a Redis Pub/Sub channel when due. Intended to be deployed as an internal-only CapRover app (not publicly exposed).

## How it works

1. A client app (e.g. professor-y) POSTs a job to `POST /schedule` with a `deliver_at` timestamp and an arbitrary `payload`
2. The scheduler enqueues the job in BullMQ (backed by Redis) with the appropriate delay
3. When the job fires, the BullMQ worker publishes the payload to a Redis Pub/Sub channel (`notifications`)
4. Client apps subscribe to `notifications` and handle delivery themselves (e.g. send a Telegram message)

## Project structure

```
index.js          ← entry point: Express server + BullMQ worker
src/
  queue.js        ← BullMQ queue and worker setup
  redis.js        ← shared ioredis connections
.env.example      ← supported environment variables
Dockerfile        ← production image
captain-definition← CapRover deployment config
```

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `REDIS_URL` | Yes | — | Redis connection URL (e.g. `redis://srv-captain--redis:6379`) |
| `PORT` | No | `80` | Express server port |

## Running locally

```sh
cp .env.example .env   # fill in REDIS_URL
yarn install
yarn dev
```

## API

### `POST /`

Schedule a one-shot notification.

**Request body:**
```json
{
  "deliver_at": "2026-04-03T18:00:00.000Z",
  "channel": "notifications",
  "payload": { "chat_id": 123456, "text": "Your reminder text" }
}
```

- `deliver_at` — ISO 8601 timestamp for when to fire
- `channel` — Redis Pub/Sub channel to publish to (default: `notifications`)
- `payload` — arbitrary JSON passed through to the subscriber

**Response:**
```json
{ "job_id": "1" }
```

## Pub/Sub contract

When a job fires, the worker publishes to the specified channel:
```json
{ "chat_id": 123456, "text": "Your reminder text" }
```

Subscribers receive raw JSON strings — parse before use.

## Deployment (CapRover)

- Deploy as a CapRover app with **"Do not expose as web app"** enabled — internal only
- Other CapRover apps reach it at `http://srv-captain--scheduler`
- Set `REDIS_URL=redis://srv-captain--redis:6379` as an app environment variable

## Adding a new client app

1. POST to `http://srv-captain--scheduler/schedule` with the payload your app expects
2. In your app, connect to Redis and `subscribe` to the `notifications` channel
3. On message, parse the JSON and handle delivery

## Git conventions

- Use **conventional commits** (`feat:`, `fix:`, `chore:`, `docs:`)
- **Never commit unless explicitly asked**
- **Always update CLAUDE.md** after any code change
