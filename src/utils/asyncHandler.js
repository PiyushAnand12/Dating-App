/**
 * Wraps an async route handler and forwards any thrown errors
 * to Express's next(err) global error handler.
 *
 * @param {function} fn - async (req, res, next) => {}
 * @returns {function}
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
