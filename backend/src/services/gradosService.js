import { pool } from '../db/pool.js';

export const gradosService = {
  async listar() {
    const [filas] = await pool.execute(
      'SELECT id_grado, nombre, nivel, activo FROM grado WHERE activo = 1 ORDER BY id_grado ASC'
    );
    return filas;
  }
};

