import assert from "node:assert/strict";
import test from "node:test";

import { loadTsModule } from "./utils/load-ts-module.mjs";

const { normalizeAuthUser, resolveAuthProvider, toProfileSeed } = await loadTsModule(
  "lib/auth/providers/normalize.ts",
);

test("resolveAuthProvider prefers google when present", () => {
  assert.equal(
    resolveAuthProvider({
      id: "u1",
      app_metadata: { provider: "google" },
      user_metadata: {},
      identities: [{ provider: "email" }],
    }),
    "google",
  );
});

test("resolveAuthProvider treats non-google as email", () => {
  assert.equal(
    resolveAuthProvider({
      id: "u2",
      app_metadata: { provider: "email" },
      user_metadata: {},
      identities: [{ provider: "email" }],
    }),
    "email",
  );
});

test("normalizeAuthUser maps Google metadata to username + avatar", () => {
  const identity = normalizeAuthUser({
    id: "google-user",
    email: "seeker@gmail.com",
    app_metadata: { provider: "google" },
    user_metadata: {
      full_name: "Sword Seeker",
      avatar_url: "https://lh3.googleusercontent.com/a/photo",
    },
    identities: [{ provider: "google" }],
  });

  assert.deepEqual(identity, {
    provider: "google",
    userId: "google-user",
    email: "seeker@gmail.com",
    username: "Sword Seeker",
    avatarUrl: "https://lh3.googleusercontent.com/a/photo",
  });

  assert.deepEqual(toProfileSeed(identity), {
    id: "google-user",
    username: "Sword Seeker",
    avatar_url: "https://lh3.googleusercontent.com/a/photo",
  });
});

test("normalizeAuthUser prefers signup username for email provider", () => {
  const identity = normalizeAuthUser({
    id: "email-user",
    email: "you@example.com",
    app_metadata: { provider: "email" },
    user_metadata: { username: "SwordSeeker" },
    identities: [{ provider: "email" }],
  });

  assert.equal(identity.provider, "email");
  assert.equal(identity.username, "SwordSeeker");
  assert.equal(identity.avatarUrl, null);
});
