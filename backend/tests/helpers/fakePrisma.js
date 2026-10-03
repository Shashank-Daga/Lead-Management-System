// Installs a fake `config/prisma` module into require.cache so services can be
// exercised without a generated Prisma client or a database. Each test builds
// its own fake, then calls `load()` to get freshly-required service modules
// bound to it.
const path = require("node:path");

const PRISMA_PATH = require.resolve("../../src/config/prisma");
const SRC = path.resolve(__dirname, "../../src");

function installFakePrisma(fake) {
  // Drop cached service modules so they re-bind to the fake.
  for (const key of Object.keys(require.cache)) {
    if (key.startsWith(SRC)) delete require.cache[key];
  }
  require.cache[PRISMA_PATH] = {
    id: PRISMA_PATH,
    filename: PRISMA_PATH,
    loaded: true,
    exports: fake,
  };
}

function makeUser(overrides = {}) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    organizationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    roleKey: "EXECUTIVE",
    permissions: new Set(),
    ...overrides,
  };
}

module.exports = { installFakePrisma, makeUser };
