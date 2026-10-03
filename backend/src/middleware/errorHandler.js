const { ApiError } = require("../utils/http");

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: { message: err.message, details: err.details || undefined },
    });
  }

  // Zod validation errors
  if (err.name === "ZodError") {
    return res.status(422).json({
      error: { message: "Validation failed.", details: err.issues },
    });
  }

  // Prisma known request errors (e.g. unique constraint violations)
  if (err.code === "P2002") {
    return res.status(409).json({
      error: { message: `A record with this ${err.meta?.target?.join(", ")} already exists.` },
    });
  }

  console.error(err); // eslint-disable-line no-console
  return res.status(500).json({ error: { message: "Internal server error." } });
}

module.exports = errorHandler;
