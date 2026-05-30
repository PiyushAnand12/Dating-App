/**
 * AppError — structured operational error for use in controllers,
 * services, and middleware. Caught and serialised by the global
 * error handler in app.js.
 *
 * @example
 * throw new AppError('User not found', 404, 'USER_NOT_FOUND');
 */
class AppError extends Error {
  /**
   * @param {string} message     - Human-readable error message
   * @param {number} statusCode  - HTTP status code (default 500)
   * @param {string} [errorCode] - Machine-readable error code for clients
   * @param {*}      [errors]    - Optional field-level or detail errors
   */
  constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR', errors = null) {
    super(message);

    this.name       = 'AppError';
    this.statusCode = statusCode;
    this.errorCode  = errorCode;
    this.errors     = errors;

    // Operational errors are expected, known failure states (not bugs).
    // The global error handler uses this to decide log level and response shape.
    this.isOperational = true;

    // Preserve clean stack trace (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export default AppError;
