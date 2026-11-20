import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { pool } from '../db/pool.js';
import { AppError } from '../middleware/errorHandler.js';
import { auditoriaService } from './auditoriaService.js';

export const authService = {
  /**
   * Inicializa un administrador de arranque si la base de datos no tiene usuarios activos
   */
  async inicializarAdminSiNoExiste() {
    const [filas] = await pool.execute('SELECT COUNT(*) AS total FROM usuario WHERE activo = 1');
    const total = filas[0].total;

    if (total === 0) {
      console.log('⚠️ No se detectaron usuarios activos. Creando administrador de arranque desde variables de entorno...');
      const hash = await bcrypt.hash(env.ADMIN_PASSWORD, 10);
      
      // Asegurar que exista el rol Administrador
      const [roles] = await pool.execute("SELECT id_rol FROM rol WHERE nombre = 'Administrador' LIMIT 1");
      const idRol = roles.length > 0 ? roles[0].id_rol : 1;

      await pool.execute(
        `INSERT INTO usuario (id_rol, nombre_completo, email, password_hash, debe_cambiar_password, activo)
         VALUES (?, ?, ?, ?, 1, 1)
         ON CONFLICT(email) DO UPDATE SET
           password_hash = excluded.password_hash,
           debe_cambiar_password = 1,
           activo = 1,
           updated_at = datetime('now', '-5 hours')`,
        [idRol, 'Administrador del Sistema', env.ADMIN_CORREO, hash]
      );

      console.log(`✅ Administrador inicial creado con éxito (${env.ADMIN_CORREO}). Debe cambiar su contraseña en el primer inicio.`);
    }
  },

  /**
   * Proceso de autenticación de credenciales
   */
  async login({ email, password, ip, userAgent }) {
    const [usuarios] = await pool.execute(
      `SELECT u.id_usuario, u.id_rol, u.nombre_completo, u.email, u.password_hash, u.debe_cambiar_password, u.activo, r.nombre AS rol
       FROM usuario u
       INNER JOIN rol r ON u.id_rol = r.id_rol
       WHERE u.email = ? LIMIT 1`,
      [email]
    );

    if (usuarios.length === 0 || usuarios[0].activo !== 1) {
      await auditoriaService.registrar({
        usuario_email: email,
        accion: 'LOGIN_FALLIDO',
        detalles: { motivo: 'Usuario inexistente o inactivo' },
        ip,
        user_agent: userAgent
      });
      throw new AppError('CREDENCIALES_INVALIDAS', 'Correo o contraseña incorrectos.', 401);
    }

    const usuario = usuarios[0];
    const passwordValido = await bcrypt.compare(password, usuario.password_hash);

    if (!passwordValido) {
      await auditoriaService.registrar({
        id_usuario: usuario.id_usuario,
        usuario_email: usuario.email,
        rol: usuario.rol,
        accion: 'LOGIN_FALLIDO',
        detalles: { motivo: 'Contraseña errónea' },
        ip,
        user_agent: userAgent
      });
      throw new AppError('CREDENCIALES_INVALIDAS', 'Correo o contraseña incorrectos.', 401);
    }

    const token = jwt.sign(
      {
        id_usuario: usuario.id_usuario,
        email: usuario.email,
        rol: usuario.rol
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    await auditoriaService.registrar({
      id_usuario: usuario.id_usuario,
      usuario_email: usuario.email,
      rol: usuario.rol,
      accion: 'LOGIN_EXITOSO',
      detalles: { debe_cambiar_password: usuario.debe_cambiar_password },
      ip,
      user_agent: userAgent
    });

    return {
      token,
      usuario: {
        id_usuario: usuario.id_usuario,
        nombre_completo: usuario.nombre_completo,
        email: usuario.email,
        rol: usuario.rol,
        debe_cambiar_password: usuario.debe_cambiar_password
      }
    };
  },

  /**
   * Cambio de contraseña de usuario
   */
  async cambiarPassword({ id_usuario, password_actual, nuevo_password, ip, userAgent }) {
    const [usuarios] = await pool.execute(
      `SELECT u.id_usuario, u.email, u.password_hash, r.nombre AS rol
       FROM usuario u
       INNER JOIN rol r ON u.id_rol = r.id_rol
       WHERE u.id_usuario = ? LIMIT 1`,
      [id_usuario]
    );

    if (usuarios.length === 0) {
      throw new AppError('USUARIO_NO_ENCONTRADO', 'El usuario solicitado no existe.', 404);
    }

    const usuario = usuarios[0];
    const actualValido = await bcrypt.compare(password_actual, usuario.password_hash);

    if (!actualValido) {
      throw new AppError('PASSWORD_ACTUAL_INCORRECTO', 'La contraseña actual no es correcta.', 400);
    }

    const nuevoHash = await bcrypt.hash(nuevo_password, 10);

    await pool.execute(
      `UPDATE usuario SET password_hash = ?, debe_cambiar_password = 0 WHERE id_usuario = ?`,
      [nuevoHash, id_usuario]
    );

    await auditoriaService.registrar({
      id_usuario: usuario.id_usuario,
      usuario_email: usuario.email,
      rol: usuario.rol,
      accion: 'CAMBIO_PASSWORD',
      detalles: { motivo: 'Actualización voluntaria o requerida' },
      ip,
      user_agent: userAgent
    });

    return { mensaje: 'Contraseña actualizada con éxito.' };
  }
};

