import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../..');

// Cargar .env desde la raíz del proyecto o cwd
dotenv.config({ path: path.join(projectRoot, '.env') });
dotenv.config();

const defaultDbPath = path.join(projectRoot, 'database', 'samgy.sqlite');

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DB_PATH: z.string().min(1).default(defaultDbPath),
  JWT_SECRET: z.string().min(32, 'La variable de entorno JWT_SECRET debe tener al menos 32 caracteres para ser criptográficamente segura.'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  ADMIN_CORREO: z.string().email('La variable de entorno ADMIN_CORREO debe ser un correo institucional válido.'),
  ADMIN_PASSWORD: z.string().min(10, 'La variable de entorno ADMIN_PASSWORD debe tener al menos 10 caracteres.'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  FRONTEND_PATH: z.string().optional()
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('\n=============================================================');
  console.error('❌ ERROR FATAL AL INICIAR SAMGY API: Variables de entorno inválidas');
  console.error('=============================================================');
  parsed.error.errors.forEach(err => {
    console.error(`- Campo [${err.path.join('.')}]: ${err.message}`);
  });
  console.error('=============================================================\n');
  process.exit(1);
}

// Resolver DB_PATH relativa respecto a la raíz del proyecto si no es ':memory:' ni absoluta
const resolvedDbPath =
  parsed.data.DB_PATH === ':memory:' || path.isAbsolute(parsed.data.DB_PATH)
    ? parsed.data.DB_PATH
    : path.resolve(projectRoot, parsed.data.DB_PATH);

export const env = {
  ...parsed.data,
  DB_PATH: resolvedDbPath
};
