import { Router } from 'express';
import authRoutes from './auth.routes.js';
import gradosRoutes from './grados.routes.js';
import estudiantesRoutes from './estudiantes.routes.js';
import atencionesRoutes from './atenciones.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import configuracionRoutes from './configuracion.routes.js';
import usuariosRoutes from './usuarios.routes.js';
import auditoriaRoutes from './auditoria.routes.js';

const router = Router();

// Endpoint público de salud
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    servicio: 'SAMGY API',
    timestamp: new Date().toISOString()
  });
});

// Módulos de la API
router.use('/auth', authRoutes);
router.use('/grados', gradosRoutes);
router.use('/estudiantes', estudiantesRoutes);
router.use('/atenciones', atencionesRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/configuracion', configuracionRoutes);
router.use('/usuarios', usuariosRoutes);
router.use('/auditoria', auditoriaRoutes);

export default router;

