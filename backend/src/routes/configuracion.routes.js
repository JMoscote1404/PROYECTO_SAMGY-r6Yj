import { Router } from 'express';
import { z } from 'zod';
import { autenticar } from '../middleware/auth.js';
import { autorizar } from '../middleware/roles.js';
import { validarBody } from '../middleware/validar.js';
import { configuracionService } from '../services/configuracionService.js';
import { respuestaExito } from '../utils/respuestas.js';

const router = Router();

const actualizarConfiguracionSchema = z.record(z.any());

// GET /api/configuracion (solo Administrador)
router.get('/', autenticar, autorizar('Administrador'), async (req, res, next) => {
  try {
    const config = await configuracionService.obtener();
    return respuestaExito(res, config);
  } catch (error) {
    next(error);
  }
});

// PUT /api/configuracion (solo Administrador)
router.put('/', autenticar, autorizar('Administrador'), validarBody(actualizarConfiguracionSchema), async (req, res, next) => {
  try {
    const config = await configuracionService.actualizar(req.body, {
      usuarioAutenticado: req.usuario,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    return respuestaExito(res, config);
  } catch (error) {
    next(error);
  }
});

export default router;

