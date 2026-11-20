-- =====================================================================
-- SAMGY — Sistema de Gestión de Enfermería Escolar
-- Colegio San Alberto Magno
-- 02_seed.sql: Datos semilla iniciales (SQLite)
-- =====================================================================

-- 1. Roles del Sistema
INSERT INTO rol (id_rol, nombre, descripcion) VALUES
(1, 'Administrador', 'Control total y administración técnica del sistema'),
(2, 'Enfermería', 'Personal de salud escolar responsable del registro y atención diaria');

-- 2. Usuarios del Sistema (Contraseñas hasheadas con bcrypt)
-- Hash válido para: Password123!
INSERT INTO usuario (id_usuario, id_rol, nombre_completo, email, password_hash, debe_cambiar_password) VALUES
(1, 1, 'Administrador SAMGY', 'admin@sanalbertomagno.edu.co', '$2b$10$VGLEw5T6xLBDL4XT1TuG/OPo1KV/UUsm0XU99PYKHg0X2C7rnvYBS', 0),
(2, 2, 'Lic. Claudia Patricia Gómez', 'enfermeria@sanalbertomagno.edu.co', '$2b$10$VGLEw5T6xLBDL4XT1TuG/OPo1KV/UUsm0XU99PYKHg0X2C7rnvYBS', 0);

-- 3. Grados Académicos
INSERT INTO grado (id_grado, nombre, nivel) VALUES
(1, 'Grado 6°', 'Secundaria'),
(2, 'Grado 7°', 'Secundaria'),
(3, 'Grado 8°', 'Secundaria'),
(4, 'Grado 9°', 'Secundaria'),
(5, 'Grado 10°', 'Media'),
(6, 'Grado 11°', 'Media');

-- 4. Tipos de Documento
INSERT INTO tipo_documento (id_tipo_documento, codigo, nombre) VALUES
(1, 'TI', 'Tarjeta de Identidad'),
(2, 'CC', 'Cédula de Ciudadanía'),
(3, 'RC', 'Registro Civil'),
(4, 'CE', 'Cédula de Extranjería');

-- 5. Acudientes (Tutores Legales)
INSERT INTO acudiente (id_acudiente, nombre_completo, telefono, parentesco, direccion, correo) VALUES
(1, 'María Rodríguez', '3001234567', 'Madre', 'Calle 45 # 12-34', 'maria.rodriguez@familia.edu.co'),
(2, 'Roberto Mendoza', '3119876543', 'Padre', 'Cra 18 # 56-89', 'roberto.mendoza@familia.edu.co'),
(3, 'Jorge Silva', '3204567890', 'Padre', 'Calle 80 # 23-11', 'jorge.silva@familia.edu.co'),
(4, 'Lucía Castro', '3156543210', 'Madre', 'Cra 52 # 74-10', 'lucia.castro@familia.edu.co'),
(5, 'Fernando Torres', '3182345678', 'Padre', 'Calle 12 # 45-67', 'fernando.torres@familia.edu.co'),
(6, 'Diana Morales', '3138765432', 'Madre', 'Cra 30 # 15-22', 'diana.morales@familia.edu.co'),
(7, 'Andrés Ramírez', '3012345678', 'Padre', 'Calle 33 # 44-55', 'andres.ramirez@familia.edu.co');

-- 6. Estudiantes (7 estudiantes oficiales)
INSERT INTO estudiante (id_estudiante, codigo, id_tipo_documento, numero_documento, nombres, apellidos, nombre_completo, edad, direccion, correo, id_grado, id_acudiente) VALUES
(1, 'STU-001', 1, '1045689123', 'Laura', 'Martínez', 'Laura Martínez', 14, 'Calle 45 # 12-34', 'laura.martinez@estudiante.edu.co', 4, 1),
(2, 'STU-002', 1, '1045892301', 'Carlos Eduardo', 'Mendoza', 'Carlos Eduardo Mendoza', 12, 'Cra 18 # 56-89', 'carlos.mendoza@estudiante.edu.co', 1, 2),
(3, 'STU-003', 1, '1045892303', 'Santiago Alejandro', 'Silva', 'Santiago Alejandro Silva', 13, 'Calle 80 # 23-11', 'santiago.silva@estudiante.edu.co', 2, 3),
(4, 'STU-004', 1, '1045892304', 'Mariana', 'López Castro', 'Mariana López Castro', 13, 'Cra 52 # 74-10', 'mariana.lopez@estudiante.edu.co', 2, 4),
(5, 'STU-005', 1, '1045892305', 'Mateo Fernando', 'Torres', 'Mateo Fernando Torres', 14, 'Calle 12 # 45-67', 'mateo.torres@estudiante.edu.co', 3, 5),
(6, 'STU-006', 1, '1045892306', 'Camila Andrea', 'Morales', 'Camila Andrea Morales', 14, 'Cra 30 # 15-22', 'camila.morales@estudiante.edu.co', 3, 6),
(7, 'STU-007', 1, '1045892309', 'Gabriel José', 'Ramírez', 'Gabriel José Ramírez', 15, 'Calle 33 # 44-55', 'gabriel.ramirez@estudiante.edu.co', 5, 7);

-- 7. Fichas Médicas
INSERT INTO ficha_medica (id_ficha_medica, id_estudiante, grupo_sanguineo, eps, observaciones_generales) VALUES
(1, 1, 'O+', 'Sura EPS', 'Control periódico por cuadro de asma leve.'),
(2, 2, 'A+', 'Sanitas EPS', 'Sensibilidad estacional a polen y cambios climáticos.'),
(3, 3, 'B+', 'Compensar EPS', 'Alergia severa a maní. Requiere protocolo de emergencia.'),
(4, 4, 'O+', 'Salud Total EPS', 'Reacción cutánea alérgica documentada al ibuprofeno.'),
(5, 5, 'A-', 'Nueva EPS', 'Estudiante sin antecedentes clínicos de relevancia.'),
(6, 6, 'O+', 'Famisanar EPS', 'Alergia a mariscos y frutos de mar.'),
(7, 7, 'B-', 'Sura EPS', 'Manejo nutricional por gastritis diagnosticada.');

-- 8. Alergias
INSERT INTO alergia (id_estudiante, tipo, descripcion) VALUES
(1, 'Medicamento', 'Penicilina'),
(2, 'Ambiental', 'Polen'),
(3, 'Alimento', 'Maní'),
(4, 'Medicamento', 'Ibuprofeno'),
(6, 'Alimento', 'Mariscos'),
(7, 'Alimento', 'Lactosa');

-- 9. Condiciones Médicas / Enfermedades
INSERT INTO condicion_medica (id_estudiante, nombre, descripcion) VALUES
(1, 'Asma', 'Asma bronquial intermitente controlada con inhalador de rescate.'),
(3, 'Rinitis', 'Rinitis alérgica estacional activa.'),
(7, 'Gastritis', 'Gastritis erosiva leve en tratamiento médico dietario.');

-- 10. Atenciones de Enfermería
-- Laura Martínez (id=1): 4 atenciones -> es_recurrente = 1
-- Causas variadas recientes (últimos 20 días) para analítica epidemiológica escolar
INSERT INTO atencion (codigo, id_estudiante, id_usuario, motivo_sintomas, observaciones_diagnostico, tratamiento, fecha_hora) VALUES
('VIS-101', 1, 2, 'Dolor de cabeza', 'Tensión arterial normal 110/70. Sin signos neurológicos.', 'Descanso en camilla 20 min y rehidratación.', datetime('now', '-18 days', '-5 hours')),
('VIS-102', 1, 2, 'Mareos', 'Mareo leve relacionado con ayuno matutino prolongado.', 'Suministro de snack y agua. Reposo por 15 minutos.', datetime('now', '-15 days', '-5 hours')),
('VIS-103', 1, 2, 'Revisión de Peso', 'Control rutinario de crecimiento: peso 48 kg, talla 1.58 m.', 'Registro en ficha médica institucional.', datetime('now', '-12 days', '-5 hours')),
('VIS-104', 7, 2, 'Dolor de cabeza', 'Refiere desvelo prolongado por semana de exámenes.', 'Descanso en camilla y analgésico autorizado por acudiente.', datetime('now', '-10 days', '-5 hours')),
('VIS-105', 2, 2, 'Dolor abdominal', 'Cólico leve tras actividad física de educación física.', 'Infusión tibia de manzanilla y observación 20 minutos.', datetime('now', '-9 days', '-5 hours')),
('VIS-106', 3, 2, 'Golpe o raspadura', 'Abrasión superficial en rodilla derecha durante descanso.', 'Lavado con solución salina, antiséptico y curita estéril.', datetime('now', '-8 days', '-5 hours')),
('VIS-107', 4, 2, 'Dolor de cabeza', 'Cefalea leve frontal sin fiebre.', 'Hidratación oral y reposo en área tranquila.', datetime('now', '-7 days', '-5 hours')),
('VIS-108', 5, 2, 'Fiebre y malestar general', 'Temperatura 37.9°C, congestión nasal leve.', 'Medios físicos y notificación telefónica al acudiente.', datetime('now', '-6 days', '-5 hours')),
('VIS-109', 6, 2, 'Dolor abdominal', 'Malestar digestivo leve matutino.', 'Reposo en camilla 25 min y seguimiento de síntomas.', datetime('now', '-5 days', '-5 hours')),
('VIS-110', 2, 2, 'Golpe o raspadura', 'Contusión leve en antebrazo izquierdo sin hematoma grave.', 'Aplicación de compresa fría local por 15 minutos.', datetime('now', '-4 days', '-5 hours')),
('VIS-111', 3, 2, 'Mareos', 'Sensación transitoria de debilidad tras formación en patio.', 'Hidratación con agua y reposo sentado.', datetime('now', '-3 days', '-5 hours')),
('VIS-112', 4, 2, 'Dolor de cabeza', 'Cefalea tensional leve por carga académica.', 'Reposo en enfermería 15 min y control de signos.', datetime('now', '-2 days', '-5 hours')),
('VIS-113', 1, 2, 'Fiebre y malestar general', 'Febrícula de 37.8°C y fatiga leve.', 'Control térmico, hidratación y aviso a acudiente.', datetime('now', '-1 days', '-5 hours')),
('VIS-114', 5, 2, 'Dolor abdominal', 'Dolor epigástrico leve sin signos de alarma.', 'Reposo, hidratación y observación preventiva.', datetime('now', '-5 hours'));

-- 11. Configuraciones Predeterminadas
INSERT INTO configuracion (clave, valor, descripcion) VALUES
('nombre_institucion', 'Colegio San Alberto Magno', 'Nombre oficial del plantel educativo'),
('ano_lectivo', '2026', 'Año académico en curso'),
('umbral_recurrencia', '3', 'Cantidad de visitas mínimas para considerar a un estudiante recurrente'),
('contacto_emergencia', '(601) 745-8900', 'Línea de atención telefónica prioritaria institucional'),
('email_notificaciones', 'enfermeria@sanalbertomagno.edu.co', 'Buzón institucional para alertas y fichas');
