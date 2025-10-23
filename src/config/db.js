// src/config/db.js
import sql from 'mssql';
import 'dotenv/config';

function bool(v, def = false) {
  if (v === undefined || v === null || v === '') return def;
  const s = String(v).toLowerCase().trim();
  return ['1', 'true', 'yes', 'y', 'on'].includes(s);
}

const env = process.env;

// Parámetros base desde .env
const SERVER     = env.DB_SERVER || 'localhost';
const DB_NAME    = env.DB_NAME   || env.DB_DATABASE || 'SistemaTurnos';
const USER       = env.DB_USER   || 'sa';
const PASSWORD   = env.DB_PASSWORD || '';
const INSTANCE   = (env.DB_INSTANCE || '').trim(); // para SQL Express local
const PORT_RAW   = (env.DB_PORT || '').trim();     // si el hosting diera puerto distinto

// Opciones de seguridad
const ENCRYPT    = bool(env.DB_ENCRYPT, true);       // en hosting suele ser true
const TRUST_CERT = bool(env.DB_TRUST_CERT, true);    // true si no hay CA pública

// Armar configuración dinámica
const baseOptions = {
  encrypt: ENCRYPT,
  trustServerCertificate: TRUST_CERT,
};

// Si hay instancia, mssql usa options.instanceName
if (INSTANCE) {
  baseOptions.instanceName = INSTANCE;
}

// Si viene puerto explícito y NO hay instance, se usa 'port'
const port = PORT_RAW ? Number(PORT_RAW) : undefined;

// Config final para mssql
const sqlConfig = {
  user: USER,
  password: PASSWORD,
  server: SERVER,         // p.ej: SQL1002.site4now.net
  database: DB_NAME,      // p.ej: db_abdac7_sistematurnos
  options: baseOptions,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  }
};

// Agregar puerto si fue provisto y no hay instancia
if (port && !INSTANCE) {
  sqlConfig.port = port;
}

// Export helpers
let _poolPromise = null;

export async function getPool() {
  if (_poolPromise) return _poolPromise;
  _poolPromise = sql.connect(sqlConfig).catch(err => {
    // si falla, limpiar para reintento siguiente
    _poolPromise = null;
    console.error('❌ Error conectando a SQL Server:', err?.message || err);
    throw err;
  });
  return _poolPromise;
}

export { sql };
