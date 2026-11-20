import { pool } from './pool.js';

/**
 * Helper para ejecutar operaciones SQL dentro de una transacción atómica segura en SQLite.
 * Garantiza rollback automático ante cualquier fallo.
 * @template T
 * @param {(connection: any) => Promise<T>} operacion
 * @returns {Promise<T>}
 */
export async function conTransaccion(operacion) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const resultado = await operacion(connection);
    await connection.commit();
    return resultado;
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error('Error durante el rollback de la transacción:', rollbackError.message);
    }
    throw error;
  } finally {
    connection.release();
  }
}
