import test from "node:test";
import assert from "node:assert/strict";

import { parseBoolean, validateServerEnv } from "./env.mjs";

function withEnv(overrides, run) {
  const previous = new Map();
  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    run();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test("parseBoolean handles defaults and boolean-like values", () => {
  assert.equal(parseBoolean(undefined, true), true);
  assert.equal(parseBoolean(undefined, false), false);
  assert.equal(parseBoolean("true", false), true);
  assert.equal(parseBoolean("TRUE", false), true);
  assert.equal(parseBoolean("false", true), false);
});

test("validateServerEnv fails in production when DATABASE_URL is missing", () => {
  withEnv(
    {
      NODE_ENV: "production",
      DATABASE_URL: undefined,
      REQUIRE_CLERK_STRIPE_ENV: "false",
      BYPASS_AUTH: "false"
    },
    () => {
      assert.throws(() => validateServerEnv(), /DATABASE_URL is required/);
    }
  );
});

test("validateServerEnv fails when BYPASS_AUTH is true in production", () => {
  withEnv(
    {
      NODE_ENV: "production",
      DATABASE_URL: "postgres://example",
      REQUIRE_CLERK_STRIPE_ENV: "false",
      BYPASS_AUTH: "true"
    },
    () => {
      assert.throws(() => validateServerEnv(), /BYPASS_AUTH must be false in production/);
    }
  );
});

test("validateServerEnv passes minimum production config when billing env enforcement is off", () => {
  withEnv(
    {
      NODE_ENV: "production",
      DATABASE_URL: "postgres://example",
      REQUIRE_CLERK_STRIPE_ENV: "false",
      BYPASS_AUTH: "false",
      PUBLIC_APP_URL: "https://example.com"
    },
    () => {
      const result = validateServerEnv();
      assert.equal(result.isProduction, true);
      assert.equal(result.requireBillingAuth, false);
      assert.equal(result.publicAppUrl, "https://example.com");
    }
  );
});