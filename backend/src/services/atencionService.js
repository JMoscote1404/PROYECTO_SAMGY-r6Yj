import { pool } from '../db/pool.js';
import { AppError } from '../middleware/errorHandler.js';
import { auditoriaService } from './auditoriaService.js';

export const atencionService = {
  /**
   * Listado paginado de atenciones clínicas escolares utilizando v_atencion_detalle
   */
  async listar({ estudiante, grado, desde, hasta, page = 1, limit = 10 }) {
    const offset = (Number(page) - 1) * Number(limit);
    const condiciones = [];
    const params = [];

    if (estudiante) {
      if (!isNaN(estudiante)) {
        condiciones.push('(id_estudiante = ? OR nombre_estudiante LIKE ?)');
        params.push(Number(estudiante), `%${estudiante}%`);
      } else {
        condiciones.push('(nombre_estudiante LIKE ? OR codigo_estudiante LIKE ? OR documento_estudiante LIKE ?)');
        params.push(`%${estudiante}%`, `%${estudiante}%`, `%${estudiante}%`);
      }
    }

    if (grado) {
      condiciones.push('curso LIKE ?');
      params.push(`%${grado}%`);
    }

    if (desde) {
      condiciones.push('fecha_hora >= ?');
      params.push(`${desde} 00:00:00`);
    }

    if (hasta) {
      condiciones.push('fecha_hora <= ?');
      params.push(`${hasta} 23:59:59`);
    }

    const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    const [conteo] = await pool.execute(
      `SELECT COUNT(*) AS total FROM v_atencion_detalle ${where}`,
      params
    );
    const total = conteo[0].total;

    const [filas] = await pool.execute(
      `SELECT 
        id_atencion, codigo_atencion, fecha_hora, id_estudiante,
        codigo_estudiante, nombre_estudiante, documento_estudiante,
        curso, id_usuario, atendido_por, rol_atendio,
        motivo_sintomas, observaciones_diagnostico, tratamiento, activo
       FROM v_atencion_detalle
       ${where}
       ORDER BY fecha_hora DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );

    return {
      data: filas,
      meta: {
        total,
        pagina: Number(page),
        limite: Number(limit),
        total_paginas: Math.ceil(total / Number(limit)) || 1
      }
    };
  },

  /**
   * Detalle individual de atención clínica
   */
  async obtenerPorId(idAtencion) {
    const [filas] = await pool.execute(
      `SELECT * FROM v_atencion_detalle WHERE id_atencion = ? LIMIT 1`,
      [idAtencion]
    );

    if (filas.length === 0) {
      throw new AppError('ATENCION_NO_ENCONTRADA', 'La atención médica solicitada no existe.', 404);
    }

    return filas[0];
  },

  /**
   * Registro de nueva atención médica escolar.
   * Regla de negocio: la fecha y hora la genera el servidor (NOW()).
   * El identificador del profesional sale estrictamente del token JWT verificado.
   */
  async crear({ id_estudiante, motivo_sintomas, observaciones_diagnostico, tratamiento }, { usuarioAutenticado, ip, userAgent }) {
    // Validar existencia del estudiante
    const [estudiantes] = await pool.execute(
      'SELECT id_estudiante, nombre_completo, activo FROM estudiante WHERE id_estudiante = ? LIMIT 1',
      [id_estudiante]
    );

    if (estudiantes.length === 0 || estudiantes[0].activo !== 1) {
      throw new AppError('ESTUDIANTE_INACTIVO', 'El estudiante seleccionado no existe o se encuentra inactivo.', 400);
    }

    const estudiante = estudiantes[0];

    // Generar código único de atención VIS-xxx
    const [maxRows] = await pool.execute('SELECT MAX(id_atencion) AS max_id FROM atencion');
    const siguienteId = (maxRows[0].max_id || 0) + 1;
    const codigo = `VIS-${String(siguienteId).padStart(3, '0')}`;

    const [res] = await pool.execute(
      `INSERT INTO atencion (codigo, id_estudiante, id_usuario, motivo_sintomas, observaciones_diagnostico, tratamiento, fecha_hora, activo)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-5 hours'), 1)`,
      [
        codigo,
        id_estudiante,
        usuarioAutenticado.id_usuario,
        motivo_sintomas.trim(),
        observaciones_diagnostico.trim(),
        tratamiento.trim()
      ]
    );

    const idAtencion = res.insertId;

    // Consultar registro recién creado con fecha generada por el servidor
    const [nueva] = await pool.execute(
      'SELECT id_atencion, codigo, id_estudiante, id_usuario, motivo_sintomas, observaciones_diagnostico, tratamiento, fecha_hora FROM atencion WHERE id_atencion = ?',
      [idAtencion]
    );

    // Auditoría
    await auditoriaService.registrar({
      id_usuario: usuarioAutenticado.id_usuario,
      usuario_email: usuarioAutenticado.email,
      rol: usuarioAutenticado.rol,
      accion: 'CREAR_ATENCION',
      detalles: {
        id_atencion: idAtencion,
        codigo,
        id_estudiante,
        estudiante: estudiante.nombre_completo,
        motivo: motivo_sintomas
      },
      ip,
      user_agent: userAgent
    });

    return nueva[0];
  }
};

