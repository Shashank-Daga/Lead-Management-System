const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const authenticate = require("./middleware/authenticate");
const errorHandler = require("./middleware/errorHandler");

const authRoutes = require("./routes/auth.routes");
const leadRoutes = require("./routes/lead.routes");
const userRoutes = require("./routes/user.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const notificationRoutes = require("./routes/notification.routes");
const profileRoutes = require("./routes/profile.routes");

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Throttle auth endpoints specifically — brute-force protection without
// slowing down normal API usage elsewhere.
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
app.use("/api/auth/login", authLimiter);

// Profile writes accept the current password (password change), so throttle them per account: a stolen access token cannot be used to guess it.
// Keyed by user id (not IP) because the API sits behind a proxy.
const profileWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skip: (req) => req.method === "GET",
  keyGenerator: (req) => req.user.id,
});

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/leads", authenticate, leadRoutes);
app.use("/api/users", authenticate, userRoutes);
app.use("/api/dashboard", authenticate, dashboardRoutes);
app.use("/api/notifications", authenticate, notificationRoutes);
app.use("/api/profile", authenticate, profileWriteLimiter, profileRoutes);

app.use((req, res) => res.status(404).json({ error: { message: "Route not found." } }));
app.use(errorHandler);

module.exports = app;
