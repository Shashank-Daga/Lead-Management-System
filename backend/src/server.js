require("dotenv").config();
const { validateEnv } = require("./config/validateEnv");

try {
  validateEnv();
} catch (err) {
  // eslint-disable-next-line no-console
  console.error(`Startup configuration error: ${err.message}`);
  process.exit(1);
}

const app = require("./app");

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`LMS API listening on http://localhost:${PORT}`);
});
