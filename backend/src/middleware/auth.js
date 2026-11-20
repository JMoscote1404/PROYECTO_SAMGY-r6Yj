import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { pool } from '../db/pool.js';
import { respuestaError } from '../utils/respuestas.js';

export async function autenticar(req, res, next) {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return respuestaError(res, 'NO_AUTORIZADO', 'No se ha proporcionado una sesión activa.', 401);
    }

    let decodificado;
    try {
      decodificado = jwt.verify(token, env.JWT_SECRET);
    } catch (jwtError) {
      return respuestaError(res, 'TOKEN_INVALIDO', 'La sesión ha expirado o el token es inválido.', 401);
    }

    // Consultar estado actual del usuario en la base de datos
    const [filas] = await pool.execute(
      `SELECT u.id_usuario, u.nombre_completo, u.email, u.id_rol, r.nombre AS rol, u.debe_cambiar_password, u.activo
       FROM usuario u
       INNER JOIN rol r ON u.id_rol = r.id_rol
       WHERE u.id_usuario = ? LIMIT 1`,
      [decodificado.id_usuario]
    );

    if (filas.length === 0 || filas[0].activo !== 1) {
      return respuestaError(res, 'USUARIO_INACTIVO', 'El usuario no existe o se encuentra inactivo.', 401);
    }

    req.usuario = {
      id_usuario: filas[0].id_usuario,
      nombre_completo: filas[0].nombre_completo,
      email: filas[0].email,
      id_rol: filas[0].id_rol,
      rol: filas[0].rol,
      debe_cambiar_password: filas[0].debe_cambiar_password
    };

    next();
  } catch (error) {
    next(error);
  }
}

