import { pool } from '../db/pool.js';
import { conTransaccion } from '../db/transaccion.js';
import { AppError } from '../middleware/errorHandler.js';
import { auditoriaService } from './auditoriaService.js';

export const estudianteService = {
  /**
   * Listado paginado de estudiantes utilizando la vista v_estudiante_resumen
   */
  async listar({ grado, q, activo = 1, page = 1, limit = 10 }) {
    const offset = (Number(page) - 1) * Number(limit);
    const condiciones = [];
    const params = [];

    if (activo !== undefined && activo !== null && activo !== '') {
      condiciones.push('activo = ?');
      params.push(Number(activo));
    }

    if (grado) {
      if (!isNaN(grado)) {
        condiciones.push('id_grado = ?');
        params.push(Number(grado));
      } else {
        condiciones.push('curso LIKE ?');
        params.push(`%${grado}%`);
      }
    }

    if (q) {
      condiciones.push('(nombre_completo LIKE ? OR documento LIKE ? OR numero_documento LIKE ? OR codigo LIKE ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }

    const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    const [conteo] = await pool.execute(
      `SELECT COUNT(*) AS total FROM v_estudiante_resumen ${where}`,
      params
    );
    const total = conteo[0].total;

    const [estudiantes] = await pool.execute(
      `SELECT 
        id_estudiante, codigo, nombre_completo, documento, numero_documento,
        tipo_documento, edad, id_grado, curso, direccion, correo,
        acudiente, contacto, alergias, enfermedades, total_atenciones,
        es_recurrente, activo, created_at
       FROM v_estudiante_resumen
       ${where}
       ORDER BY nombre_completo ASC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );

    return {
      data: estudiantes,
      meta: {
        total,
        pagina: Number(page),
        limite: Number(limit),
        total_paginas: Math.ceil(total / Number(limit)) || 1
      }
    };
  },

  /**
   * Obtiene la información básica y detallada de un estudiante por su ID
   */
  async obtenerPorId(idEstudiante) {
    const [filas] = await pool.execute(
      `SELECT e.*, td.codigo AS tipo_documento_codigo, td.nombre AS tipo_documento_nombre,
              g.nombre AS grado_nombre, g.nivel AS grado_nivel,
              a.nombre_completo AS acudiente_nombre, a.telefono AS acudiente_telefono,
              a.parentesco AS acudiente_parentesco, a.correo AS acudiente_correo
       FROM estudiante e
       INNER JOIN tipo_documento td ON e.id_tipo_documento = td.id_tipo_documento
       INNER JOIN grado g ON e.id_grado = g.id_grado
       INNER JOIN acudiente a ON e.id_acudiente = a.id_acudiente
       WHERE e.id_estudiante = ? LIMIT 1`,
      [idEstudiante]
    );

    if (filas.length === 0) {
      throw new AppError('ESTUDIANTE_NO_ENCONTRADO', 'El estudiante solicitado no existe en la base de datos.', 404);
    }

    const est = filas[0];

    const [alergias] = await pool.execute(
      'SELECT id_alergia, tipo, descripcion FROM alergia WHERE id_estudiante = ? AND activo = 1',
      [idEstudiante]
    );

    const [condiciones] = await pool.execute(
      'SELECT id_condicion_medica, nombre, descripcion FROM condicion_medica WHERE id_estudiante = ? AND activo = 1',
      [idEstudiante]
    );

    const [ficha] = await pool.execute(
      'SELECT id_ficha_medica, grupo_sanguineo, eps, observaciones_generales FROM ficha_medica WHERE id_estudiante = ? AND activo = 1 LIMIT 1',
      [idEstudiante]
    );

    return {
      ...est,
      ficha_medica: ficha[0] || null,
      alergias,
      condiciones_medicas: condiciones
    };
  },

  /**
   * Obtiene la Ficha Médica Completa para el historial clínico del alumno
   */
  async obtenerFicha(idEstudiante, { usuarioAutenticado, ip, userAgent }) {
    const estudiante = await this.obtenerPorId(idEstudiante);

    // Conteo de atenciones y estado de recurrencia calculado en BD
    const [stats] = await pool.execute(
      `SELECT COUNT(id_atencion) AS total_atenciones,
              CASE WHEN COUNT(id_atencion) >= 3 THEN 1 ELSE 0 END AS es_recurrente
       FROM atencion
       WHERE id_estudiante = ? AND activo = 1`,
      [idEstudiante]
    );

    // Últimas atenciones clínicas registradas
    const [ultimasAtenciones] = await pool.execute(
      `SELECT a.id_atencion, a.codigo, a.fecha_hora, a.motivo_sintomas,
              a.observaciones_diagnostico, a.tratamiento, u.nombre_completo AS atendido_por
       FROM atencion a
       INNER JOIN usuario u ON a.id_usuario = u.id_usuario
       WHERE a.id_estudiante = ? AND a.activo = 1
       ORDER BY a.fecha_hora DESC
       LIMIT 10`,
      [idEstudiante]
    );

    // Registrar en auditoría la consulta de la ficha médica sensible
    await auditoriaService.registrar({
      id_usuario: usuarioAutenticado?.id_usuario,
      usuario_email: usuarioAutenticado?.email,
      rol: usuarioAutenticado?.rol,
      accion: 'CONSULTAR_FICHA',
      detalles: { id_estudiante: idEstudiante, nombre: estudiante.nombre_completo },
      ip,
      user_agent: userAgent
    });

    return {
      estudiante: {
        id_estudiante: estudiante.id_estudiante,
        codigo: estudiante.codigo,
        nombre_completo: estudiante.nombre_completo,
        nombres: estudiante.nombres,
        apellidos: estudiante.apellidos,
        tipo_documento: estudiante.tipo_documento_codigo,
        numero_documento: estudiante.numero_documento,
        edad: estudiante.edad,
        direccion: estudiante.direccion,
        correo: estudiante.correo,
        grado: estudiante.grado_nombre,
        id_grado: estudiante.id_grado
      },
      acudientes: [
        {
          id_acudiente: estudiante.id_acudiente,
          nombre_completo: estudiante.acudiente_nombre,
          telefono: estudiante.acudiente_telefono,
          parentesco: estudiante.acudiente_parentesco,
          correo: estudiante.acudiente_correo
        }
      ],
      ficha_medica: estudiante.ficha_medica,
      alergias: estudiante.alergias,
      condiciones: estudiante.condiciones_medicas,
      total_visitas: Number(stats[0].total_atenciones),
      es_recurrente: Number(stats[0].es_recurrente),
      ultimas_atenciones: ultimasAtenciones
    };
  },

  /**
   * Registro de nuevo estudiante dentro de transacción
   */
  async crear(datos, { usuarioAutenticado, ip, userAgent }) {
    return await conTransaccion(async (conn) => {
      // 1. Manejar Acudiente
      let idAcudiente = datos.id_acudiente;
      if (!idAcudiente && datos.acudiente) {
        const [resAc] = await conn.execute(
          `INSERT INTO acudiente (nombre_completo, telefono, parentesco, direccion, correo)
           VALUES (?, ?, ?, ?, ?)`,
          [
            datos.acudiente.nombre_completo,
            datos.acudiente.telefono,
            datos.acudiente.parentesco || 'Tutor Legal',
            datos.acudiente.direccion || datos.direccion || null,
            datos.acudiente.correo || null
          ]
        );
        idAcudiente = resAc.insertId;
      } else if (!idAcudiente && Array.isArray(datos.acudientes) && datos.acudientes.length > 0) {
        const ac = datos.acudientes[0];
        const [resAc] = await conn.execute(
          `INSERT INTO acudiente (nombre_completo, telefono, parentesco, direccion, correo)
           VALUES (?, ?, ?, ?, ?)`,
          [ac.nombre_completo, ac.telefono, ac.parentesco || 'Tutor Legal', ac.direccion || null, ac.correo || null]
        );
        idAcudiente = resAc.insertId;
      }

      if (!idAcudiente) {
        throw new AppError('ACUDIENTE_REQUERIDO', 'Debe especificar los datos de contacto del acudiente o tutor legal.', 400);
      }

      // 2. Generar código de estudiante si no viene
      let codigo = datos.codigo;
      if (!codigo) {
        const [maxFilas] = await conn.execute('SELECT MAX(id_estudiante) AS max_id FROM estudiante');
        const siguiente = (maxFilas[0].max_id || 0) + 1;
        let candidato = `STU-${String(siguiente).padStart(3, '0')}`;
        const [existe] = await conn.execute('SELECT id_estudiante FROM estudiante WHERE codigo = ?', [candidato]);
        if (existe.length > 0) {
          candidato = `STU-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 90 + 10)}`;
        }
        codigo = candidato;
      }

      const nombreCompleto = `${datos.nombres.trim()} ${datos.apellidos.trim()}`;

      // 3. Insertar estudiante
      const [resEst] = await conn.execute(
        `INSERT INTO estudiante (codigo, id_tipo_documento, numero_documento, nombres, apellidos, nombre_completo, edad, direccion, correo, id_grado, id_acudiente, activo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          codigo,
          datos.id_tipo_documento,
          datos.numero_documento,
          datos.nombres.trim(),
          datos.apellidos.trim(),
          nombreCompleto,
          datos.edad || null,
          datos.direccion || null,
          datos.correo || null,
          datos.id_grado,
          idAcudiente
        ]
      );
      const idEstudiante = resEst.insertId;

      // 4. Ficha médica
      await conn.execute(
        `INSERT INTO ficha_medica (id_estudiante, grupo_sanguineo, eps, observaciones_generales)
         VALUES (?, ?, ?, ?)`,
        [
          idEstudiante,
          datos.grupo_sanguineo || datos.ficha_medica?.grupo_sanguineo || null,
          datos.eps || datos.ficha_medica?.eps || null,
          datos.observaciones_generales || datos.ficha_medica?.observaciones_generales || null
        ]
      );

      // 5. Alergias
      if (Array.isArray(datos.alergias) && datos.alergias.length > 0) {
        for (const item of datos.alergias) {
          const desc = typeof item === 'string' ? item : item.descripcion;
          const tipo = typeof item === 'string' ? 'General' : (item.tipo || 'General');
          if (desc && desc.trim()) {
            await conn.execute(
              `INSERT INTO alergia (id_estudiante, tipo, descripcion, activo) VALUES (?, ?, ?, 1)`,
              [idEstudiante, tipo, desc.trim()]
            );
          }
        }
      }

      // 6. Condiciones médicas
      if (Array.isArray(datos.condiciones) && datos.condiciones.length > 0) {
        for (const item of datos.condiciones) {
          const nom = typeof item === 'string' ? item : item.nombre;
          const desc = typeof item === 'string' ? '' : (item.descripcion || '');
          if (nom && nom.trim()) {
            await conn.execute(
              `INSERT INTO condicion_medica (id_estudiante, nombre, descripcion, activo) VALUES (?, ?, ?, 1)`,
              [idEstudiante, nom.trim(), desc]
            );
          }
        }
      }

      // 7. Auditoría
      await auditoriaService.registrar({
        id_usuario: usuarioAutenticado?.id_usuario,
        usuario_email: usuarioAutenticado?.email,
        rol: usuarioAutenticado?.rol,
        accion: 'CREAR_ESTUDIANTE',
        detalles: { id_estudiante: idEstudiante, codigo, nombre_completo: nombreCompleto },
        ip,
        user_agent: userAgent
      }, conn);

      return {
        id_estudiante: idEstudiante,
        codigo,
        nombre_completo: nombreCompleto,
        numero_documento: datos.numero_documento
      };
    });
  },

  /**
   * Actualización de estudiante reemplazando acudientes, alergias y condiciones dentro de una transacción
   */
  async actualizar(idEstudiante, datos, { usuarioAutenticado, ip, userAgent }) {
    return await conTransaccion(async (conn) => {
      // Verificar existencia
      const [prev] = await conn.execute(
        'SELECT id_estudiante, id_acudiente, nombre_completo FROM estudiante WHERE id_estudiante = ? LIMIT 1',
        [idEstudiante]
      );
      if (prev.length === 0) {
        throw new AppError('ESTUDIANTE_NO_ENCONTRADO', 'El estudiante a modificar no existe.', 404);
      }

      // 1. Reemplazo / actualización de acudiente
      let idAcudienteActual = prev[0].id_acudiente;
      const acudienteData = datos.acudiente || (Array.isArray(datos.acudientes) && datos.acudientes[0]);
      if (acudienteData) {
        await conn.execute(
          `UPDATE acudiente
           SET nombre_completo = COALESCE(?, nombre_completo),
               telefono = COALESCE(?, telefono),
               parentesco = COALESCE(?, parentesco),
               direccion = COALESCE(?, direccion),
               correo = COALESCE(?, correo)
           WHERE id_acudiente = ?`,
          [
            acudienteData.nombre_completo || null,
            acudienteData.telefono || null,
            acudienteData.parentesco || null,
            acudienteData.direccion || null,
            acudienteData.correo || null,
            idAcudienteActual
          ]
        );
      }

      // 2. Actualizar datos de estudiante
      const nombres = datos.nombres !== undefined ? datos.nombres.trim() : null;
      const apellidos = datos.apellidos !== undefined ? datos.apellidos.trim() : null;
      let nuevoNombreCompleto = datos.nombre_completo;
      if (nombres && apellidos) {
        nuevoNombreCompleto = `${nombres} ${apellidos}`;
      }

      await conn.execute(
        `UPDATE estudiante
         SET id_tipo_documento = COALESCE(?, id_tipo_documento),
             numero_documento = COALESCE(?, numero_documento),
             nombres = COALESCE(?, nombres),
             apellidos = COALESCE(?, apellidos),
             nombre_completo = COALESCE(?, nombre_completo),
             edad = COALESCE(?, edad),
             direccion = COALESCE(?, direccion),
             correo = COALESCE(?, correo),
             id_grado = COALESCE(?, id_grado)
         WHERE id_estudiante = ?`,
        [
          datos.id_tipo_documento || null,
          datos.numero_documento || null,
          nombres,
          apellidos,
          nuevoNombreCompleto || null,
          datos.edad !== undefined ? datos.edad : null,
          datos.direccion !== undefined ? datos.direccion : null,
          datos.correo !== undefined ? datos.correo : null,
          datos.id_grado || null,
          idEstudiante
        ]
      );

      // 3. Ficha médica
      if (datos.ficha_medica || datos.eps || datos.grupo_sanguineo) {
        const eps = datos.ficha_medica?.eps || datos.eps || null;
        const grupo = datos.ficha_medica?.grupo_sanguineo || datos.grupo_sanguineo || null;
        const obs = datos.ficha_medica?.observaciones_generales || datos.observaciones_generales || null;

        await conn.execute(
          `INSERT INTO ficha_medica (id_estudiante, grupo_sanguineo, eps, observaciones_generales)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(id_estudiante) DO UPDATE SET
             grupo_sanguineo = COALESCE(excluded.grupo_sanguineo, grupo_sanguineo),
             eps = COALESCE(excluded.eps, eps),
             observaciones_generales = COALESCE(excluded.observaciones_generales, observaciones_generales),
             updated_at = datetime('now', '-5 hours')`,
          [idEstudiante, grupo, eps, obs]
        );
      }

      // 4. Reemplazo atómico de alergias (si se envía el campo alergias)
      if (Array.isArray(datos.alergias)) {
        await conn.execute('DELETE FROM alergia WHERE id_estudiante = ?', [idEstudiante]);
        for (const item of datos.alergias) {
          const desc = typeof item === 'string' ? item : item.descripcion;
          const tipo = typeof item === 'string' ? 'General' : (item.tipo || 'General');
          if (desc && desc.trim()) {
            await conn.execute(
              `INSERT INTO alergia (id_estudiante, tipo, descripcion, activo) VALUES (?, ?, ?, 1)`,
              [idEstudiante, tipo, desc.trim()]
            );
          }
        }
      }

      // 5. Reemplazo atómico de condiciones médicas (si se envía el campo condiciones)
      if (Array.isArray(datos.condiciones)) {
        await conn.execute('DELETE FROM condicion_medica WHERE id_estudiante = ?', [idEstudiante]);
        for (const item of datos.condiciones) {
          const nom = typeof item === 'string' ? item : item.nombre;
          const desc = typeof item === 'string' ? '' : (item.descripcion || '');
          if (nom && nom.trim()) {
            await conn.execute(
              `INSERT INTO condicion_medica (id_estudiante, nombre, descripcion, activo) VALUES (?, ?, ?, 1)`,
              [idEstudiante, nom.trim(), desc]
            );
          }
        }
      }

      // 6. Auditoría
      await auditoriaService.registrar({
        id_usuario: usuarioAutenticado?.id_usuario,
        usuario_email: usuarioAutenticado?.email,
        rol: usuarioAutenticado?.rol,
        accion: 'EDITAR_ESTUDIANTE',
        detalles: { id_estudiante: idEstudiante, cambios: datos },
        ip,
        user_agent: userAgent
      }, conn);

      return {
        id_estudiante: idEstudiante,
        mensaje: 'Estudiante y ficha actualizados exitosamente.'
      };
    });
  },

  /**
   * Borrado lógico (activar/desactivar) de estudiante
   */
  async cambiarActivo(idEstudiante, activo, { usuarioAutenticado, ip, userAgent }) {
    const nuevoEstado = activo ? 1 : 0;
    const [res] = await pool.execute(
      'UPDATE estudiante SET activo = ? WHERE id_estudiante = ?',
      [nuevoEstado, idEstudiante]
    );

    if (res.affectedRows === 0) {
      throw new AppError('ESTUDIANTE_NO_ENCONTRADO', 'El estudiante no existe.', 404);
    }

    await auditoriaService.registrar({
      id_usuario: usuarioAutenticado?.id_usuario,
      usuario_email: usuarioAutenticado?.email,
      rol: usuarioAutenticado?.rol,
      accion: nuevoEstado ? 'ACTIVAR_ESTUDIANTE' : 'DESACTIVAR_ESTUDIANTE',
      detalles: { id_estudiante: idEstudiante, activo: nuevoEstado },
      ip,
      user_agent: userAgent
    });

    return { id_estudiante: idEstudiante, activo: nuevoEstado };
  }
};

