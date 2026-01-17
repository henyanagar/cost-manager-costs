const express = require('express');
const path = require('path');
const pino = require('pino')();
const costRoutes = require('./routes/costRoute');
const requestLogger = require('./middlewares/logger');

const app = express();

/**
 * Middleware Setup
 */
// Use your custom Pino logger middleware (mandatory for every request)
app.use(requestLogger);

// Built-in Express middleware to parse JSON (replaces body-parser)
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

/**
 * Routes Setup
 */
// Mounting your cost-related routes
app.use('/api', costRoutes);

/**
 * Error Handling
 */
// Catch 404 and forward to error handler
app.use((req, res, next) => {
  res.status(404).json({
    id: "not_found",
    message: "The requested endpoint does not exist."
  });
});

// Final Error Handler (Requirement: JSON with id and message)
app.use((err, req, res, next) => {
  // Log the error using Pino
  pino.error(err);

  res.status(err.status || 500).json({
    id: "server_error",
    message: err.message || "An unexpected internal server error occurred."
  });
});

module.exports = app;