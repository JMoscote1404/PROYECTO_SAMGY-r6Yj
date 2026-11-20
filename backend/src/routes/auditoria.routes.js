import { Router } from 'express';
import { z } from 'zod';
import { autenticar } from '../middleware/auth.js';
import { autorizar } from '../middleware/roles.js';
import { validarQuery } from '../middleware/validar.js';
import { auditoriaService } from '../services/auditoriaService.js';
import { respuestaExito } from '../utils/respuestas.js';

const router = Router();

const queryAuditoriaSchema = z.object({
  usuario: z.string().optional(),
  accion: z.string().optional(),
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha debe ser YYYY-MM-DD').optional(),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha debe ser YYYY-MM-DD').optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

// GET /api/auditoria (solo Administrador)
router.get('/', autenticar, autorizar('Administrador'), validarQuery(queryAuditoriaSchema), async (req, res, next) => {
  try {
    const resultado = await auditoriaService.listar(req.query);
    return respuestaExito(res, resultado.data, resultado.meta);
  } catch (error) {
    next(error);
  }
});

export default router;

