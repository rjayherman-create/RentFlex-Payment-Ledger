import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function loadEnvFiles(rootDir) {
  const fileEnv = {};
  for (const fileName of [".env", ".env.local"]) {
    const filePath = join(rootDir, fileName);
    if (!existsSync(filePath)) continue;
    const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) continue;
      const key = trimmed.slice(0, separatorIndex).trim();
      const rawValue = trimmed.slice(separatorIndex + 1).trim();
      fileEnv[key] = unquote(rawValue);
    }
  }
  for (const [key, value] of Object.entries(fileEnv)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function unquote(value) {
  if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

export function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value).toLowerCase() === "true";
}

export function validateServerEnv() {
  const errors = [];
  const isProduction = process.env.NODE_ENV === "production";
  const requireBillingAuth = parseBoolean(process.env.REQUIRE_CLERK_STRIPE_ENV, isProduction);

  if (!process.env.DATABASE_URL) {
    errors.push("DATABASE_URL is required.");
  }

  if (isProduction && parseBoolean(process.env.BYPASS_AUTH, false)) {
    errors.push("BYPASS_AUTH must be false in production.");
  }

  if (isProduction && !process.env.AUTH_SESSION_SECRET) {
    errors.push("AUTH_SESSION_SECRET is required in production.");
  }

  if (isProduction && requireBillingAuth) {
    if (!process.env.CLERK_SECRET_KEY) {
      errors.push("CLERK_SECRET_KEY is required when REQUIRE_CLERK_STRIPE_ENV=true in production.");
    }
    if (!process.env.STRIPE_SECRET_KEY) {
      errors.push("STRIPE_SECRET_KEY is required when REQUIRE_CLERK_STRIPE_ENV=true in production.");
    }
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      errors.push("STRIPE_WEBHOOK_SECRET is required when REQUIRE_CLERK_STRIPE_ENV=true in production.");
    }
    if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && !process.env.VITE_CLERK_PUBLISHABLE_KEY) {
      errors.push("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY or VITE_CLERK_PUBLISHABLE_KEY is required in production.");
    }
    if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && !process.env.VITE_STRIPE_PUBLISHABLE_KEY) {
      errors.push("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY or VITE_STRIPE_PUBLISHABLE_KEY is required in production.");
    }
  }

  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n- ${errors.join("\n- ")}`);
  }

  return {
    isProduction,
    requireBillingAuth,
    publicAppUrl: process.env.PUBLIC_APP_URL || process.env.APP_BASE_URL || "",
    launchCheckSecret: process.env.LAUNCH_CHECK_SECRET || "",
    sessionAuthSecret: process.env.AUTH_SESSION_SECRET || process.env.LAUNCH_CHECK_SECRET || "rentflex-dev-session-secret"
  };
}
