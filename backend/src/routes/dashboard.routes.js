import { Router } from 'express';
import { autenticar } from '../middleware/auth.js';
import { dashboardService } from '../services/dashboardService.js';
import { respuestaExito } from '../utils/respuestas.js';

const router = Router();

// GET /api/dashboard
router.get('/', autenticar, async (req, res, next) => {
  try {
    const metricas = await dashboardService.obtenerMetricas();
    return respuestaExito(res, metricas);
  } catch (error) {
    next(error);
  }
});

export default router;

