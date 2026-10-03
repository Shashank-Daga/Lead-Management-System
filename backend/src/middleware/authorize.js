const { ApiError } = require("../utils/http");

/**
 * Route guard factory: `authorize(PERMISSIONS.LEAD_CREATE)`.
 *
 * This is the server-side enforcement the spec calls out explicitly — the
 * frontend may hide a "Create Lead" button, but a request that reaches this
 * middleware without the matching permission is always rejected here,
 * regardless of what the UI allowed the user to click.
 *
 * Pass multiple keys to require ANY one of them (useful where either a
 * "scoped" or "assigned" variant of a permission should pass), e.g.
 * `authorize(PERMISSIONS.LEAD_EDIT_SCOPED, PERMISSIONS.LEAD_EDIT_ASSIGNED)`.
 */
function authorize(...anyOfPermissionKeys) {
  return (req, res, next) => {
    const has = anyOfPermissionKeys.some((key) => req.user.permissions.has(key));
    if (!has) {
      return next(new ApiError(403, "You do not have permission to perform this action."));
    }
    next();
  };
}

module.exports = authorize;
