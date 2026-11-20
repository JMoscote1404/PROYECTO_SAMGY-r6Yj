# SAMGY — Sistema de Gestión de Enfermería Escolar

**Colegio San Alberto Magno**  
Versión: `1.0.0` (Node.js + SQLite)  
Aplicativo web integral y seguro para el registro clínico, control sanitario preventivo, seguimiento de fichas médicas y atención diaria de los estudiantes de la institución San Alberto Magno.

> [!IMPORTANT]
> **Protección de Datos Sensibles**: Los registros tratados corresponden a **MENORES DE EDAD** y son de carácter clínico y confidencial (Ley 1581 de 2012 / Decreto 1377 de 2013). Todo acceso, consulta y modificación cuenta con auditoría inmutable en base de datos.

---

## 1. Requisitos Previos

- **Node.js** `v22.5.0` o superior (utiliza el motor nativo `node:sqlite` incluido en Node.js, **sin necesidad de Docker ni servidor MySQL**).
- **npm** (incluido con Node.js).

---

## 2. Instalación y Ejecución Paso a Paso

1. **Configurar las variables de entorno** (si no existe `.env`, copia el archivo de ejemplo):
   ```bash
   cp .env.example .env
   ```

2. **Instalar las dependencias del backend:**
   ```bash
   npm run setup
   ```
   *(Equivalente a `cd backend && npm install`)*

3. **Iniciar la aplicación:**
   ```bash
   npm start
   ```
   En el primer arranque, el sistema creará automáticamente la base de datos SQLite en `database/samgy.sqlite`, aplicará el esquema (`database/01_schema.sql`) y cargará los datos semilla iniciales (`database/02_seed.sql`).

4. **Acceder a la aplicación:**
   Abre tu navegador web e ingresa a:
   ```text
   http://127.0.0.1:3000
   ```

---

## 3. Variables de Entorno (`.env`)

| Variable | Descripción | Valor Predeterminado / Ejemplo |
| :--- | :--- | :--- |
| `NODE_ENV` | Entorno de ejecución (`development`, `production`, `test`) | `development` |
| `PORT` | Puerto HTTP donde corre la API y se sirve la SPA | `3000` |
| `DB_PATH` | Ruta al archivo de base de datos SQLite | `database/samgy.sqlite` |
| `JWT_SECRET` | Clave secreta para firma de tokens JWT (mínimo 32 caracteres) | *Cadena criptográfica aleatoria* |
| `JWT_EXPIRES_IN` | Tiempo de vida del token JWT | `8h` |
| `RATE_LIMIT_WINDOW_MS` | Ventana de tiempo del rate limiting general (en ms) | `900000` (15 min) |
| `RATE_LIMIT_MAX` | Peticiones máximas permitidas por IP en la ventana | `100` |
| `ADMIN_CORREO` | Correo del administrador de arranque inicial | `admin@sanalbertomagno.edu.co` |
| `ADMIN_PASSWORD` | Contraseña inicial del administrador (mínimo 10 caracteres) | `Password123!` |
| `FRONTEND_PATH` | *(Opcional)* Ruta al directorio de frontend estático | `../frontend` |

---

## 4. Usuarios y Roles del Sistema

El sistema implementa **Control de Acceso Basado en Roles (RBAC)** estricto:

### Credenciales Semilla Predeterminadas

| Rol | Correo Electrónico | Contraseña Inicial | Alcance y Permisos |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin@sanalbertomagno.edu.co` | `Password123!` | Control total: gestión de usuarios, roles, parámetros institucionales, bitácora de auditoría, base de estudiantes y atenciones. |
| **Enfermería** | `enfermeria@sanalbertomagno.edu.co` | `Password123!` | Operación clínica: registro de atenciones diarias, consulta y edición de fichas médicas de alumnos, detección de recurrentes. *No tiene acceso a usuarios ni auditoría.* |

---

## 5. Comandos Útiles

| Acción | Comando | Descripción |
| :--- | :--- | :--- |
| **Instalar dependencias** | `npm run setup` | Instala los paquetes del backend |
| **Iniciar aplicación** | `npm start` | Arranca el servidor en `http://127.0.0.1:3000` |
| **Modo desarrollo** | `npm run dev` | Arranca con recarga automática (`node --watch`) |
| **Pruebas automatizadas** | `npm test` | Ejecuta las 28 pruebas contra SQLite en memoria |
| **Reiniciar BD limpia** | Eliminar `database/samgy.sqlite*` | Al volver a ejecutar `npm start` se recrea desde cero |
| **Backup de BD** | Copiar `database/samgy.sqlite` | Copia directa del archivo único de base de datos |

---

## 6. Estructura del Proyecto

```text
samgy/
├── .env                         # Variables de entorno activas
├── .env.example                 # Plantilla documentada de variables de entorno
├── .gitignore                   # Exclusiones de Git (node_modules, .env, *.sqlite)
├── package.json                 # Scripts de raíz (setup, start, dev, test)
├── README.md                    # Manual de instalación y uso
│
├── backend/                     # API REST Node.js + Express + SQLite
│   ├── package.json             # Dependencias: express, zod, helmet, bcryptjs, jwt
│   └── src/
│       ├── app.js               # Configuración Express, CSP, CORS, CSRF y middlewares
│       ├── server.js            # Punto de entrada, conexión a SQLite y arranque
│       ├── config/env.js        # Validación de variables de entorno con Zod
│       ├── db/                  # Adaptador nativo node:sqlite y transacciones
│       ├── middleware/          # Autenticación, roles, rate limit, manejo de errores
│       ├── routes/              # Endpoints agrupados por recurso
│       ├── services/            # Lógica de negocio y consultas parametrizadas
│       └── utils/               # Formato unificado de respuestas JSON
│
├── database/                    # Esquema y datos semilla SQL (SQLite)
│   ├── 01_schema.sql            # DDL: 12 tablas y 2 vistas analíticas
│   ├── 02_seed.sql              # Datos iniciales (grados, usuarios, 7 alumnos)
│   └── samgy.sqlite             # Archivo de BD generado automáticamente al iniciar
│
└── frontend/                    # SPA Vanilla JavaScript ES6 (sin frameworks ni build)
    ├── index.html               # Estructura base, CDN Bootstrap 5.3.2 y Bootstrap Icons
    ├── css/styles.css           # Paleta oficial de marca, tipografías y accesibilidad
    ├── src/                     # Recursos visuales (Logo institucional, fotos ilustrativas)
    └── js/
        ├── app.js               # Inicialización de la SPA, sesión y control de inactividad
        ├── api.js               # Cliente HTTP centralizado con credenciales same-origin
        ├── router.js            # Enrutador por hash (#/inicio, #/ficha/:id, etc.)
        ├── ui.js                # Helpers de UI (toasts, modales, spinners, escapeHtml)
        └── views/               # Vistas modulares por sección
```

---

## 7. Créditos del Equipo

Proyecto desarrollado para el **Colegio San Alberto Magno** por:

- **Gabriela Martínez**
- **Andrea Pallares**
- **Yaricel Bayter**
- **Mathias Hernández**
- **Sajoha Vásquez**
