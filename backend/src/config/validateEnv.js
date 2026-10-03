// Fails fast on a misconfigured environment rather than starting successfully
// and only breaking on the first request (or, worse, the first login) with a
// stack trace that doesn't say what's actually missing.
const REQUIRED_VARS = ["DATABASE_URL", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"];

// Values developers might paste from an example file and forget to change —
// worth a hard failure outside development, not just a missing-var check.
const PLACEHOLDER_VALUES = new Set(["", "changeme", "change_me", "secret", "your-secret-here"]);

function validateEnv() {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key] || !process.env[key].trim());
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}. ` +
        "Copy backend/.env.example to backend/.env and fill these in before starting the server."
    );
  }

  if (process.env.NODE_ENV === "production") {
    for (const key of ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"]) {
      const value = process.env[key].trim().toLowerCase();
      if (PLACEHOLDER_VALUES.has(value) || process.env[key].length < 32) {
        throw new Error(
          `${key} looks like a placeholder or is too short (${process.env[key].length} chars, need 32+) ` +
            "for a production deployment. Generate a real secret, e.g.: " +
            `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
        );
      }
    }
    if (process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET) {
      throw new Error(
        "JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different values — " +
          "sharing one secret would let a refresh token double as an access token if the type check were ever bypassed."
      );
    }
  }
}

module.exports = { validateEnv };
