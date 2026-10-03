// Issue 6: startup should fail fast on missing/placeholder configuration
// rather than starting successfully and breaking on first use.
const test = require("node:test");
const assert = require("node:assert/strict");

const ENV_KEYS = ["DATABASE_URL", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET", "NODE_ENV"];

function withEnv(overrides, fn) {
  const saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const k of ENV_KEYS) delete process.env[k];
  Object.assign(process.env, overrides);
  try {
    delete require.cache[require.resolve("../src/config/validateEnv")];
    return fn(require("../src/config/validateEnv").validateEnv);
  } finally {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
}

const REAL_SECRET_A = "a".repeat(48);
const REAL_SECRET_B = "b".repeat(48);

test("validateEnv: throws listing every missing variable", () => {
  withEnv({ NODE_ENV: "development" }, (validateEnv) => {
    assert.throws(() => validateEnv(), /DATABASE_URL.*JWT_ACCESS_SECRET.*JWT_REFRESH_SECRET/s);
  });
});

test("validateEnv: passes in development with any non-empty values", () => {
  withEnv(
    { NODE_ENV: "development", DATABASE_URL: "postgresql://x", JWT_ACCESS_SECRET: "dev", JWT_REFRESH_SECRET: "dev2" },
    (validateEnv) => assert.doesNotThrow(() => validateEnv())
  );
});

test("validateEnv: production rejects short/placeholder secrets", () => {
  withEnv(
    { NODE_ENV: "production", DATABASE_URL: "postgresql://x", JWT_ACCESS_SECRET: "changeme", JWT_REFRESH_SECRET: REAL_SECRET_B },
    (validateEnv) => assert.throws(() => validateEnv(), /JWT_ACCESS_SECRET/)
  );
});

test("validateEnv: production rejects identical access/refresh secrets", () => {
  withEnv(
    { NODE_ENV: "production", DATABASE_URL: "postgresql://x", JWT_ACCESS_SECRET: REAL_SECRET_A, JWT_REFRESH_SECRET: REAL_SECRET_A },
    (validateEnv) => assert.throws(() => validateEnv(), /must be different/)
  );
});

test("validateEnv: production passes with two distinct, sufficiently long secrets", () => {
  withEnv(
    { NODE_ENV: "production", DATABASE_URL: "postgresql://x", JWT_ACCESS_SECRET: REAL_SECRET_A, JWT_REFRESH_SECRET: REAL_SECRET_B },
    (validateEnv) => assert.doesNotThrow(() => validateEnv())
  );
});
