import assert from "node:assert/strict";
import test from "node:test";
import { resolveExecutionBackend } from "./codeRunner";

test("prefers the Piston service URL in container environments", () => {
  const backend = resolveExecutionBackend({
    PISTON_API_URL: "http://piston:2000",
    DOCKER_CONTAINER: "true",
  });

  assert.equal(backend, "http://piston:2000");
});

test("falls back to localhost when no Piston URL is provided", () => {
  const backend = resolveExecutionBackend({});

  assert.equal(backend, "http://localhost:2000");
});
