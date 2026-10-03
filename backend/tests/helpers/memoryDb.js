// A small in-memory stand-in for the Prisma client, just capable enough to run
// the real services and Express routes end to end without PostgreSQL.
//
// It implements the operations this app actually uses (findFirst/findUnique/
// findMany/count/create/update/updateMany/delete/upsert/groupBy/$transaction),
// a where-evaluator (equality, in, notIn, contains, lt/lte/gt/gte, not, OR,
// AND, nested relation filters) and `include`/`select` projection.
//
// It is NOT a substitute for the real database: it cannot prove SQL, indexes
// or migrations. It does prove that the *queries and authorization decisions
// the services make* keep tenants and users apart.
const crypto = require("node:crypto");

// model -> { relationName: [targetModel, foreignKeyOnThisModel] }
const RELATIONS = {
  lead: {
    currentAssignee: ["users", "currentAssigneeId"],
    createdBy: ["users", "createdById"],
  },
  leadNote: { author: ["users", "authorId"], lead: ["lead", "leadId"] },
  followUp: { owner: ["users", "ownerId"], lead: ["lead", "leadId"] },
  leadHistory: { actor: ["users", "actorId"] },
  users: { manager: ["users", "managerId"] },
};

function createMemoryDb() {
  const tables = {
    users: [],
    lead: [],
    leadNote: [],
    followUp: [],
    leadHistory: [],
    assignmentHistory: [],
    notification: [],
    leadSequence: [],
    role: [],
  };
  const db = { tables };

  const isObj = (v) => v !== null && typeof v === "object" && !(v instanceof Date) && !Array.isArray(v);
  const cmp = (a, b) => (a instanceof Date || b instanceof Date ? new Date(a) - new Date(b) : a < b ? -1 : a > b ? 1 : 0);

  function matchesField(model, row, key, cond) {
    if (RELATIONS[model]?.[key] || key === "role") {
      const rel = key === "role" ? ["role", null] : RELATIONS[model][key];
      const related = key === "role" ? row.role : findOne(rel[0], row[rel[1]]);
      const sub = isObj(cond) && cond.is ? cond.is : cond;
      return related ? matches(rel[0], related, sub) : false;
    }
    const value = row[key];
    if (!isObj(cond)) return value === cond;
    return Object.entries(cond).every(([op, arg]) => {
      switch (op) {
        case "in": return arg.includes(value);
        case "notIn": return !arg.includes(value);
        case "not": return isObj(arg) ? !matchesField(model, row, key, arg) : value !== arg;
        case "contains": return typeof value === "string" && value.toLowerCase().includes(String(arg).toLowerCase());
        case "mode": return true;
        case "lt": return value != null && cmp(value, arg) < 0;
        case "lte": return value != null && cmp(value, arg) <= 0;
        case "gt": return value != null && cmp(value, arg) > 0;
        case "gte": return value != null && cmp(value, arg) >= 0;
        case "equals": return value === arg;
        default: throw new Error(`memoryDb: unsupported operator ${op}`);
      }
    });
  }

  function matches(model, row, where = {}) {
    return Object.entries(where).every(([key, cond]) => {
      if (cond === undefined) return true;
      if (key === "OR") return cond.some((w) => matches(model, row, w));
      if (key === "AND") return (Array.isArray(cond) ? cond : [cond]).every((w) => matches(model, row, w));
      return matchesField(model, row, key, cond);
    });
  }

  const findOne = (model, id) => tables[model].find((r) => r.id === id) || null;

  function project(model, row, { include, select } = {}) {
    if (!row) return row;
    let out = { ...row };
    if (include) {
      for (const [rel, opts] of Object.entries(include)) {
        const def = RELATIONS[model]?.[rel];
        if (!def) continue;
        const related = findOne(def[0], row[def[1]]);
        out[rel] = related ? project(def[0], related, isObj(opts) ? opts : {}) : null;
      }
    }
    if (select) {
      const picked = {};
      for (const [k, v] of Object.entries(select)) {
        if (!v) continue;
        const def = RELATIONS[model]?.[k];
        if (def && isObj(v)) {
          const related = findOne(def[0], row[def[1]]);
          picked[k] = related ? project(def[0], related, v) : null;
        } else {
          picked[k] = out[k];
        }
      }
      out = picked;
    }
    return out;
  }

  function order(rows, orderBy) {
    if (!orderBy) return rows;
    const [[field, dir]] = Object.entries(Array.isArray(orderBy) ? orderBy[0] : orderBy);
    return [...rows].sort((a, b) => (dir === "desc" ? -1 : 1) * cmp(a[field] ?? "", b[field] ?? ""));
  }

  function delegate(model) {
    return {
      findFirst: async (args = {}) => project(model, order(tables[model].filter((r) => matches(model, r, args.where)), args.orderBy)[0] || null, args),
      findUnique: async (args) => project(model, tables[model].find((r) => matches(model, r, args.where)) || null, args),
      findMany: async (args = {}) => {
        let rows = order(tables[model].filter((r) => matches(model, r, args.where)), args.orderBy);
        if (args.skip) rows = rows.slice(args.skip);
        if (args.take !== undefined) rows = rows.slice(0, args.take);
        return rows.map((r) => project(model, r, args));
      },
      count: async (args = {}) => tables[model].filter((r) => matches(model, r, args.where)).length,
      create: async ({ data, ...rest }) => {
        const row = { id: crypto.randomUUID(), createdAt: new Date(), updatedAt: new Date(), ...data };
        if (model === "lead") Object.assign(row, { isDeleted: false, status: "NEW", priority: "MEDIUM", tags: [], ...data });
        if (model === "followUp") Object.assign(row, { status: "PENDING", ...data });
        tables[model].push(row);
        return project(model, row, rest);
      },
      update: async ({ where, data, ...rest }) => {
        const row = tables[model].find((r) => matches(model, r, where));
        if (!row) throw Object.assign(new Error("Record not found"), { code: "P2025" });
        for (const [k, v] of Object.entries(data)) if (v !== undefined) row[k] = isObj(v) && "increment" in v ? row[k] + v.increment : v;
        row.updatedAt = new Date();
        return project(model, row, rest);
      },
      updateMany: async ({ where, data }) => {
        const rows = tables[model].filter((r) => matches(model, r, where));
        rows.forEach((r) => Object.assign(r, data));
        return { count: rows.length };
      },
      delete: async ({ where }) => {
        const i = tables[model].findIndex((r) => matches(model, r, where));
        if (i < 0) throw Object.assign(new Error("Record not found"), { code: "P2025" });
        return tables[model].splice(i, 1)[0];
      },
      upsert: async ({ where, create, update }) => {
        const row = tables[model].find((r) => matches(model, r, where));
        if (row) {
          for (const [k, v] of Object.entries(update)) row[k] = isObj(v) && "increment" in v ? row[k] + v.increment : v;
          return row;
        }
        const created = { ...create };
        tables[model].push(created);
        return created;
      },
      groupBy: async ({ by, where }) => {
        const groups = new Map();
        tables[model].filter((r) => matches(model, r, where)).forEach((r) => {
          const k = by.map((f) => r[f]).join("|");
          const g = groups.get(k) || { ...Object.fromEntries(by.map((f) => [f, r[f]])), _count: { _all: 0 } };
          g._count._all += 1;
          groups.set(k, g);
        });
        return [...groups.values()];
      },
    };
  }

  for (const model of Object.keys(tables)) db[model] = delegate(model);
  db.role.findUnique = async ({ where }) => tables.role.find((r) => matches("role", r, where)) || null;
  // Transactions: run the callback against the same store. Rolling back is
  // emulated by restoring a snapshot if the callback throws.
  db.$transaction = async (fn) => {
    const snapshot = JSON.stringify(tables, (k, v) => (v instanceof Date ? { $d: v.toISOString() } : v));
    try {
      return await fn(db);
    } catch (err) {
      const restored = JSON.parse(snapshot, (k, v) => (v && v.$d ? new Date(v.$d) : v));
      for (const m of Object.keys(tables)) tables[m].splice(0, tables[m].length, ...restored[m]);
      throw err;
    }
  };
  return db;
}

module.exports = { createMemoryDb };
