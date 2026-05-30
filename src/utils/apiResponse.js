/**
 * Send a standardised success response.
 *
 * @param {import('express').Response} res
 * @param {object} options
 * @param {number}  [options.statusCode=200]
 * @param {string}  [options.message='Success']
 * @param {*}       [options.data=null]
 * @param {object}  [options.meta]        - pagination, counts, etc.
 */
export const sendSuccess = (res, { statusCode = 200, message = 'Success', data = null, meta } = {}) => {
  const body = { status: 'success', message, data };
  if (meta !== undefined) body.meta = meta;
  return res.status(statusCode).json(body);
};

/**
 * Send a standardised error response.
 *
 * @param {import('express').Response} res
 * @param {object} options
 * @param {number}  [options.statusCode=500]
 * @param {string}  [options.message='Internal server error']
 * @param {*}       [options.errors=null]  - field-level validation errors, etc.
 */
export const sendError = (res, { statusCode = 500, message = 'Internal server error', errors = null } = {}) => {
  const body = { status: 'error', message };
  if (errors !== null) body.errors = errors;
  return res.status(statusCode).json(body);
};
