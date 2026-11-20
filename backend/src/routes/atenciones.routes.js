import { Router } from 'express';
import { z } from 'zod';
import { autenticar } from '../middleware/auth.js';
import { validarBody, validarQuery, validarParams } from '../middleware/validar.js';
import { atencionService } from '../services/atencionService.js';
import { respuestaExito, respuestaError } from '../utils/respuestas.js';

const router = Router();

const idParamSchema = z.object({
  id: z.coerce.number().int().positive('ID de atención médica inválido')
});

const queryAtencionesSchema = z.object({
  estudiante: z.string().optional(),
  grado: z.string().optional(),
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'El formato de fecha debe ser YYYY-MM-DD').optional(),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'El formato de fecha debe ser YYYY-MM-DD').optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(10)
});

const crearAtencionSchema = z.object({
  id_estudiante: z.coerce.number().int().positive('Debe seleccionar un estudiante válido'),
  motivo_sintomas: z.string().min(3, 'El motivo de consulta o síntomas presentados son requeridos').max(255),
  observaciones_diagnostico: z.string().min(3, 'Las observaciones clínicas o diagnóstico son requeridos'),
  tratamiento: z.string().min(3, 'El tratamiento o conducta médica administrada es requerida')
});

// GET /api/atenciones
router.get('/', autenticar, validarQuery(queryAtencionesSchema), async (req, res, next) => {
  try {
    const resultado = await atencionService.listar(req.query);
    return respuestaExito(res, resultado.data, resultado.meta);
  } catch (error) {
    next(error);
  }
});

// GET /api/atenciones/:id
router.get('/:id', autenticar, validarParams(idParamSchema), async (req, res, next) => {
  try {
    const atencion = await atencionService.obtenerPorId(Number(req.params.id));
    return respuestaExito(res, atencion);
  } catch (error) {
    next(error);
  }
});

// POST /api/atenciones
router.post('/', autenticar, validarBody(crearAtencionSchema), async (req, res, next) => {
  try {
    const nueva = await atencionService.crear(req.body, {
      usuarioAutenticado: req.usuario,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    return respuestaExito(res, nueva, undefined, 201);
  } catch (error) {
    next(error);
  }
});

// Regla estricta: NO se permite editar ni eliminar registros clínicos (inmutabilidad)
router.put('/:id', autenticar, (req, res) => {
  return respuestaError(res, 'METODO_NO_PERMITIDO', 'Por normativa de seguridad clínica, las atenciones médicas son inmutables y no pueden modificarse.', 405);
});

router.delete('/:id', autenticar, (req, res) => {
  return respuestaError(res, 'METODO_NO_PERMITIDO', 'Por normativa legal de registros de salud de menores, las atenciones no pueden eliminarse.', 405);
});

export default router;

