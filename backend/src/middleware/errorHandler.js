import { ZodError } from 'zod';
import { respuestaError } from '../utils/respuestas.js';

export class AppError extends Error {
  /**
   * @param {string} codigo
   * @param {string} mensaje
   * @param {number} [status=400]
   */
  constructor(codigo, mensaje, status = 400) {
    super(mensaje);
    this.codigo = codigo;
    this.status = status;
  }
}

/**
 * Middleware central de manejo de errores
 */
export function errorHandler(err, req, res, next) {
  // 1. Error de validación Zod
  if (err instanceof ZodError) {
    const primerDetalle = err.errors[0];
    const campo = primerDetalle ? primerDetalle.path.join('.') : 'general';
    const mensaje = primerDetalle ? `${campo}: ${primerDetalle.message}` : 'Datos de entrada inválidos';
    return respuestaError(res, 'VALIDACION_FALLIDA', mensaje, 400);
  }

  // 2. Errores controlados de la aplicación
  if (err instanceof AppError) {
    return respuestaError(res, err.codigo, err.message, err.status);
  }

  // 3. Errores de base de datos SQLite (captura sin filtrar SQL sensible)
  if (err && (err.code === 'ERR_SQLITE_ERROR' || err.errstr || typeof err.message === 'string')) {
    const msg = `${err.errstr || ''} ${err.message || ''}`;
    if (msg.includes('UNIQUE constraint failed') || err.code === 'ER_DUP_ENTRY') {
      return respuestaError(res, 'REGISTRO_DUPLICADO', 'Ya existe un registro con los mismos datos únicos en el sistema', 409);
    }
    if (msg.includes('FOREIGN KEY constraint failed') || err.code === 'ER_NO_REFERENCED_ROW_2') {
      return respuestaError(res, 'REFERENCIA_INVALIDA', 'Uno de los identificadores relacionados no existe', 400);
    }
  }

  // 4. Error de JSON malformado en body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return respuestaError(res, 'JSON_INVALIDO', 'El cuerpo de la solicitud no es un JSON válido', 400);
  }

  // 5. Error 500 no controlado: se loguea internamente sin enviar stacktrace ni SQL al cliente
  console.error('[ERROR_NO_CONTROLADO]', {
    timestamp: new Date().toISOString(),
    metodo: req.method,
    url: req.originalUrl,
    ip: req.ip,
    mensaje: err.message,
    stack: err.stack
  });

  return respuestaError(res, 'ERROR_INTERNO', 'Ocurrió un error interno en el servidor. Intente más tarde.', 500);
}

