import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

export const limitadorLogin = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // máximo 10 intentos por IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => env.NODE_ENV === 'test' && !req.headers['x-test-rate-limit'],
  handler: (req, res) => {
    return res.status(429).json({
      error: {
        codigo: 'DEMASIADOS_INTENTOS',
        mensaje: 'Ha superado el límite de 10 intentos de inicio de sesión en 15 minutos. Intente más tarde.'
      }
    });
  }
});

export const limitadorGeneral = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'test',
  handler: (req, res) => {
    return res.status(429).json({
      error: {
        codigo: 'LIMITE_EXCEDIDO',
        mensaje: 'Ha superado el límite permitido de solicitudes. Intente más tarde.'
      }
    });
  }
});

