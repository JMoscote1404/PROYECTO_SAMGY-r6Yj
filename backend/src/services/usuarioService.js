import bcrypt from 'bcryptjs';
import { pool } from '../db/pool.js';
import { AppError } from '../middleware/errorHandler.js';
import { auditoriaService } from './auditoriaService.js';

export const usuarioService = {
  /**
   * Listar todos los usuarios del sistema
   */
  async listar() {
    const [filas] = await pool.execute(
      `SELECT u.id_usuario, u.id_rol, r.nombre AS rol, u.nombre_completo,
              u.email, u.debe_cambiar_password, u.activo, u.created_at, u.updated_at
       FROM usuario u
       INNER JOIN rol r ON u.id_rol = r.id_rol
       ORDER BY u.id_usuario ASC`
    );
    return filas;
  },

  /**
   * Obtener usuario por ID
   */
  async obtenerPorId(idUsuario) {
    const [filas] = await pool.execute(
      `SELECT u.id_usuario, u.id_rol, r.nombre AS rol, u.nombre_completo,
              u.email, u.debe_cambiar_password, u.activo, u.created_at, u.updated_at
       FROM usuario u
       INNER JOIN rol r ON u.id_rol = r.id_rol
       WHERE u.id_usuario = ? LIMIT 1`,
      [idUsuario]
    );

    if (filas.length === 0) {
      throw new AppError('USUARIO_NO_ENCONTRADO', 'El usuario solicitado no existe.', 404);
    }

    return filas[0];
  },

  /**
   * Crear un nuevo usuario en la plataforma
   */
  async crear(datos, { usuarioAutenticado, ip, userAgent }) {
    // Validar si el correo ya existe
    const [existentes] = await pool.execute('SELECT id_usuario FROM usuario WHERE email = ? LIMIT 1', [datos.email]);
    if (existentes.length > 0) {
      throw new AppError('EMAIL_DUPLICADO', 'Ya existe un usuario con este correo electrónico.', 409);
    }

    const hash = await bcrypt.hash(datos.password, 10);
    const debeCambiar = datos.debe_cambiar_password ? 1 : 0;

    const [res] = await pool.execute(
      `INSERT INTO usuario (id_rol, nombre_completo, email, password_hash, debe_cambiar_password, activo)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [datos.id_rol, datos.nombre_completo.trim(), datos.email.trim(), hash, debeCambiar]
    );

    const idUsuario = res.insertId;

    await auditoriaService.registrar({
      id_usuario: usuarioAutenticado?.id_usuario,
      usuario_email: usuarioAutenticado?.email,
      rol: usuarioAutenticado?.rol,
      accion: 'CREAR_USUARIO',
      detalles: { id_usuario_creado: idUsuario, email: datos.email, id_rol: datos.id_rol },
      ip,
      user_agent: userAgent
    });

    return await this.obtenerPorId(idUsuario);
  },

  /**
   * Actualizar información de un usuario
   */
  async actualizar(idUsuario, datos, { usuarioAutenticado, ip, userAgent }) {
    await this.obtenerPorId(idUsuario); // verifica existencia

    const campos = [];
    const params = [];

    if (datos.nombre_completo) {
      campos.push('nombre_completo = ?');
      params.push(datos.nombre_completo.trim());
    }

    if (datos.email) {
      // Validar si otro usuario tiene el correo
      const [dups] = await pool.execute(
        'SELECT id_usuario FROM usuario WHERE email = ? AND id_usuario != ? LIMIT 1',
        [datos.email, idUsuario]
      );
      if (dups.length > 0) {
        throw new AppError('EMAIL_DUPLICADO', 'El correo ya está en uso por otro usuario.', 409);
      }
      campos.push('email = ?');
      params.push(datos.email.trim());
    }

    if (datos.id_rol) {
      campos.push('id_rol = ?');
      params.push(datos.id_rol);
    }

    if (datos.password) {
      const hash = await bcrypt.hash(datos.password, 10);
      campos.push('password_hash = ?');
      params.push(hash);
    }

    if (datos.debe_cambiar_password !== undefined) {
      campos.push('debe_cambiar_password = ?');
      params.push(datos.debe_cambiar_password ? 1 : 0);
    }

    if (campos.length > 0) {
      params.push(idUsuario);
      await pool.execute(`UPDATE usuario SET ${campos.join(', ')} WHERE id_usuario = ?`, params);
    }

    await auditoriaService.registrar({
      id_usuario: usuarioAutenticado?.id_usuario,
      usuario_email: usuarioAutenticado?.email,
      rol: usuarioAutenticado?.rol,
      accion: 'ACTUALIZAR_USUARIO',
      detalles: { id_usuario_modificado: idUsuario, cambios: Object.keys(datos) },
      ip,
      user_agent: userAgent
    });

    return await this.obtenerPorId(idUsuario);
  },

  /**
   * Activar o desactivar usuario
   */
  async cambiarActivo(idUsuario, activo, { usuarioAutenticado, ip, userAgent }) {
    if (usuarioAutenticado && usuarioAutenticado.id_usuario === Number(idUsuario) && !activo) {
      throw new AppError('OPERACION_INVALIDA', 'No puede desactivar su propia cuenta de administrador.', 400);
    }

    const nuevoEstado = activo ? 1 : 0;
    const [res] = await pool.execute('UPDATE usuario SET activo = ? WHERE id_usuario = ?', [nuevoEstado, idUsuario]);

    if (res.affectedRows === 0) {
      throw new AppError('USUARIO_NO_ENCONTRADO', 'El usuario no existe.', 404);
    }

    await auditoriaService.registrar({
      id_usuario: usuarioAutenticado?.id_usuario,
      usuario_email: usuarioAutenticado?.email,
      rol: usuarioAutenticado?.rol,
      accion: nuevoEstado ? 'ACTIVAR_USUARIO' : 'DESACTIVAR_USUARIO',
      detalles: { id_usuario_afectado: idUsuario, activo: nuevoEstado },
      ip,
      user_agent: userAgent
    });

    return { id_usuario: Number(idUsuario), activo: nuevoEstado };
  }
};

