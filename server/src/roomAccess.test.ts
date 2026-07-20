import assert from "node:assert/strict";
import test from "node:test";
import { canJoinRoom } from "./roomAccess.js";

test("allows first-time access to a new room", () => {
  const result = canJoinRoom(undefined, "secret-room");
  assert.equal(result.allowed, true);
  assert.equal(result.createRoom, true);
});

test("rejects access when a room password does not match", () => {
  const result = canJoinRoom("correct-password", "wrong-password");
  assert.equal(result.allowed, false);
  assert.equal(result.error, "Incorrect room password");
});

test("allows access when the correct password is supplied", () => {
  const result = canJoinRoom("correct-password", "correct-password");
  assert.equal(result.allowed, true);
  assert.equal(result.createRoom, false);
});
