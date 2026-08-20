# 🍔 BurgerGo Backend API

**Versión:** 1.0.0  
**Autor:** Raul Dev  
**Stack:** Node.js + Express + TypeScript + PostgreSQL + TypeORM

---

## 📋 Tabla de Contenidos

- [Descripción General](#-descripción-general)
- [Tecnologías Utilizadas](#️-tecnologías-utilizadas)
- [Arquitectura del Proyecto](#-arquitectura-del-proyecto)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Instalación y Configuración](#️-instalación-y-configuración)
- [Variables de Entorno](#-variables-de-entorno)
- [Base de Datos](#️-base-de-datos)
- [API Endpoints](#-api-endpoints)
- [Sistema de Verificación OTP](#-sistema-de-verificación-otp)
- [Autenticación JWT](#-autenticación-jwt)
- [Scripts Disponibles](#-scripts-disponibles)
- [Próximos Pasos](#-próximos-pasos)

---

## 🎯 Descripción General

API RESTful para el sistema de delivery de hamburguesas **BurgerGo**. Construida siguiendo los principios de **Clean Architecture** con inyección de dependencias manual.

### Funcionalidades Implementadas

- ✅ Registro de clientes con verificación de email (OTP de 6 dígitos)
- ✅ Autenticación con JWT (login por email o username)
- ✅ Gestión de perfiles de clientes (ver, actualizar, cambiar contraseña)
- ✅ Gestión de direcciones de entrega (CRUD completo con dirección por defecto)
- ✅ Registro de empleados (transaccional)
- 🚧 Gestión de productos y categorías (pendiente)
- 🚧 Sistema de pedidos (pendiente)

---

## 🛠️ Tecnologías Utilizadas

| Categoría | Tecnología | Versión |
|---|---|---|
| **Runtime** | Node.js | 22.17.0 |
| **Framework** | Express | 5.1.0 |
| **Lenguaje** | TypeScript | 5.9.2 |
| **Base de Datos** | PostgreSQL | ≥ 14.x |
| **ORM** | TypeORM | 0.3.23 |
| **Auth** | jsonwebtoken | 9.0.2 |
| **Hashing** | bcryptjs | 3.0.2 |
| **Validación** | class-validator + class-transformer | 0.14.2 / 0.5.1 |
| **Email** | nodemailer | 7.0.5 |
| **Logging** | pino + pino-pretty | 9.7.0 / 13.0.0 |
| **HTTP Logger** | morgan | 1.10.0 |
| **Linting** | ESLint + Prettier | 9.x / 3.x |
| **Git Hooks** | Husky + lint-staged | 9.x / 16.x |

---

## 🏗 Arquitectura del Proyecto

El proyecto sigue **Clean Architecture** con 4 capas bien definidas:

```
┌──────────────────────────────────────────────────────┐
│                   Presentation                        │
│        (Controllers, Routes, Middlewares)             │
├──────────────────────────────────────────────────────┤
│                   Application                         │
│         (Use Cases, DTOs, Mappers)                    │
├──────────────────────────────────────────────────────┤
│                     Domain                            │
│     (Entities, Repository Interfaces, Errors)        │
├──────────────────────────────────────────────────────┤
│                  Infrastructure                       │
│  (TypeORM Entities, Repositories, Services, DB)      │
└──────────────────────────────────────────────────────┘
```

### Principios Clave

- **Dependency Inversion:** Las capas internas definen interfaces, las externas las implementan.
- **Composition Root:** La inyección de dependencias se realiza manualmente en `presentation/http/composition/`.
- **Use Cases:** Cada operación de negocio es un use case independiente.
- **Repository Pattern:** Abstracción de la capa de datos mediante interfaces en `domain/repository/`.

---

## 📁 Estructura del Proyecto

```
BurgerGo-backend/
├── src/
│   ├── index.ts                          # Punto de entrada principal
│   ├── app.ts                            # Configuración de Express (middlewares, rutas)
│   ├── serverV2.ts                       # Clase Server (arranque HTTP)
│   │
│   ├── domain/                           # 🟢 Capa de Dominio
│   │   ├── entities/                     #   Entidades de negocio puras
│   │   │   ├── user.entity.ts
│   │   │   ├── customer.entity.ts
│   │   │   ├── address.entity.ts
│   │   │   ├── rol.entity.ts
│   │   │   └── email-verification.entity.ts
│   │   ├── errors/                       #   Errores de dominio
│   │   │   └── validation.error.ts
│   │   ├── interfaces/                   #   Contratos de servicios
│   │   │   ├── email.interface.ts
│   │   │   ├── password-hasher.interface.ts
│   │   │   └── token.interface.ts
│   │   └── repository/                   #   Interfaces de repositorios
│   │       ├── user.repository.interface.ts
│   │       ├── customer.repository.interface.ts
│   │       ├── address.repository.interface.ts
│   │       ├── rol.repository.interface.ts
│   │       ├── email-verification.repository.interface.ts
│   │       └── unit-of-work.interface.ts
│   │
│   ├── application/                      # 🔵 Capa de Aplicación
│   │   ├── use-cases/
│   │   │   ├── auth/                     #   Login, verificación, resend code
│   │   │   └── customer/                 #   Registro, perfil, direcciones
│   │   ├── dtos/                         #   Data Transfer Objects
│   │   │   ├── auth/request/             #   Login, resend code
│   │   │   ├── auth/response/            #   Respuestas de auth
│   │   │   ├── customer-user/request/    #   Crear, actualizar, cambiar password
│   │   │   ├── address/request/          #   Crear y actualizar dirección
│   │   │   ├── email/                    #   Verificación de email
│   │   │   └── validators/              #   Validadores custom (Match)
│   │   └── mappers/
│   │       └── user.mapper.ts
│   │
│   ├── infrastructure/                   # 🟠 Capa de Infraestructura
│   │   ├── database/typeorm/
│   │   │   ├── config/data-source.ts     #   Configuración de TypeORM
│   │   │   ├── entities/                 #   Entidades de TypeORM (decoradores)
│   │   │   └── unit-of-work.typeorm.ts   #   Unit of Work con transacciones
│   │   ├── repositories/                 #   Implementaciones de repositorios
│   │   │   ├── user.repository.ts
│   │   │   ├── customer.repository.ts
│   │   │   ├── address.repository.ts
│   │   │   ├── rol.repository.ts
│   │   │   └── email-verification.repository.ts
│   │   └── services/                     #   Implementaciones de servicios
│   │       ├── bcrypt-password-hasher.service.ts
│   │       ├── jwt-token.service.ts
│   │       └── nodemailer-email.service.ts
│   │
│   ├── presentation/                     # 🟣 Capa de Presentación
│   │   └── http/
│   │       ├── composition/              #   Composition Root (DI manual)
│   │       │   ├── auth.composition.ts
│   │       │   ├── customer.composition.ts
│   │       │   └── address.composition.ts
│   │       ├── controller/               #   Controladores HTTP
│   │       │   ├── auth.controller.ts
│   │       │   ├── customer.controller.ts
│   │       │   └── address.controller.ts
│   │       ├── routes/                   #   Definición de rutas
│   │       │   ├── auth.routes.ts
│   │       │   ├── customer.routes.ts
│   │       │   └── address.routes.ts
│   │       ├── middlewares/
│   │       │   ├── auth/                 #   Auth token + verificación session
│   │       │   ├── errors/               #   Error handler global
│   │       │   └── validation/           #   Validación de DTOs
│   │       └── config/
│   │           └── cors.config.ts
│   │
│   ├── config/                           # Configuraciones globales
│   │   ├── cors.config.ts
│   │   ├── jwt.config.ts
│   │   └── data.sources.ts
│   │
│   ├── constants/                        # Constantes
│   │   ├── http.ts                       #   Códigos HTTP
│   │   └── app-error-code.ts             #   Códigos de error de la app
│   │
│   ├── entities/                         # Entidades TypeORM (legacy)
│   ├── errors/                           # Errores custom
│   ├── interfaces/                       # Interfaces compartidas
│   ├── utils/                            # Utilidades (bcrypt, logger, etc.)
│   ├── shared/                           # Templates de email
│   │
│   └── modules/                          # Módulos con lógica legacy
│       ├── auth/                         #   Auth (registro, login, OTP)
│       └── employee/                     #   Empleados (registro)
│
├── docs/                                 # Documentación
│   ├── API_DOCUMENTATION.md
│   ├── PLAN_DE_IMPLEMENTACION.md
│   └── doc.burger.yaml                   # Especificación OpenAPI
│
├── .env.example                          # Variables de entorno de ejemplo
├── .nvmrc                                # Versión de Node.js (22.17.0)
├── tsconfig.json                         # Configuración de TypeScript
├── eslint.config.mjs                     # Configuración de ESLint
├── .prettierrc.json                      # Configuración de Prettier
└── package.json
```

---

## ⚙️ Instalación y Configuración

### Requisitos Previos

- **Node.js** ≥ 22.x (ver `.nvmrc`)
- **PostgreSQL** ≥ 14.x
- **npm** (incluido con Node.js)

### 1. Clonar e Instalar

```bash
git clone <url-del-repo>
cd BurgerGo-backend

# Usar la versión correcta de Node.js
nvm use

# Instalar dependencias
npm install
```

### 2. Configurar Base de Datos

```sql
CREATE DATABASE burgergo_db;

-- (Opcional) Crear usuario dedicado
CREATE USER burgergo_user WITH PASSWORD 'tu_password';
GRANT ALL PRIVILEGES ON DATABASE burgergo_db TO burgergo_user;
```

### 3. Configurar Variables de Entorno

```bash
cp .env.example .env
# Editar .env con tus valores
```

### 4. Ejecutar

```bash
# Desarrollo (con hot-reload)
npm run dev

# Compilar para producción
npm run build

# Ejecutar producción
npm start
```

El servidor estará disponible en `http://localhost:3000`

---

## 🔐 Variables de Entorno

Crear archivo `.env` en la raíz del proyecto:

```env
# ===========================
# SERVER
# ===========================
PORT=3000
NODE_ENV=development

# ===========================
# DATABASE (PostgreSQL)
# ===========================
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=tu_password
DB_NAME=burgergo_db

# ===========================
# JWT
# ===========================
ACCESS_TOKEN_SECRET=tu_secret_key_segura
ACCESS_TOKEN_EXPIRY=15m
TEMPORARY_TOKEN_SECRET=secret_para_tokens_de_verificacion

# ===========================
# EMAIL (SMTP)
# ===========================
MAILER_USER=tu_email@gmail.com
MAILER_PASSWORD=xxxx xxxx xxxx xxxx    # App Password de Gmail
MAILER_SERVICE=smtp.gmail.com
MAILER_PORT=587
MAILER_EMAIL=noreply@burgergo.com
```

> **Tip para Gmail:** Habilita la verificación en 2 pasos, luego crea una [Contraseña de aplicación](https://myaccount.google.com/apppasswords) y úsala en `MAILER_PASSWORD`.

---

## 🗄️ Base de Datos

### Modelo de Datos

```
                    RolEntity
                        |
                        | (1:N)
                        ↓
    CustomerEntity ← (1:1) UserEntity (1:1) → EmployeeEntity
           |                    |
           | (1:N)              | (1:N)
           ↓                    ↓
    AddressEntity      EmailVerificationEntity
```

### Entidades

| Entidad | Descripción | Campos Principales |
|---|---|---|
| **User** | Usuario base del sistema | `id`, `email`, `username`, `password`, `email_verified`, `rol` |
| **Customer** | Información de cliente | `id`, `name`, `last_name`, `phone`, `dni`, `user` |
| **Employee** | Información de empleado | `id`, `name`, `last_name`, `phone`, `address`, `dni`, `user` |
| **Address** | Direcciones de entrega | `id`, `street`, `city`, `state`, `country`, `zipCode`, `addressType`, `isDefault` |
| **Rol** | Roles del sistema | `id`, `name` (`customer`, `employee`, `admin`) |
| **EmailVerification** | Tokens OTP | `id`, `verificationToken`, `verified`, `expired_at`, `user` |

> ⚠️ **Nota:** Actualmente `synchronize: true` en desarrollo. En producción se debe cambiar a `false` y usar migraciones.

---

## 🔌 API Endpoints

### Base URL

```
http://localhost:3000/api
```

### Autenticación — `/api/auth`

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| `POST` | `/auth/signin` | Login con email o username | ❌ |
| `POST` | `/auth/verify-account` | Verificar cuenta con código OTP | ❌ |
| `POST` | `/auth/resend-code` | Reenviar código de verificación | ❌ |

---

### Clientes — `/api/customer`

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| `POST` | `/customer/signup` | Registrar nuevo cliente | ❌ |
| `GET` | `/customer/profile` | Obtener perfil del usuario | 🔒 Bearer |
| `PATCH` | `/customer/profile` | Actualizar perfil del cliente | 🔒 Bearer |
| `PATCH` | `/customer/change-password` | Cambiar contraseña | 🔒 Bearer |

---

### Direcciones — `/api/address`

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| `GET` | `/address` | Listar direcciones del usuario | 🔒 Bearer |
| `POST` | `/address` | Crear nueva dirección | 🔒 Bearer |
| `PUT` | `/address/:addressId` | Actualizar dirección | 🔒 Bearer |
| `DELETE` | `/address/:addressId` | Eliminar dirección | 🔒 Bearer |
| `PATCH` | `/address/:addressId` | Establecer como dirección por defecto | 🔒 Bearer |

---

### Detalle de Endpoints

#### `POST /api/customer/signup`

Registra un nuevo cliente y envía email de verificación con código OTP.

**Body:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "Password123!",
  "name": "Juan",
  "last_name": "Pérez",
  "phone": "+51987654321",
  "dni": "12345678"
}
```

**Response (201 Created):**
```json
{
  "message": "Usuario registrado correctamente. Revisa tu correo para verificar tu cuenta.",
  "data": {
    "user": { "id": "uuid", "email": "usuario@ejemplo.com" },
    "verification_session_token": "eyJhbGci...",
    "expires_in": 600,
    "cooldown_seconds": 90
  }
}
```

---

#### `POST /api/auth/signin`

Login con email o username.

**Body:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "Password123!"
}
```

**Response (200 OK):**
```json
{
  "message": "Bienvenido a BurgerGO",
  "user": {
    "id": "uuid",
    "email": "usuario@ejemplo.com",
    "rol": { "name": "customer" }
  },
  "access_token": "eyJhbGci..."
}
```

---

#### `POST /api/auth/verify-account`

Verifica la cuenta con código OTP de 6 dígitos.

**Body:**
```json
{
  "token": "123456"
}
```

---

#### `POST /api/address`

Crea una nueva dirección de entrega.

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "street": "Av. Principal 123",
  "city": "Lima",
  "state": "Lima",
  "country": "Perú",
  "zipCode": "15001",
  "addressType": "home",
  "addressDetail": "Dpto 301"
}
```

---

## 🔒 Sistema de Verificación OTP

### Flujo Completo

```
1. REGISTRO (POST /customer/signup)
   → Backend genera código OTP de 6 dígitos
   → Envía email con código
   → Retorna verification_session_token

2. VERIFICACIÓN (POST /auth/verify-account)
   → Usuario envía código + verification_session_token
   → Backend valida: código correcto, no expirado (< 10 min), no usado
   → Si válido: marca email_verified = true, retorna access_token

3. REENVÍO (POST /auth/resend-code)
   → Backend verifica cooldown (90 segundos)
   → Invalida código anterior
   → Genera y envía nuevo código
```

### Características de Seguridad

- ✅ Código OTP de 6 dígitos (generación criptográfica)
- ✅ Expiración automática a los 10 minutos
- ✅ Cooldown de 90 segundos entre reenvíos
- ✅ Tokens anteriores se invalidan al generar uno nuevo
- ✅ Token de sesión de verificación separado del JWT principal

---

## 🔑 Autenticación JWT

### Access Token

```
Authorization: Bearer <token>
```

**Payload:**
```json
{
  "id": "uuid-del-usuario",
  "email": "usuario@ejemplo.com",
  "rol": "customer",
  "iat": 1234567890,
  "exp": 1234568790
}
```

- **Duración por defecto:** 15 minutos (configurable via `ACCESS_TOKEN_EXPIRY`)
- **Middleware:** `verifyToken` en `presentation/http/middlewares/auth/`
- ⚠️ **Refresh Token:** No implementado aún

---

## 📝 Scripts Disponibles

| Script | Comando | Descripción |
|---|---|---|
| **Dev** | `npm run dev` | Inicia con nodemon + ts-node (hot-reload) |
| **Build** | `npm run build` | Compila TypeScript a JavaScript |
| **Start** | `npm start` | Ejecuta el build de producción |
| **Lint** | `npm run lint` | Verifica el código con ESLint |
| **Lint Fix** | `npm run lint:fix` | Corrige errores de lint automáticamente |
| **Format** | `npm run format` | Formatea el código con Prettier |
| **Format Check** | `npm run format:check` | Verifica el formato sin modificar |
| **Type Check** | `npm run type-check` | Verifica tipos sin compilar |

---

## 🚀 Próximos Pasos

### Alta Prioridad
1. 🧹 Limpiar código legacy (controladores, rutas y servicios antiguos)
2. 📦 Implementar sistema de pedidos (Orders)
3. 🛒 Completar CRUD de productos y categorías
4. 🔄 Implementar refresh tokens
5. 🔑 Implementar recuperación de contraseña

### Media Prioridad
6. 📸 Subida de imágenes (Cloudinary)
7. 🛡️ Sistema de roles y permisos más robusto
8. 📄 Paginación en listados
9. 🚦 Rate limiting
10. 🐳 Docker setup

### Baja Prioridad
11. 🧪 Tests unitarios e integración
12. 📚 Documentación interactiva con Swagger
13. 📊 Logs estructurados en producción
14. 🔀 Migraciones de base de datos

---

## 📞 Contacto

**Autor:** Raul Dev

Para reportar bugs o solicitar features, crear un issue en el repositorio.

---

**Última actualización:** Abril 2026
