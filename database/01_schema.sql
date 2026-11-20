-- =====================================================================
-- SAMGY — Sistema de Gestión de Enfermería Escolar
-- Colegio San Alberto Magno
-- 01_schema.sql: Esquema DDL para SQLite
-- =====================================================================

PRAGMA foreign_keys = OFF;

-- Eliminar vistas si existen
DROP VIEW IF EXISTS v_atencion_detalle;
DROP VIEW IF EXISTS v_estudiante_resumen;

-- Eliminar tablas si existen (orden inverso de dependencia)
DROP TABLE IF EXISTS auditoria;
DROP TABLE IF EXISTS configuracion;
DROP TABLE IF EXISTS atencion;
DROP TABLE IF EXISTS condicion_medica;
DROP TABLE IF EXISTS alergia;
DROP TABLE IF EXISTS ficha_medica;
DROP TABLE IF EXISTS estudiante;
DROP TABLE IF EXISTS acudiente;
DROP TABLE IF EXISTS tipo_documento;
DROP TABLE IF EXISTS grado;
DROP TABLE IF EXISTS usuario;
DROP TABLE IF EXISTS rol;

PRAGMA foreign_keys = ON;

-- 1. Tabla: rol
CREATE TABLE rol (
    id_rol INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT NULL,
    activo INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT (datetime('now', '-5 hours'))
);

-- 2. Tabla: usuario
CREATE TABLE usuario (
    id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
    id_rol INTEGER NOT NULL,
    nombre_completo TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    debe_cambiar_password INTEGER NOT NULL DEFAULT 0,
    activo INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT (datetime('now', '-5 hours')),
    updated_at DATETIME NOT NULL DEFAULT (datetime('now', '-5 hours')),
    CONSTRAINT fk_usuario_rol FOREIGN KEY (id_rol) REFERENCES rol(id_rol) ON UPDATE CASCADE
);

-- 3. Tabla: grado
CREATE TABLE grado (
    id_grado INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    nivel TEXT NULL,
    activo INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT (datetime('now', '-5 hours'))
);

-- 4. Tabla: tipo_documento
CREATE TABLE tipo_documento (
    id_tipo_documento INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    activo INTEGER NOT NULL DEFAULT 1
);

-- 5. Tabla: acudiente
CREATE TABLE acudiente (
    id_acudiente INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_completo TEXT NOT NULL,
    telefono TEXT NOT NULL,
    parentesco TEXT NULL,
    direccion TEXT NULL,
    correo TEXT NULL,
    activo INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT (datetime('now', '-5 hours'))
);

-- 6. Tabla: estudiante
CREATE TABLE estudiante (
    id_estudiante INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT NOT NULL UNIQUE,
    id_tipo_documento INTEGER NOT NULL,
    numero_documento TEXT NOT NULL,
    nombres TEXT NOT NULL,
    apellidos TEXT NOT NULL,
    nombre_completo TEXT NOT NULL,
    edad INTEGER NULL,
    direccion TEXT NULL,
    correo TEXT NULL,
    id_grado INTEGER NOT NULL,
    id_acudiente INTEGER NOT NULL,
    activo INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT (datetime('now', '-5 hours')),
    updated_at DATETIME NOT NULL DEFAULT (datetime('now', '-5 hours')),
    CONSTRAINT uq_estudiante_documento UNIQUE (id_tipo_documento, numero_documento),
    CONSTRAINT fk_estudiante_tipo_documento FOREIGN KEY (id_tipo_documento) REFERENCES tipo_documento(id_tipo_documento) ON UPDATE CASCADE,
    CONSTRAINT fk_estudiante_grado FOREIGN KEY (id_grado) REFERENCES grado(id_grado) ON UPDATE CASCADE,
    CONSTRAINT fk_estudiante_acudiente FOREIGN KEY (id_acudiente) REFERENCES acudiente(id_acudiente) ON UPDATE CASCADE
);

-- 7. Tabla: ficha_medica
CREATE TABLE ficha_medica (
    id_ficha_medica INTEGER PRIMARY KEY AUTOINCREMENT,
    id_estudiante INTEGER NOT NULL UNIQUE,
    grupo_sanguineo TEXT NULL,
    eps TEXT NULL,
    observaciones_generales TEXT NULL,
    activo INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT (datetime('now', '-5 hours')),
    updated_at DATETIME NOT NULL DEFAULT (datetime('now', '-5 hours')),
    CONSTRAINT fk_ficha_estudiante FOREIGN KEY (id_estudiante) REFERENCES estudiante(id_estudiante) ON UPDATE CASCADE
);

-- 8. Tabla: alergia
CREATE TABLE alergia (
    id_alergia INTEGER PRIMARY KEY AUTOINCREMENT,
    id_estudiante INTEGER NOT NULL,
    tipo TEXT NULL,
    descripcion TEXT NOT NULL,
    activo INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT (datetime('now', '-5 hours')),
    CONSTRAINT fk_alergia_estudiante FOREIGN KEY (id_estudiante) REFERENCES estudiante(id_estudiante) ON UPDATE CASCADE
);

-- 9. Tabla: condicion_medica
CREATE TABLE condicion_medica (
    id_condicion_medica INTEGER PRIMARY KEY AUTOINCREMENT,
    id_estudiante INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT NULL,
    activo INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT (datetime('now', '-5 hours')),
    CONSTRAINT fk_condicion_estudiante FOREIGN KEY (id_estudiante) REFERENCES estudiante(id_estudiante) ON UPDATE CASCADE
);

-- 10. Tabla: atencion
-- No se permite eliminar ni editar registros clínicos físicamente.
-- La fecha y hora es generada automáticamente por el servidor.
CREATE TABLE atencion (
    id_atencion INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT NOT NULL UNIQUE,
    id_estudiante INTEGER NOT NULL,
    id_usuario INTEGER NOT NULL,
    motivo_sintomas TEXT NOT NULL,
    observaciones_diagnostico TEXT NOT NULL,
    tratamiento TEXT NOT NULL,
    fecha_hora DATETIME NOT NULL DEFAULT (datetime('now', '-5 hours')),
    activo INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT fk_atencion_estudiante FOREIGN KEY (id_estudiante) REFERENCES estudiante(id_estudiante) ON UPDATE CASCADE,
    CONSTRAINT fk_atencion_usuario FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON UPDATE CASCADE
);

-- 11. Tabla: configuracion
CREATE TABLE configuracion (
    id_configuracion INTEGER PRIMARY KEY AUTOINCREMENT,
    clave TEXT NOT NULL UNIQUE,
    valor TEXT NOT NULL,
    descripcion TEXT NULL,
    updated_at DATETIME NOT NULL DEFAULT (datetime('now', '-5 hours'))
);

-- 12. Tabla: auditoria
CREATE TABLE auditoria (
    id_auditoria INTEGER PRIMARY KEY AUTOINCREMENT,
    id_usuario INTEGER NULL,
    usuario_email TEXT NULL,
    rol TEXT NULL,
    accion TEXT NOT NULL,
    detalles TEXT NULL,
    ip TEXT NULL,
    user_agent TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT (datetime('now', '-5 hours')),
    CONSTRAINT fk_auditoria_usuario FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE SET NULL
);

-- =====================================================================
-- VISTAS DEL SISTEMA
-- =====================================================================

-- Vista 1: v_estudiante_resumen
-- Calcula el conteo de visitas y recurrencia (>= 3 visitas) dinámicamente.
CREATE VIEW v_estudiante_resumen AS
SELECT 
    e.id_estudiante,
    e.codigo,
    e.nombre_completo,
    (td.codigo || ' ' || e.numero_documento) AS documento,
    e.numero_documento,
    td.codigo AS tipo_documento,
    e.edad,
    e.id_grado,
    g.nombre AS curso,
    e.direccion,
    e.correo,
    ac.nombre_completo AS acudiente,
    ac.telefono AS contacto,
    COALESCE(
        (SELECT REPLACE(GROUP_CONCAT(DISTINCT al.descripcion), ',', ', ')
         FROM alergia al 
         WHERE al.id_estudiante = e.id_estudiante AND al.activo = 1),
        'Ninguna'
    ) AS alergias,
    COALESCE(
        (SELECT REPLACE(GROUP_CONCAT(DISTINCT cm.nombre), ',', ', ')
         FROM condicion_medica cm 
         WHERE cm.id_estudiante = e.id_estudiante AND cm.activo = 1),
        'Ninguna'
    ) AS enfermedades,
    COUNT(a.id_atencion) AS total_atenciones,
    CASE 
        WHEN COUNT(a.id_atencion) >= 3 THEN 1 
        ELSE 0 
    END AS es_recurrente,
    e.activo,
    e.created_at
FROM estudiante e
INNER JOIN tipo_documento td ON e.id_tipo_documento = td.id_tipo_documento
INNER JOIN grado g ON e.id_grado = g.id_grado
INNER JOIN acudiente ac ON e.id_acudiente = ac.id_acudiente
LEFT JOIN atencion a ON e.id_estudiante = a.id_estudiante AND a.activo = 1
WHERE e.activo = 1
GROUP BY 
    e.id_estudiante,
    e.codigo,
    e.nombre_completo,
    td.codigo,
    e.numero_documento,
    e.edad,
    e.id_grado,
    g.nombre,
    e.direccion,
    e.correo,
    ac.nombre_completo,
    ac.telefono,
    e.activo,
    e.created_at;

-- Vista 2: v_atencion_detalle
-- Detalle completo de atenciones para historial y reportes clínicos.
CREATE VIEW v_atencion_detalle AS
SELECT 
    a.id_atencion,
    a.codigo AS codigo_atencion,
    a.fecha_hora,
    e.id_estudiante,
    e.codigo AS codigo_estudiante,
    e.nombre_completo AS nombre_estudiante,
    (td.codigo || ' ' || e.numero_documento) AS documento_estudiante,
    g.nombre AS curso,
    u.id_usuario,
    u.nombre_completo AS atendido_por,
    r.nombre AS rol_atendio,
    a.motivo_sintomas,
    a.observaciones_diagnostico,
    a.tratamiento,
    a.activo
FROM atencion a
INNER JOIN estudiante e ON a.id_estudiante = e.id_estudiante
INNER JOIN tipo_documento td ON e.id_tipo_documento = td.id_tipo_documento
INNER JOIN grado g ON e.id_grado = g.id_grado
INNER JOIN usuario u ON a.id_usuario = u.id_usuario
INNER JOIN rol r ON u.id_rol = r.id_rol
WHERE a.activo = 1;
