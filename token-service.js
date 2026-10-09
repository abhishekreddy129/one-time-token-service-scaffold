// token-service.js
// A single-use, expiring token service backed by Redis.

import crypto from "node:crypto";
import Redis from "ioredis";
import "dotenv/config";

const redis = new Redis(process.env.REDIS_URL);

// Helper: build the Redis key for a token id.
const keyFor = (id) => "token:" + id;

/**
 * Issue a single-use token that expires after `ttlSeconds`.
 *
 * Generates a random id, stores the JSON payload with an atomic TTL, and
 * returns the token id string.
 *
 * @param {object} payload      Any JSON-serialisable data (e.g. { userId: 42 }).
 * @param {number} ttlSeconds   Seconds until the token expires.
 * @returns {Promise<string>}   The token id to hand to the user.
 */
export async function issueToken(payload, ttlSeconds) {
  if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds <= 0) {
    throw new RangeError("ttlSeconds must be a positive safe integer");
  }

  const value = JSON.stringify(payload);
  if (value === undefined) {
    throw new TypeError("payload must be JSON-serializable");
  }

  const id = crypto.randomBytes(16).toString("hex");
  const stored = await redis.set(keyFor(id), value, "EX", ttlSeconds, "NX");
  if (stored !== "OK") {
    throw new Error("Token could not be stored");
  }

  return id;
}

/**
 * Consume a token exactly once.
 *
 * Reads and deletes the token atomically, returning its parsed payload or an
 * invalid result if it is missing or malformed.
 *
 * @param {string} tokenId
 * @returns {Promise<{ ok: true, payload: object } | { ok: false, reason: string }>}
 */
export async function consumeToken(tokenId) {
  if (typeof tokenId !== "string" || !/^[a-f0-9]{32}$/.test(tokenId)) {
    return { ok: false, reason: "invalid" };
  }

  const value = await redis.getdel(keyFor(tokenId));
  if (value === null) {
    return { ok: false, reason: "invalid" };
  }

  try {
    return { ok: true, payload: JSON.parse(value) };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}

// Allow other files to close the connection cleanly (used by test.js).
export function closeRedis() {
  return redis.quit();
}
