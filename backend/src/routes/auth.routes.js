import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { authService } from '../services/authService.js';
import { autenticar } from '../middleware/auth.js';
import { limitadorLogin } from '../middleware/rateLimiter.js';
import { validarBody } from '../middleware/validar.js';
import { respuestaExito } from '../utils/respuestas.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email('Debe proporcionar un correo electrónico válido'),
  password: z.string().min(1, 'La contraseña es obligatoria')
});

const cambiarPasswordSchema = z.object({
  password_actual: z.string().min(1, 'La contraseña actual es obligatoria'),
  nuevo_password: z.string().min(10, 'La nueva contraseña debe tener mínimo 10 caracteres')
});

// POST /api/auth/login
router.post('/login', limitadorLogin, validarBody(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { token, usuario } = await authService.login({
      email,
      password,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Guardar JWT en cookie httpOnly estricta (no devolver en body)
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: env.NODE_ENV === 'production',
      maxAge: 8 * 60 * 60 * 1000 // 8 horas
    });

    return respuestaExito(res, { usuario });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'strict',
    secure: env.NODE_ENV === 'production'
  });
  return respuestaExito(res, { mensaje: 'Sesión finalizada exitosamente' });
});

// GET /api/auth/me
router.get('/me', autenticar, (req, res) => {
  return respuestaExito(res, req.usuario);
});

// POST /api/auth/cambiar-password
router.post('/cambiar-password', autenticar, validarBody(cambiarPasswordSchema), async (req, res, next) => {
  try {
    const { password_actual, nuevo_password } = req.body;
    const resultado = await authService.cambiarPassword({
      id_usuario: req.usuario.id_usuario,
      password_actual,
      nuevo_password,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    return respuestaExito(res, resultado);
  } catch (error) {
    next(error);
  }
});

export default router;

