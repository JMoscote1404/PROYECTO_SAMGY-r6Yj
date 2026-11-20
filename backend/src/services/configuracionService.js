import { pool } from '../db/pool.js';
import { auditoriaService } from './auditoriaService.js';

export const configuracionService = {
  /**
   * Obtiene todos los parámetros globales de configuración del sistema
   */
  async obtener() {
    const [filas] = await pool.execute('SELECT clave, valor, descripcion, updated_at FROM configuracion');
    const configMap = {};
    filas.forEach(f => {
      configMap[f.clave] = f.valor;
    });

    return {
      parametros: configMap,
      detalles: filas
    };
  },

  /**
   * Actualiza parámetros de configuración institucional
   */
  async actualizar(valores, { usuarioAutenticado, ip, userAgent }) {
    const entradas = Object.entries(valores);

    for (const [clave, valor] of entradas) {
      if (valor !== undefined && valor !== null) {
        await pool.execute(
          `INSERT INTO configuracion (clave, valor)
           VALUES (?, ?)
           ON CONFLICT(clave) DO UPDATE SET
             valor = excluded.valor,
             updated_at = datetime('now', '-5 hours')`,
          [clave, String(valor)]
        );
      }
    }

    await auditoriaService.registrar({
      id_usuario: usuarioAutenticado?.id_usuario,
      usuario_email: usuarioAutenticado?.email,
      rol: usuarioAutenticado?.rol,
      accion: 'ACTUALIZAR_CONFIGURACION',
      detalles: valores,
      ip,
      user_agent: userAgent
    });

    return await this.obtener();
  }
};

