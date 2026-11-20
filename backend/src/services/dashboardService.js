import { pool } from '../db/pool.js';

export const dashboardService = {
  /**
   * Consolida métricas epidemiológicas y operacionales para el panel principal
   */
  async obtenerMetricas() {
    // 1. Total de estudiantes activos
    const [resEstudiantes] = await pool.execute(
      'SELECT COUNT(*) AS total FROM estudiante WHERE activo = 1'
    );
    const totalEstudiantesActivos = resEstudiantes[0].total;

    // 2. Total de atenciones activas
    const [resAtenciones] = await pool.execute(
      'SELECT COUNT(*) AS total FROM atencion WHERE activo = 1'
    );
    const totalAtenciones = resAtenciones[0].total;

    // 3. Estudiantes recurrentes (con 3 o más visitas registradas)
    const [resRecurrentes] = await pool.execute(
      `SELECT COUNT(*) AS total FROM (
         SELECT id_estudiante
         FROM atencion
         WHERE activo = 1
         GROUP BY id_estudiante
         HAVING COUNT(id_atencion) >= 3
       ) AS r`
    );
    const totalRecurrentes = resRecurrentes[0].total;

    // 4. Atenciones por día en los últimos 30 días
    const [atencionesPorDia] = await pool.execute(
      `SELECT strftime('%Y-%m-%d', fecha_hora) AS fecha, COUNT(*) AS total
       FROM atencion
       WHERE activo = 1 AND fecha_hora >= datetime('now', '-5 hours', '-30 days')
       GROUP BY strftime('%Y-%m-%d', fecha_hora)
       ORDER BY fecha ASC`
    );

    // 5. Los 8 motivos más frecuentes de consulta
    const [motivosFrecuentes] = await pool.execute(
      `SELECT motivo_sintomas AS motivo, COUNT(*) AS total
       FROM atencion
       WHERE activo = 1
       GROUP BY motivo_sintomas
       ORDER BY total DESC, motivo ASC
       LIMIT 8`
    );

    // 6. Distribución de atenciones por grado académico
    const [atencionesPorGrado] = await pool.execute(
      `SELECT g.nombre AS grado, COUNT(a.id_atencion) AS total
       FROM grado g
       LEFT JOIN estudiante e ON e.id_grado = g.id_grado AND e.activo = 1
       LEFT JOIN atencion a ON a.id_estudiante = e.id_estudiante AND a.activo = 1
       WHERE g.activo = 1
       GROUP BY g.id_grado, g.nombre
       ORDER BY g.id_grado ASC`
    );

    return {
      total_estudiantes_activos: Number(totalEstudiantesActivos),
      total_atenciones: Number(totalAtenciones),
      estudiantes_recurrentes: Number(totalRecurrentes),
      atenciones_ultimos_30_dias: atencionesPorDia.map(d => ({
        fecha: d.fecha,
        total: Number(d.total)
      })),
      motivos_frecuentes: motivosFrecuentes.map(m => ({
        motivo: m.motivo,
        total: Number(m.total)
      })),
      atenciones_por_grado: atencionesPorGrado.map(g => ({
        grado: g.grado,
        total: Number(g.total)
      }))
    };
  }
};

