// ============================================================================
// Lead status transition matrix (Section 11 of the spec).
//
//   NEW -> CONTACTED -> QUALIFIED -> PROPOSAL -> NEGOTIATION -> CONVERTED
//   any active stage -> ON_HOLD -> (back to the stage it was in)
//   any active stage -> LOST
//
// Kept as a plain data map so changing the workflow is a config edit, not a
// code change scattered across controllers.
// ============================================================================

const ACTIVE_STAGES = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION"];

const TRANSITIONS = {
  NEW: ["CONTACTED", "ON_HOLD", "LOST"],
  CONTACTED: ["QUALIFIED", "ON_HOLD", "LOST"],
  QUALIFIED: ["PROPOSAL", "ON_HOLD", "LOST"],
  PROPOSAL: ["NEGOTIATION", "ON_HOLD", "LOST"],
  NEGOTIATION: ["CONVERTED", "ON_HOLD", "LOST"],
  ON_HOLD: ACTIVE_STAGES,
  CONVERTED: [],
  LOST: [],
};

function isValidTransition(from, to, previousStatus = null) {
  if (from === to) return false;

  if (from === "ON_HOLD") {
    return Boolean(previousStatus) && previousStatus === to && ACTIVE_STAGES.includes(to);
  }

  if (to === "ON_HOLD") {
    return ACTIVE_STAGES.includes(from) && from !== "ON_HOLD";
  }

  return (TRANSITIONS[from] || []).includes(to);
}

module.exports = { TRANSITIONS, ACTIVE_STAGES, isValidTransition };
