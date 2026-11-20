/**
 * Helper estándar para respuestas exitosas
 * @param {import('express').Response} res
 * @param {*} data
 * @param {object} [meta]
 * @param {number} [status=200]
 */
export function respuestaExito(res, data, meta = undefined, status = 200) {
  const payload = { data };
  if (meta !== undefined) {
    payload.meta = meta;
  }
  return res.status(status).json(payload);
}

/**
 * Helper estándar para respuestas de error
 * @param {import('express').Response} res
 * @param {string} codigo
 * @param {string} mensaje
 * @param {number} [status=400]
 */
export function respuestaError(res, codigo, mensaje, status = 400) {
  return res.status(status).json({
    error: {
      codigo,
      mensaje
    }
  });
}

