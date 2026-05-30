import AppError from '../utils/AppError.js';

const allowedTargets = new Set(['body', 'query', 'params']);

const isZodSchema = (schema) => typeof schema?.safeParse === 'function';
const isJoiSchema = (schema) => typeof schema?.validate === 'function';

/**
 * Validate request data against a Zod or Joi schema.
 *
 * @param {object} schema
 * @param {'body' | 'query' | 'params'} [target='body']
 */
const validate = (schema, target = 'body') => (req, _res, next) => {
  if (!allowedTargets.has(target)) {
    return next(
      new AppError(
        `Invalid validation target: ${target}`,
        500,
        'INVALID_VALIDATION_TARGET'
      )
    );
  }

  const payload = req[target];

  if (isZodSchema(schema)) {
    const result = schema.safeParse(payload);

    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field:   e.path.join('.') || target,
        message: e.message,
      }));
      return next(
        new AppError('Validation failed', 422, 'VALIDATION_ERROR', errors)
      );
    }

    req[target] = result.data;
    return next();
  }

  if (isJoiSchema(schema)) {
    const { error, value } = schema.validate(payload, {
      abortEarly:    false,
      stripUnknown:  true,
    });

    if (error) {
      const errors = error.details.map((e) => ({
        field:   e.path.join('.') || target,
        message: e.message,
      }));
      return next(
        new AppError('Validation failed', 422, 'VALIDATION_ERROR', errors)
      );
    }

    req[target] = value;
    return next();
  }

  return next(
    new AppError(
      'Unsupported validation schema',
      500,
      'INVALID_VALIDATION_SCHEMA'
    )
  );
};

export default validate;
