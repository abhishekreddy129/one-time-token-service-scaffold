// test.js
// Prove the service is single-use under concurrent Redis consumers.

import { issueToken, consumeToken, closeRedis } from "./token-service.js";
import assert from "node:assert/strict";

async function main() {
  try {
    const id = await issueToken({ userId: 42 }, 60);
    console.log("issued token:", id);

    const results = await Promise.all([
      consumeToken(id),
      consumeToken(id),
      consumeToken(id),
      consumeToken(id),
      consumeToken(id),
    ]);

    const successfulResults = results.filter((result) => result.ok);
    const winners = results.filter((result) => result.ok).length;
    assert.equal(winners, 1, "exactly one consumer must win");
    assert.deepEqual(successfulResults[0], { ok: true, payload: { userId: 42 } });
    assert.equal(results.filter((result) => !result.ok && result.reason === "invalid").length, 4);
    assert.deepEqual(await consumeToken(id), { ok: false, reason: "invalid" });

    console.log("winners:", winners);
    console.log("PASS: token was single-use.");
  } finally {
    await closeRedis();
  }
}

main().catch((error) => {
  console.error("FAIL: token service test failed.", error);
  process.exitCode = 1;
});
