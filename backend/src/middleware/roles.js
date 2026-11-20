import { respuestaError } from '../utils/respuestas.js';

/**
 * Middleware para restringir acceso según el rol del usuario autenticado
 * @param {...string} rolesPermitidos - Ej: 'Administrador', 'Enfermería'
 */
export function autorizar(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return respuestaError(res, 'NO_AUTORIZADO', 'Debe iniciar sesión para continuar.', 401);
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return respuestaError(
        res,
        'ACCESO_DENEGADO',
        `No cuenta con privilegios de ${rolesPermitidos.join(' o ')} para acceder a este recurso.`,
        403
      );
    }

    next();
  };
}

