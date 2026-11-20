import { Router } from 'express';
import { z } from 'zod';
import { autenticar } from '../middleware/auth.js';
import { autorizar } from '../middleware/roles.js';
import { validarBody, validarParams } from '../middleware/validar.js';
import { usuarioService } from '../services/usuarioService.js';
import { respuestaExito } from '../utils/respuestas.js';

const router = Router();

const idParamSchema = z.object({
  id: z.coerce.number().int().positive('ID de usuario inválido')
});

const crearUsuarioSchema = z.object({
  nombre_completo: z.string().min(3, 'El nombre completo debe tener al menos 3 caracteres'),
  email: z.string().email('Debe ser un correo electrónico válido'),
  password: z.string().min(10, 'La contraseña debe tener mínimo 10 caracteres'),
  id_rol: z.coerce.number().int().positive('Debe seleccionar un rol válido'),
  debe_cambiar_password: z.boolean().optional().default(false)
});

const actualizarUsuarioSchema = z.object({
  nombre_completo: z.string().min(3).optional(),
  email: z.string().email().optional(),
  password: z.string().min(10).optional(),
  id_rol: z.coerce.number().int().positive().optional(),
  debe_cambiar_password: z.boolean().optional()
});

const activoPatchSchema = z.object({
  activo: z.coerce.boolean()
});

// Todas las rutas de usuarios son estrictamente para Administrador
router.use(autenticar, autorizar('Administrador'));

// GET /api/usuarios
router.get('/', async (req, res, next) => {
  try {
    const usuarios = await usuarioService.listar();
    return respuestaExito(res, usuarios);
  } catch (error) {
    next(error);
  }
});

// GET /api/usuarios/:id
router.get('/:id', validarParams(idParamSchema), async (req, res, next) => {
  try {
    const usuario = await usuarioService.obtenerPorId(Number(req.params.id));
    return respuestaExito(res, usuario);
  } catch (error) {
    next(error);
  }
});

// POST /api/usuarios
router.post('/', validarBody(crearUsuarioSchema), async (req, res, next) => {
  try {
    const nuevo = await usuarioService.crear(req.body, {
      usuarioAutenticado: req.usuario,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    return respuestaExito(res, nuevo, undefined, 201);
  } catch (error) {
    next(error);
  }
});

// PUT /api/usuarios/:id
router.put('/:id', validarParams(idParamSchema), validarBody(actualizarUsuarioSchema), async (req, res, next) => {
  try {
    const actualizado = await usuarioService.actualizar(Number(req.params.id), req.body, {
      usuarioAutenticado: req.usuario,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    return respuestaExito(res, actualizado);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/usuarios/:id/activo
router.patch('/:id/activo', validarParams(idParamSchema), validarBody(activoPatchSchema), async (req, res, next) => {
  try {
    const resultado = await usuarioService.cambiarActivo(Number(req.params.id), req.body.activo, {
      usuarioAutenticado: req.usuario,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    return respuestaExito(res, resultado);
  } catch (error) {
    next(error);
  }
});

export default router;

