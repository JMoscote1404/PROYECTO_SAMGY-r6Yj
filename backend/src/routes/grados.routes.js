import { Router } from 'express';
import { autenticar } from '../middleware/auth.js';
import { gradosService } from '../services/gradosService.js';
import { respuestaExito } from '../utils/respuestas.js';

const router = Router();

// GET /api/grados
router.get('/', autenticar, async (req, res, next) => {
  try {
    const grados = await gradosService.listar();
    return respuestaExito(res, grados);
  } catch (error) {
    next(error);
  }
});

export default router;

