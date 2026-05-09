const { ZodError } = require('zod');

function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const result = schema.parse(req[source]);
      req[source] = result;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const first = err.errors[0];
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: first.message,
            details: { field: first.path.join('.'), issues: err.errors },
          },
        });
      }
      next(err);
    }
  };
}

module.exports = validate;
