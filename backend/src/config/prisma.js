// Single shared Prisma client instance. Importing this everywhere (instead of
// `new PrismaClient()` per-file) avoids exhausting the DB connection pool.
//
// The client is constructed lazily behind a Proxy rather than at module load
// time. `new PrismaClient()` throws immediately if `prisma generate` hasn't
// been run in the current environment — and because many service modules
// `require("./config/prisma")` purely as a side effect of importing the
// module (not because every exported function needs the DB), that throw was
// taking down pure-logic unit tests (e.g. status-transition or scope-matrix
// tests) that never touch the database at all. Deferring construction until
// the first actual property access (`prisma.lead.findMany`, etc.) means
// requiring this module is always safe; only genuine DB usage requires a
// generated client.
const { PrismaClient } = require("@prisma/client");

let client = null;

function getClient() {
  if (!client) {
    client = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
  }
  return client;
}

module.exports = new Proxy(
  {},
  {
    get(_target, prop) {
      const value = getClient()[prop];
      return typeof value === "function" ? value.bind(getClient()) : value;
    },
  }
);
