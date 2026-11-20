import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const databaseDir = path.resolve(__dirname, '../../../database');

let dbInstance = null;
let initialized = false;

/**
 * Normaliza parámetros para SQLite (convierte undefined a null y booleanos a 1/0)
 */
function normalizarParams(params = []) {
  return params.map((p) => {
    if (p === undefined) return null;
    if (typeof p === 'boolean') return p ? 1 : 0;
    return p;
  });
}

/**
 * Determina si una sentencia SQL retorna filas (SELECT / PRAGMA / WITH)
 */
function esConsultaDeLectura(sql) {
  const trimmed = sql.trimStart().toUpperCase();
  return (
    trimmed.startsWith('SELECT') ||
    trimmed.startsWith('WITH') ||
    trimmed.startsWith('PRAGMA')
  );
}

/**
 * Obtiene o abre la instancia única de SQLite y asegura que el esquema y semilla existan.
 */
export function obtenerDb() {
  if (!dbInstance) {
    if (env.DB_PATH !== ':memory:') {
      const dir = path.dirname(env.DB_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    dbInstance = new DatabaseSync(env.DB_PATH);
    dbInstance.exec('PRAGMA busy_timeout = 5000;');
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    if (env.DB_PATH !== ':memory:') {
      dbInstance.exec('PRAGMA journal_mode = WAL;');
    }
  }

  if (!initialized) {
    initialized = true;
    inicializarEsquemaSiVacia(dbInstance);
  }

  return dbInstance;
}

/**
 * Verifica si la base de datos ya tiene tablas; si está vacía, ejecuta 01_schema.sql y 02_seed.sql.
 */
function inicializarEsquemaSiVacia(db) {
  const tabla = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='usuario'")
    .get();

  if (!tabla) {
    const schemaPath = path.join(databaseDir, '01_schema.sql');
    const seedPath = path.join(databaseDir, '02_seed.sql');

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schemaSql);

    if (fs.existsSync(seedPath)) {
      const seedSql = fs.readFileSync(seedPath, 'utf8');
      db.exec(seedSql);
    }

    if (env.NODE_ENV !== 'test') {
      console.log(`✅ Base de datos SQLite inicializada con esquema y datos semilla en: ${env.DB_PATH}`);
    }
  }
}

/**
 * Reinicia completamente la base de datos (usado principalmente en pruebas automatizadas)
 */
export function reiniciarBaseDeDatos() {
  const db = obtenerDb();
  const schemaPath = path.join(databaseDir, '01_schema.sql');
  const seedPath = path.join(databaseDir, '02_seed.sql');
  db.exec(fs.readFileSync(schemaPath, 'utf8'));
  if (fs.existsSync(seedPath)) {
    db.exec(fs.readFileSync(seedPath, 'utf8'));
  }
}

/**
 * Ejecuta una sentencia SQL compatible con la interfaz [rows, fields] de mysql2/promise
 */
async function executeQuery(sql, params = []) {
  const db = obtenerDb();
  const safeParams = normalizarParams(params);
  const stmt = db.prepare(sql);

  if (esConsultaDeLectura(sql)) {
    const rawRows = stmt.all(...safeParams);
    // Convertir objetos sin prototipo de node:sqlite a objetos planos JS
    const rows = rawRows.map((row) => ({ ...row }));
    return [rows, []];
  }

  const info = stmt.run(...safeParams);
  return [
    {
      insertId: Number(info.lastInsertRowid || 0),
      affectedRows: Number(info.changes || 0)
    },
    []
  ];
}

/**
 * Objeto pool compatible con la interfaz utilizada por los servicios
 */
export const pool = {
  execute: executeQuery,
  query: executeQuery,

  async getConnection() {
    const db = obtenerDb();
    return {
      execute: executeQuery,
      query: executeQuery,
      async ping() {
        db.prepare('SELECT 1').get();
      },
      async beginTransaction() {
        db.exec('BEGIN IMMEDIATE');
      },
      async commit() {
        db.exec('COMMIT');
      },
      async rollback() {
        db.exec('ROLLBACK');
      },
      release() {
        // En SQLite la conexión es local y persistente
      }
    };
  },

  async end() {
    if (dbInstance) {
      dbInstance.close();
      dbInstance = null;
      initialized = false;
    }
  }
};

/**
 * Función para probar conectividad e inicialización con SQLite
 */
export async function probarConexion() {
  try {
    const db = obtenerDb();
    db.prepare('SELECT 1 AS ok').get();
    console.log(`✅ Conexión con base de datos SQLite establecida exitosamente (${env.DB_PATH}).`);
    return true;
  } catch (error) {
    console.error('❌ Error crítico al conectar con SQLite:', error.message);
    throw error;
  }
}
