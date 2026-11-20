import { Router } from 'express';
import { z } from 'zod';
import { autenticar } from '../middleware/auth.js';
import { validarBody, validarQuery, validarParams } from '../middleware/validar.js';
import { estudianteService } from '../services/estudianteService.js';
import { respuestaExito } from '../utils/respuestas.js';

const router = Router();

const idParamSchema = z.object({
  id: z.coerce.number().int().positive('ID de estudiante inválido')
});

const queryEstudiantesSchema = z.object({
  grado: z.string().optional(),
  q: z.string().optional(),
  activo: z.union([z.string(), z.number()]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(10)
});

const crearEstudianteSchema = z.object({
  codigo: z.string().max(20).optional(),
  id_tipo_documento: z.coerce.number().int().positive('El tipo de documento es requerido'),
  numero_documento: z.string().min(3, 'El número de documento debe tener al menos 3 caracteres'),
  nombres: z.string().min(2, 'Los nombres son requeridos'),
  apellidos: z.string().min(2, 'Los apellidos son requeridos'),
  edad: z.coerce.number().int().min(1).max(25).optional().nullable(),
  direccion: z.string().max(255).optional().nullable(),
  correo: z.string().email('Correo de estudiante inválido').optional().nullable().or(z.literal('')),
  id_grado: z.coerce.number().int().positive('El grado es requerido'),
  id_acudiente: z.coerce.number().int().positive().optional(),
  acudiente: z.object({
    nombre_completo: z.string().min(3, 'Nombre de acudiente requerido'),
    telefono: z.string().min(6, 'Teléfono de contacto requerido'),
    parentesco: z.string().optional(),
    direccion: z.string().optional(),
    correo: z.string().email().optional().nullable().or(z.literal(''))
  }).optional(),
  acudientes: z.array(z.object({
    nombre_completo: z.string().min(3),
    telefono: z.string().min(6),
    parentesco: z.string().optional(),
    direccion: z.string().optional(),
    correo: z.string().email().optional().nullable().or(z.literal(''))
  })).optional(),
  ficha_medica: z.object({
    grupo_sanguineo: z.string().optional().nullable(),
    eps: z.string().optional().nullable(),
    observaciones_generales: z.string().optional().nullable()
  }).optional(),
  alergias: z.array(z.union([z.string(), z.object({ tipo: z.string().optional(), descripcion: z.string() })])).optional(),
  condiciones: z.array(z.union([z.string(), z.object({ nombre: z.string(), descripcion: z.string().optional() })])).optional()
});

const actualizarEstudianteSchema = z.object({
  codigo: z.string().max(20).optional(),
  id_tipo_documento: z.coerce.number().int().positive().optional(),
  numero_documento: z.string().min(3).optional(),
  nombres: z.string().min(2).optional(),
  apellidos: z.string().min(2).optional(),
  nombre_completo: z.string().min(3).optional(),
  edad: z.coerce.number().int().min(1).max(25).optional().nullable(),
  direccion: z.string().max(255).optional().nullable(),
  correo: z.string().email().optional().nullable().or(z.literal('')),
  id_grado: z.coerce.number().int().positive().optional(),
  acudiente: z.object({
    nombre_completo: z.string().optional(),
    telefono: z.string().optional(),
    parentesco: z.string().optional(),
    direccion: z.string().optional(),
    correo: z.string().email().optional().nullable().or(z.literal(''))
  }).optional(),
  acudientes: z.array(z.object({
    nombre_completo: z.string().optional(),
    telefono: z.string().optional(),
    parentesco: z.string().optional(),
    direccion: z.string().optional(),
    correo: z.string().email().optional().nullable().or(z.literal(''))
  })).optional(),
  ficha_medica: z.object({
    grupo_sanguineo: z.string().optional().nullable(),
    eps: z.string().optional().nullable(),
    observaciones_generales: z.string().optional().nullable()
  }).optional(),
  alergias: z.array(z.union([z.string(), z.object({ tipo: z.string().optional(), descripcion: z.string() })])).optional(),
  condiciones: z.array(z.union([z.string(), z.object({ nombre: z.string(), descripcion: z.string().optional() })])).optional()
});

const activoPatchSchema = z.object({
  activo: z.coerce.boolean()
});

// GET /api/estudiantes
router.get('/', autenticar, validarQuery(queryEstudiantesSchema), async (req, res, next) => {
  try {
    const resultado = await estudianteService.listar(req.query);
    return respuestaExito(res, resultado.data, resultado.meta);
  } catch (error) {
    next(error);
  }
});

// GET /api/estudiantes/:id/ficha
router.get('/:id/ficha', autenticar, validarParams(idParamSchema), async (req, res, next) => {
  try {
    const ficha = await estudianteService.obtenerFicha(Number(req.params.id), {
      usuarioAutenticado: req.usuario,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    return respuestaExito(res, ficha);
  } catch (error) {
    next(error);
  }
});

// GET /api/estudiantes/:id
router.get('/:id', autenticar, validarParams(idParamSchema), async (req, res, next) => {
  try {
    const estudiante = await estudianteService.obtenerPorId(Number(req.params.id));
    return respuestaExito(res, estudiante);
  } catch (error) {
    next(error);
  }
});

// POST /api/estudiantes
router.post('/', autenticar, validarBody(crearEstudianteSchema), async (req, res, next) => {
  try {
    const nuevo = await estudianteService.crear(req.body, {
      usuarioAutenticado: req.usuario,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    return respuestaExito(res, nuevo, undefined, 201);
  } catch (error) {
    next(error);
  }
});

// PUT /api/estudiantes/:id
router.put('/:id', autenticar, validarParams(idParamSchema), validarBody(actualizarEstudianteSchema), async (req, res, next) => {
  try {
    const resultado = await estudianteService.actualizar(Number(req.params.id), req.body, {
      usuarioAutenticado: req.usuario,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    return respuestaExito(res, resultado);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/estudiantes/:id/activo
router.patch('/:id/activo', autenticar, validarParams(idParamSchema), validarBody(activoPatchSchema), async (req, res, next) => {
  try {
    const resultado = await estudianteService.cambiarActivo(Number(req.params.id), req.body.activo, {
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

