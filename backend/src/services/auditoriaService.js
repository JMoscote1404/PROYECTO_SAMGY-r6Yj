import { pool } from '../db/pool.js';

export const auditoriaService = {
  /**
   * Registra un evento en la bitácora de auditoría
   */
  async registrar({ id_usuario = null, usuario_email = null, rol = null, accion, detalles = null, ip = null, user_agent = null }, connection = null) {
    try {
      const db = connection || pool;
      const sql = `
        INSERT INTO auditoria (id_usuario, usuario_email, rol, accion, detalles, ip, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      const detallesJson = detalles ? JSON.stringify(detalles) : null;
      await db.execute(sql, [
        id_usuario,
        usuario_email,
        rol,
        accion,
        detallesJson,
        ip,
        user_agent ? user_agent.substring(0, 250) : null
      ]);
    } catch (error) {
      // No romper el flujo principal si la auditoría falla, pero loguear el error
      console.error('Error al registrar auditoría:', error.message);
    }
  },

  /**
   * Consulta el historial de auditoría con filtros y paginación
   */
  async listar({ usuario, accion, desde, hasta, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    const condiciones = [];
    const params = [];

    if (usuario) {
      condiciones.push('(usuario_email LIKE ? OR id_usuario = ?)');
      params.push(`%${usuario}%`, isNaN(usuario) ? -1 : Number(usuario));
    }

    if (accion) {
      condiciones.push('accion = ?');
      params.push(accion);
    }

    if (desde) {
      condiciones.push('created_at >= ?');
      params.push(`${desde} 00:00:00`);
    }

    if (hasta) {
      condiciones.push('created_at <= ?');
      params.push(`${hasta} 23:59:59`);
    }

    const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    const [conteo] = await pool.execute(
      `SELECT COUNT(*) AS total FROM auditoria ${where}`,
      params
    );
    const total = conteo[0].total;

    // Ejecutar consulta paginada
    const [filas] = await pool.execute(
      `SELECT id_auditoria, id_usuario, usuario_email, rol, accion, detalles, ip, user_agent, created_at
       FROM auditoria
       ${where}
       ORDER BY id_auditoria DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );

    const data = filas.map(f => ({
      ...f,
      detalles: typeof f.detalles === 'string' ? JSON.parse(f.detalles) : f.detalles
    }));

    return {
      data,
      meta: {
        total,
        pagina: Number(page),
        limite: Number(limit),
        total_paginas: Math.ceil(total / limit) || 1
      }
    };
  }
};

