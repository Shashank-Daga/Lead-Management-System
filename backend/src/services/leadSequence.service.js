/**
 * Produces the next Lead ID in the form "LD-000001".
 *
 * Uses a dedicated single-row counter table updated inside the caller's
 * transaction, rather than `COUNT(*) + 1` (which is unsafe under concurrent
 * inserts) or relying on the DB's auto-increment (which leaves gaps and
 * exposes row volume). Must be called with a Prisma transaction client (tx)
 * so the increment and the lead insert commit atomically.
 */
async function nextLeadCode(tx) {
  const counter = await tx.leadSequence.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", lastValue: 1 },
    update: { lastValue: { increment: 1 } },
  });

  return `LD-${String(counter.lastValue).padStart(6, "0")}`;
}

module.exports = { nextLeadCode };
