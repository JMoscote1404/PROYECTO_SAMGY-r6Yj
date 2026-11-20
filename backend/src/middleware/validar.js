/**
 * Middleware para validar el cuerpo (body) de la solicitud con Zod
 * @param {import('zod').ZodSchema} schema
 */
export function validarBody(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware para validar los parámetros de consulta (query) de la solicitud con Zod
 * @param {import('zod').ZodSchema} schema
 */
export function validarQuery(schema) {
  return (req, res, next) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware para validar los parámetros de ruta (params) de la solicitud con Zod
 * @param {import('zod').ZodSchema} schema
 */
export function validarParams(schema) {
  return (req, res, next) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      next(error);
    }
  };
}

