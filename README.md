# One-Time Token Service

A single-use token service backed by Redis. It stores JSON payloads for a limited
time and lets exactly one concurrent consumer retrieve each token.

`issueToken(payload, ttlSeconds)` generates a cryptographically random token ID
and stores the serialized payload with an expiration using one atomic Redis
`SET ... EX ... NX` command. `consumeToken(tokenId)` uses Redis `GETDEL` to read
and delete the value atomically. Separate `GET` and `DEL` commands are unsafe:
two concurrent consumers could both read the value before either deletes it.

## Setup and Test

Install dependencies, configure Redis, and run the concurrency test:

```bash
npm install
cp .env.example .env
docker start redis-m4
npm test
```

Set `REDIS_URL` in `.env` to your Redis connection URL. For a local Redis
container if `redis-m4` does not already exist:

```bash
docker run -d --name redis-m4 -p 6379:6379 redis:7-alpine
```

The test issues `{ userId: 42 }`, then sends five concurrent consumption
requests for that token and asserts that exactly one succeeds.

Observed test result:

```text
winners: 1
PASS: token was single-use.
```
