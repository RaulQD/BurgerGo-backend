# Análisis Técnico — BurgerGo Backend

**Fecha:** 2026-08-18
**Rama analizada:** `develop` (commit `d992941`)
**Alcance:** 89 archivos TypeScript, ~3.550 LOC en `src/`
**Tipo de documento:** revisión de código para equipo de desarrollo

> Todos los hallazgos fueron verificados ejecutando `tsc`, `eslint` e inspeccionando el código
> fuente de TypeORM cuando el comportamiento no era evidente. Donde algo no pudo verificarse sin
> una base de datos activa, se indica explícitamente como **"requiere verificación"**.

---

## Índice

1. [Comprensión general](#1-comprensión-general)
2. [Arquitectura](#2-arquitectura)
3. [Calidad del código](#3-calidad-del-código)
4. [TypeScript](#4-typescript)
5. [Backend / API](#5-backend--api)
6. [Seguridad](#6-seguridad)
7. [Base de datos](#7-base-de-datos)
8. [Rendimiento](#8-rendimiento)
9. [Manejo de errores](#9-manejo-de-errores)
10. [Testing](#10-testing)
11. [Mantenibilidad](#11-mantenibilidad)
12. [Code smells](#12-code-smells)
13. [Estrategia de refactorización](#13-estrategia-de-refactorización)
14. [Cómo no romper funcionalidad](#14-cómo-no-romper-funcionalidad)
15. [Código mejorado](#15-código-mejorado)
16. [Arquitectura propuesta](#16-arquitectura-propuesta)
17. [Deuda técnica](#17-deuda-técnica)
18. [Resumen ejecutivo](#18-resumen-ejecutivo)

---

## 1. Comprensión general

### 1.1 Propósito

API REST para **BurgerGo**, un sistema de delivery de hamburguesas. El backend actual cubre
únicamente el **dominio de identidad y cuenta del cliente**: registro, verificación de correo,
inicio de sesión, gestión de perfil y libreta de direcciones de entrega.

No existe todavía catálogo de productos, carrito ni pedidos. El README los declara como
pendientes, y eso es coherente con el código.

### 1.2 Problema que resuelve

Permitir que un cliente:

1. Se registre con datos de identidad peruanos (DNI de 8 dígitos, teléfono de 9 dígitos).
2. Confirme la propiedad de su correo antes de poder operar.
3. Se autentique y mantenga sesión mediante tokens.
4. Administre hasta 5 direcciones de entrega, una de ellas marcada como predeterminada.

El caso de uso de negocio detrás de la libreta de direcciones (`department`, `province`,
`district`, `latitude`, `longitude`, `reference`) es claramente **calcular cobertura y enrutar al
repartidor**, aunque esa lógica aún no está implementada.

### 1.3 Flujo principal de ejecución

```
src/index.ts                          ← punto de entrada
  │
  ├─ AppDataBaseSources.initialize()          conecta a PostgreSQL (TypeORM)
  │
  ├─ composeAuthController(dataSource)        ┐
  ├─ composeCustomerController(dataSource)    ├─ composition root manual (DI a mano)
  ├─ composeAddressController(dataSource)     ┘
  │
  ├─ AuthRoutes / CustomerRoutes / AddressRoutes   inyectan controllers + middleware auth
  │
  ├─ createApp({ authRouter, customerRouter, addressRouter })   monta Express
  │
  └─ new Server(app).listen(PORT)
```

Y el flujo de una petición autenticada:

```
HTTP request
  → cors → morgan → express.json → cookieParser
  → Router (/api/auth | /api/customer | /api/address)
  → verifyToken (middleware) ── VerifyAccessTokenUseCase → JwtTokenService + UserRepository
  → validateMiddlewareDTO(Dto) ── class-transformer + class-validator
  → Controller (envuelto en catchError)
  → UseCase (orquesta reglas de negocio)
  → Repository (interfaz de dominio) → implementación TypeORM → PostgreSQL
  → Mapper → DTO de respuesta
  → res.json()
  ↓ (si algo lanza)
  errorHandler (middleware final)
```

### 1.4 Módulos / componentes principales

El proyecto está organizado en **cuatro capas** siguiendo Clean Architecture:

| Capa | Carpeta | Responsabilidad | Archivos |
|---|---|---|---|
| **Domain** | `src/domain/` | Entidades con invariantes, interfaces de repositorio, interfaces de servicios, errores tipados | 21 |
| **Application** | `src/application/` | Casos de uso, DTOs de request/response, mappers, validadores custom | 22 |
| **Infrastructure** | `src/infrastructure/` | Entidades TypeORM, repositorios concretos, Unit of Work, servicios (bcrypt, JWT, nodemailer), configuración de entorno | 20 |
| **Presentation** | `src/presentation/http/` | Controladores, rutas, middlewares, composition root, configuración HTTP | 20 |
| **Shared** | `src/shared/` | Logger (pino), plantillas de email | 2 |

### 1.5 Cómo se comunican

La comunicación es **estrictamente unidireccional hacia adentro**, y esto está bien hecho:

```
Presentation ──→ Application ──→ Domain
      │               │             ↑
      └───────────────┴─────────────┘
              Infrastructure implementa las interfaces de Domain
```

Verificado: **`src/domain/` no importa nada de `infrastructure/` ni de `presentation/`.**
La inversión de dependencias es real, no decorativa.

El pegamento es el **composition root** (`presentation/http/composition/*.ts`): cada función
`composeXController(dataSource)` instancia repositorios concretos, servicios, casos de uso y
finalmente el controlador, devolviéndolo ya cableado. No hay contenedor de DI ni decoradores
`@Injectable` — es inyección manual por constructor.

### 1.6 Responsabilidades por archivo (los relevantes)

**Domain**

| Archivo | Responsabilidad |
|---|---|
| `entities/user.entity.ts` | Usuario con validación de email, `verifyEmail()`, `canLogin()`, `isAdmin/isEmployee/isCustomer()` |
| `entities/customer.entity.ts` | Cliente con invariantes de DNI (8 dígitos) y teléfono (9 dígitos), y `updateProfile()` |
| `entities/address.entity.ts` | Dirección + enum `HouseType` |
| `entities/email-verification.entity.ts` | Registro de token de verificación (anémica: solo datos) |
| `errors/app-error.error.ts` | `AppError` con `statusCode` y `errorCode` opcional |
| `errors/http-status-code.ts` | Constantes numéricas + union type `HttpStatusCode` |
| `errors/app-error-code.ts` | Enum `AppErrorCode` de códigos de negocio |
| `repository/*.interface.ts` | Contratos de persistencia (puertos) |
| `repository/unit-of-work.interface.ts` | Contrato transaccional multi-repositorio |
| `interfaces/{token,email,password-hasher}.interface.ts` | Puertos de servicios externos |

**Application**

| Archivo | Responsabilidad |
|---|---|
| `use-cases/auth/login.user-case.ts` | Valida credenciales, exige email verificado, emite access + refresh |
| `use-cases/auth/verify-email-account.use-case.ts` | Verifica token de sesión, marca email verificado, emite tokens |
| `use-cases/auth/resend-code.use-case.ts` | Cooldown de 90 s, invalida token previo, emite y envía uno nuevo |
| `use-cases/auth/refresh-token.use-case.ts` | Rota access + refresh |
| `use-cases/auth/verify-token.use-case.ts` | Resuelve el `User` a partir del access token (usado por el middleware) |
| `use-cases/auth/profile.use-case.ts` | Devuelve `User` + `Customer` si aplica |
| `use-cases/customer/register-customer.use-case.ts` | Registro transaccional (User + Customer + EmailVerification) vía UoW |
| `use-cases/customer/profile/*.ts` | Actualizar perfil, cambiar contraseña |
| `use-cases/customer/address/*.ts` | CRUD de direcciones + marcar predeterminada, con tope de 5 |
| `dtos/**` | Validación declarativa de entrada con `class-validator` |
| `mappers/user.mapper.ts` | `User` (+ `Customer`) → `UserResponseDto` |

**Infrastructure / Presentation**: entidades TypeORM espejo del dominio, repositorios con mappers
`toDomain`/`toTypeOrm`, `TypeOrmUnitOfWork` sobre `QueryRunner`, y controladores delgados envueltos
en `catchError`.

### 1.7 Dependencias externas

| Dependencia | Uso | Observación |
|---|---|---|
| `express@5` | Framework HTTP | Express 5 propaga rechazos de handlers async automáticamente |
| `typeorm@0.3` + `pg` | ORM y driver PostgreSQL | `synchronize: true` activo (ver §6) |
| `jsonwebtoken` | Access / refresh / verification tokens | Sin `algorithms` fijado |
| `bcryptjs` | Hash de contraseñas | Cost factor 10 |
| `class-validator` + `class-transformer` | Validación de DTOs | Sin `whitelist` |
| `nodemailer` | Envío de correos | Config leída de `process.env` directo, no de `envConfig` |
| `pino` + `pino-pretty` | Logging estructurado | Coexiste con `morgan` |
| `cors`, `cookie-parser`, `morgan` | Middlewares HTTP | Sin `helmet` |
| `dotenv` | Carga de `.env` | Invocado en 2 sitios distintos |
| `cloudinary`, `multer` | — | **No usados en runtime** (ver §12) |
| `reflect-metadata` | Requerido por decoradores | Importado primero en `index.ts` ✅ |

### 1.8 Patrones de diseño identificados

Patrones **presentes y correctamente aplicados**:

- **Clean Architecture / Ports & Adapters** — separación por capas con dependencias hacia el dominio.
- **Repository** — interfaces en dominio, implementaciones TypeORM en infraestructura.
- **Unit of Work** (`TypeOrmUnitOfWork`) — transacción multi-repositorio con `commit`/`rollback`/`release`.
- **Data Mapper** — `toDomain()` / `toTypeOrm()` en cada repositorio; el dominio no conoce TypeORM.
- **Use Case / Interactor** — una clase por operación, con `execute()`.
- **DTO** — objetos de transporte con validación declarativa.
- **Composition Root / Pure DI** — cableado manual centralizado.
- **Factory** — `unitOfWorkFactory: () => IUnitOfWork` (correcto: cada registro necesita su propio `QueryRunner`).
- **Decorator** — `@Match()` custom sobre `class-validator`.
- **Middleware Chain** — pipeline de Express.
- **Higher-Order Function** — `catchError(controller)` y `verifyToken(useCase)`.

Patrones **mal aplicados o incompletos**:

- **Unit of Work aplicado a medias** — existe, pero solo se usa en el registro. Operaciones que
  también son multi-paso (`clearDefaults` + `save` en direcciones) corren sin transacción.
- **Repository con fugas** — `findByCustomerId` devuelve `null` en vez de `[]`; `IRolRepository`
  lanza en vez de devolver `null`, rompiendo la convención de los demás repositorios.
- **`AppError` en el dominio** — un concepto HTTP colocado en la capa que debería ignorar HTTP.
- **Mapper incompleto** — el registro devuelve un `User` con `role_name: undefined` (ver §3.1).

### 1.9 ¿Existe separación adecuada de responsabilidades?

**Sí, en lo estructural.** La separación por capas es genuina y disciplinada: es el punto más
fuerte del proyecto. Los controladores son delgados, los casos de uso contienen la lógica, los
repositorios encapsulan la persistencia y el dominio tiene invariantes reales (no es anémico).
La decisión de mantener **entidades de dominio separadas de entidades TypeORM**, con mappers
explícitos, es la parte más costosa de Clean Architecture y aquí está bien ejecutada.

**No, en tres puntos concretos:**

1. `AddressController.updateAddressCustomer` toma la entidad de dominio directamente del body.
2. `CustomerController.updateCustomer` formatea fechas (lógica duplicada con `UserMapper`).
3. `AppError` con `statusCode` HTTP vive en `domain/`, acoplando el dominio al transporte.

---

## 2. Arquitectura

### 2.1 Separación entre componentes

| Componente | ¿Existe? | Evaluación |
|---|---|---|
| Controllers | ✅ | Delgados y correctos, salvo `updateAddressCustomer` |
| Services (dominio) | ✅ | Como *use cases*, que es la variante correcta en Clean Architecture |
| Services (infra) | ✅ | `JwtTokenService`, `BcryptPasswordHasher`, `NodemailerEmailService` tras interfaces |
| Repositories | ✅ | Interfaz en dominio + implementación en infra |
| Entities (dominio) | ✅ | Con invariantes, separadas de las entidades ORM |
| Entities (ORM) | ✅ | Separación explícita `*.typeorm-entity.ts`. Muy buena decisión |
| DTOs | ⚠️ | Los de request están completos; los de response están incompletos y sin usar |
| Middlewares | ✅ | Auth, validación, manejo de errores, `catchError` |
| Utilities | 🔴 | `src/utils` fue **eliminado** pero quedó un import colgando que rompe el build |
| Configuración | ⚠️ | `envConfig` centralizado, pero **evadido** en 6 archivos |

### 2.2 Acoplamiento excesivo

**🟠 Configuración leída por dos vías paralelas.** Existe `envConfig` (con `requireEnv`, que falla
rápido al arrancar), pero estos archivos leen `process.env` directamente, saltándose esa validación:

- `infrastructure/services/nodemailer-email.service.ts` (5 variables)
- `presentation/http/config/cors.config.ts` (`FRONTEND_URL`)
- `presentation/http/config/cloudinary.config.ts` (3 variables + su propio `dotenv.config()`)
- `presentation/http/composition/customer.composition.ts` (4 variables, **con fallback hardcodeado**)
- `application/use-cases/auth/resend-code.use-case.ts` y `register-customer.use-case.ts` (`FRONTEND_URL`)

*Por qué es un problema arquitectónico:* rompe la garantía de "fallar al arrancar si falta
configuración". Un caso de uso leyendo `process.env` además hace **imposible testearlo** sin
manipular variables de entorno globales, y viola la regla de que la capa de aplicación no debe
conocer el entorno de ejecución.

**🟠 `AppError` acopla el dominio a HTTP.** `domain/errors/app-error.error.ts` obliga a pasar un
`HttpStatusCode`, y cada caso de uso decide el código HTTP.

*Por qué:* el dominio deja de ser reutilizable fuera de HTTP (un worker de cola, un job programado,
un consumidor de eventos). Es una **abstracción con fugas** en dirección contraria a la esperada:
la capa interna conoce el protocolo de la capa externa.

**🟢 Acoplamiento entre capas: sano.** No hay imports de infraestructura en dominio ni en
aplicación. Verificado sobre los 89 archivos.

### 2.3 Responsabilidades mezcladas

1. **`AddressController.updateAddressCustomer`** construye la entidad de dominio desde el body sin
   pasar por un DTO ni por el `userId` autenticado. El controlador delega la *autorización* al body
   del cliente (ver §6, hallazgo S-04).
2. **`CustomerController.updateCustomer`** contiene lógica de formateo de fecha idéntica a la de
   `UserMapper` — duplicada, y en la capa equivocada.
3. **`ResendCodeUseCase` y `RegisterCustomerUseCase`** construyen la URL del frontend
   (`${process.env.FRONTEND_URL}/verify?token=...`). Eso es un detalle de *entrega*, no de negocio.

### 2.4 Dependencias circulares

**No se detectaron ciclos entre módulos.** Los `index.ts` de barril (`domain/entities/index.ts`,
`domain/repository/index.ts`, `application/use-cases/index.ts`, `infrastructure/repositories/index.ts`)
son un riesgo latente de ciclos a futuro, pero hoy el grafo es acíclico.

Sí existe un ciclo *entre entidades TypeORM* (`User ↔ Customer ↔ Address`), resuelto correctamente
con las lambdas `() => Entity` que exige TypeORM. No es un problema.

### 2.5 Módulos demasiado grandes

**No hay ninguno.** El archivo más grande es `register-customer.use-case.ts` con 182 líneas, y su
tamaño está justificado por la orquestación transaccional. El promedio es de ~40 líneas por archivo.
Esto es un punto positivo y poco común: la granularidad es de las mejores características del código.

### 2.6 Violaciones de principios SOLID

| Principio | Estado | Detalle |
|---|---|---|
| **SRP** | ⚠️ | `RegisterCustomerUseCase` orquesta la transacción, construye la URL de verificación, traduce errores y decide el nivel de log: cuatro razones para cambiar. |
| **OCP** | ✅ | Añadir un nuevo hasher, mailer o proveedor de tokens no requiere tocar casos de uso. |
| **LSP** | ⚠️ | `IRolRepository.findById/findByName` declaran `Promise<Rol>` pero **lanzan** si no encuentran, mientras el resto devuelve `\| null`. Dos contratos incompatibles para la misma idea. `RegisterCustomerUseCase` incluso hace `if (!customerRole)` sobre un valor que el tipo garantiza no-nulo: código muerto que delata la inconsistencia. |
| **ISP** | ⚠️ | `IEmailVerificationRepository` declara 7 métodos; 3 (`findLastByUserId`, `markAsVerified`, `incrementAttempts`) **nunca se usan**. Toda implementación paga por ellos. Igual con `IUserRepository.delete`, `ICustomerRepository.findById/delete`, `IRolRepository.findById`. |
| **DIP** | ✅ | El principio mejor aplicado del proyecto: los casos de uso dependen de interfaces de dominio, nunca de TypeORM. |

### 2.7 ¿Escala la arquitectura?

**Sí, estructuralmente.** El patrón "un caso de uso por operación + un repositorio por agregado"
escala linealmente al añadir productos, carritos y pedidos: son carpetas nuevas, no modificaciones
de código existente.

**Tres frenos concretos al crecer:**

1. **El composition root se duplicará.** Ya hoy `UserRepository` se instancia 2 veces y
   `CustomerRepository` 3 veces, y `JwtTokenService` se construye 2 veces **con configuración
   distinta** (ver §3.4). Con 8 módulos esto será inmanejable y fuente de bugs sutiles.
2. **Un solo `createApp` con parámetros nominales fijos.** `AppConfig` crecerá a 10+ routers,
   y `index.ts` con él.
3. **Sin transacciones fuera del registro.** Un pedido toca `order`, `order_items`, `stock` y
   `payment`: sin UoW generalizado habrá inconsistencias de datos.

### 2.8 Patrones que deberían utilizarse

| Patrón | Dónde | Por qué |
|---|---|---|
| **Result / Either** | Casos de uso | Elimina el acoplamiento del dominio a códigos HTTP |
| **Container / module registry** | Composition root | Instanciar cada repositorio y servicio una sola vez |
| **UoW generalizado** | Direcciones y futuros pedidos | Consistencia en operaciones multi-paso |
| **Token store (jti)** | Refresh tokens | Habilita logout y revocación reales |
| **Query Object / Specification** | Listados futuros | Filtrado, orden y paginación sin ensuciar los repositorios |
| **Transactional Outbox** | Envío de emails | Hoy, si el email falla, se pierde silenciosamente |

---
## 3. Calidad del código

Clasificación: 🔴 Crítico · 🟠 Alto · 🟡 Medio · 🟢 Bajo

### 3.1 Bloqueantes verificados

Estos cuatro hallazgos se confirmaron ejecutando las herramientas del propio proyecto.

---

#### 🔴 C-01 — El build está roto: `tsconfig.json` inválido

`npm run build` y `npm run type-check` **fallan hoy**:

```
tsconfig.json(34,27): error TS5103: Invalid value for '--ignoreDeprecations'.
```

`tsconfig.json:34` declara `"ignoreDeprecations": "6.0"`, un valor que TypeScript 5.9 (la versión
instalada) no acepta. El proyecto solo se ejecuta vía `ts-node` en desarrollo, donde el error no
aparece de la misma forma, lo que ha permitido que pase desapercibido.

**Impacto:** no se puede generar `dist/`, por lo tanto **no se puede desplegar** (`npm start`
ejecuta `./dist/index.js`). Cualquier pipeline de CI que ejecute `build` o `type-check` falla.

**Corrección:** eliminar la línea. La opción solo es necesaria si se usan APIs marcadas como
deprecadas que se eliminarán en TS 6.0, lo cual no es el caso aquí.

---

#### 🔴 C-02 — Import a un módulo inexistente rompe la compilación

`src/presentation/http/middlewares/auth/verification-session-token.middleware.ts:3`

```ts
import { AppError } from '../../../../utils';
```

`src/utils/` **no existe**: fue eliminado en el commit `c32a73d` ("cambios generales en el
proyecto"), durante la migración a Clean Architecture. El import quedó huérfano.

Verificado tras corregir C-01:

```
src/presentation/http/middlewares/auth/verification-session-token.middleware.ts(3,26):
error TS2307: Cannot find module '../../../../utils' or its corresponding type declarations.
```

**Impacto:** segundo bloqueante de build. Además, el archivo entero es **código muerto**:
`createVerificationSessionMiddleware` se importa en `auth.routes.ts` pero nunca se monta en
ninguna ruta (ESLint lo reporta como variable no usada).

**Corrección:** o bien apuntar el import a `../../../../domain/errors/app-error.error` y usar el
middleware, o bien eliminar el archivo y su import en `auth.routes.ts`. Ver §6 (S-08): este
middleware contiene la **única** validación de `payload.type === 'email_verification'` del
proyecto, así que la opción correcta es repararlo y usarlo, no borrarlo.

---

#### 🔴 C-03 — El middleware de autenticación puede colgar la petición

`presentation/http/middlewares/auth/auth-token.middleware.ts:34-53`

```ts
} catch (error) {
  if (error instanceof jwt.TokenExpiredError)  { return res.status(401)... }
  if (error instanceof jwt.JsonWebTokenError)  { return res.status(401)... }
  if (error instanceof jwt.NotBeforeError)     { return res.status(401)... }
}   // ← ningún else, ningún next(error), ninguna respuesta
```

Si el error **no** es de la familia `jsonwebtoken`, el `catch` se agota sin responder y sin llamar
a `next()`. La función async resuelve normalmente, Express considera el middleware terminado, y la
petición **queda colgada hasta que el cliente agota su timeout**.

**Cómo se dispara en la práctica:** `VerifyAccessTokenUseCase` lanza `new Error('Usuario no
encontrado.')` cuando el token es válido pero el usuario ya no existe en base de datos (cuenta
eliminada, base restaurada, entorno recreado). También cualquier error del driver de PostgreSQL
durante el `findById`.

**Impacto:** sockets retenidos, conexiones del pool ocupadas, y ningún log del incidente. Bajo
carga, degradación progresiva sin señal de diagnóstico. Es un problema de disponibilidad, no solo
de corrección.

**Corrección:** añadir `return next(error)` al final del `catch` y dejar que `errorHandler`
centralice la respuesta.

---

#### 🔴 C-04 — `PUT /api/address/:addressId` está roto de extremo a extremo

Tres errores encadenados en la misma ruta.

`presentation/http/controller/address.controller.ts:54-65`

```ts
public updateAddressCustomer = catchError(async (req: Request, res: Response) => {
  const userId = req.user.id;          // ← nunca usado
  const { addressId } = req.params;    // ← nunca usado
  const { address } = req.body;
  const response = await this.updateCustomerAddressUseCase.execute(address);
  ...
});
```

ESLint confirma los dos primeros:

```
address.controller.ts
  56:13  warning  'userId' is assigned a value but never used
  57:15  warning  'addressId' is assigned a value but never used
```

1. **El endpoint siempre devuelve 404.** La ruta aplica `validateMiddlewareDTO(UpdatedAddressCustomerDto)`,
   que en su última línea hace `req.body = dtoObject`. Por lo tanto `req.body` **es** el DTO, y
   `req.body.address` es el campo `address: string` del DTO — la calle, no un objeto. Ese string se
   pasa como si fuera una entidad `Address`, el caso de uso lee `data.customerId` (`undefined`),
   llama a `findByUserId(undefined)` y lanza `AppError('El usuario no existe', NOT_FOUND)`.

2. **La autorización se delega al cliente.** Aunque se corrigiera el punto 1, el diseño sigue mal:
   `UpdateCustomerAddressUseCase.execute(data: Address)` resuelve el cliente con
   `findByUserId(data.customerId)` — es decir, con un identificador **enviado en el body**, no con
   `req.user.id`. La identidad autenticada se ignora por completo. Ver §6 (S-04).

3. **`:addressId` se ignora.** El identificador del recurso se toma del body en vez de la URL,
   rompiendo la semántica REST y permitiendo que URL y payload discrepen.

**Impacto:** funcionalidad de edición de direcciones inoperativa + fallo de control de acceso
latente. Es el hallazgo más severo del proyecto.

---

### 3.2 Legibilidad y nombres

| Sev. | Hallazgo | Ubicación |
|---|---|---|
| 🟡 | `isMatchPassword` contiene lo contrario de lo que su nombre dice: `const isMatchPassword = data.newPassword !== data.confirmedPassword`. Se lee "si coinciden → error". | `change-password.use-case.ts:36` |
| 🟡 | `passwordHasherd` (typo, doble uso) | `change-password.use-case.ts:18,28,44,54` |
| 🟡 | `login.user-case.ts`, `update-customer.user-case.ts` — "user-case" en vez de "use-case", inconsistente con los otros 14 archivos | 2 archivos |
| 🟡 | `updatecustomerDto` — interfaz en minúsculas, rompe PascalCase; además duplica `CustomerData` de `customer.entity.ts` | `update-customer.user-case.ts:9` |
| 🟡 | `ChangePasswordUserCase` (falta la "se" de "UseCase"); `GetAddressCustomerUseCase` vs `getAddressesCustomerUseCase` (singular/plural incoherente) | varios |
| 🟢 | `Matchconstraint` en vez de `MatchConstraint` | `match.validator.ts:15` |
| 🟢 | `AppDataBaseSources` en plural para una sola fuente de datos | `data-source.ts:5` |
| 🟢 | `activetoken` sin camelCase | `resend-code.use-case.ts:43` |
| 🟢 | `'ERror sending verification email'` — typo visible en un mensaje de error | `nodemailer-email.service.ts:44` |
| 🟢 | Comillas mal cerradas en el `from` del email de bienvenida: `` `"BurgerGo <${...}>` `` (falta la comilla de cierre). Afecta cómo se muestra el remitente. | `nodemailer-email.service.ts:49` |
| 🟢 | Comentarios con codificación corrupta: `M�todos de control de transacci�n` | `unit-of-work.interface.ts:11` |
| 🟢 | Comentarios con errores tipográficos: `//comprar contraseñas`, `//Verificar que la nuevacontrañsea` | `login.user-case.ts:47`, `change-password.use-case.ts:35` |

**Nota positiva:** los mensajes de error *de cara al usuario* son consistentes, en español y
descriptivos. Eso es trabajo hecho con cuidado y vale la pena preservarlo.

### 3.3 Tamaño de funciones y complejidad ciclomática

| Función | Líneas | Complejidad aprox. | Veredicto |
|---|---|---|---|
| `RegisterCustomerUseCase.execute` | 140 | ~14 | 🟠 Alta. Un `try` gigante con `catch` de 3 ramas y `finally`. Debería extraer las validaciones previas y la traducción de errores. |
| `ResendCodeUseCase.execute` | 65 | ~7 | 🟡 Aceptable, pero mezcla cooldown + emisión + envío |
| `VerifyEmailAccountUseCase.execute` | 48 | ~6 | 🟢 OK |
| `verifyToken` (middleware) | 38 | ~6 | 🟡 Las 3 ramas de error son repetitivas |
| El resto | < 40 | ≤ 4 | 🟢 Bien dimensionadas |

**No hay funciones monstruosas.** La complejidad está razonablemente distribuida.

### 3.4 Código duplicado

| Sev. | Duplicación | Ubicación |
|---|---|---|
| 🟠 | **`JwtTokenService` se construye dos veces con configuración divergente.** `auth.composition.ts:38` usa `envConfig` completo (con secreto de refresh). `customer.composition.ts:41` construye otro con `process.env.ACCESS_TOKEN_SECRET \|\| 'secret_key_sysburger'` (fallback hardcodeado), **sin secreto de refresh** y con expiración temporal hardcodeada en `600`. Dos fuentes de verdad para la seguridad de la aplicación. | 2 archivos |
| 🟠 | **`HouseType` declarado 4 veces con 2 conjuntos de valores distintos:** `domain/entities/address.entity.ts` y ambos DTOs usan `casa/trabajo/pareja/other`; `domain/enum/house-type.enum.ts` usa `home/work/other`. Este último se importa en `address.repository.ts:5` y **no se usa** (ESLint lo reporta). | 4 archivos |
| 🟠 | **`CreateCustomerAddressDto` y `UpdatedAddressCustomerDto` son idénticos** campo por campo, decorador por decorador (53 vs 52 líneas). | 2 archivos |
| 🟠 | **Formateo de `birthdate` duplicado** con la misma expresión ternaria anidada en `user.mapper.ts:22-27` y `customer.controller.ts:46-50`. | 2 archivos |
| 🟡 | **Bloque de `res.cookie('refreshToken', ...)` repetido 3 veces** con las mismas 4 opciones. | `auth.controller.ts:29,48,80` |
| 🟡 | **Las 3 ramas `instanceof jwt.*Error → throw error`** se repiten en `verifyAccessToken` y `verifyVerificationSessionToken`. | `jwt-token.service.ts:44-53,88-97` |
| 🟡 | **Validación de DNI/teléfono duplicada** entre las regex de los DTOs y los métodos privados de `Customer`. Defendible (defensa en profundidad), pero los mensajes divergen. | DTOs + `customer.entity.ts` |
| 🟡 | `interface CustomerData` (`customer.entity.ts:3`) y `interface updatecustomerDto` (`update-customer.user-case.ts:9`) son el mismo tipo. | 2 archivos |

### 3.5 Código muerto

| Sev. | Elemento | Ubicación |
|---|---|---|
| 🟠 | `presentation/http/config/cloudinary.config.ts` — **nunca se importa**, pero si alguien lo importara lanzaría en tiempo de carga si faltan las 3 variables. Junto con `multer`, es infraestructura de subida de archivos que no existe. | 1 archivo |
| 🟠 | `verification-session-token.middleware.ts` — importado en `auth.routes.ts` pero nunca montado (ver C-02) | 1 archivo |
| 🟡 | `requireRoles()` — devuelve un middleware que solo comprueba `req.user` y llama a `next()`. Su nombre promete autorización por roles; no la implementa. **Nunca se usa.** | `auth-token.middleware.ts:57` |
| 🟡 | `domain/enum/house-type.enum.ts` — enum huérfano con valores distintos al real | 1 archivo |
| 🟡 | `IEmailVerificationRepository.findLastByUserId`, `.markAsVerified`, `.incrementAttempts` — implementados, nunca invocados. `markAsVerified` es especialmente revelador: la columna `verified` **nunca se pone a `true`** (ver §7). | interfaz + repo |
| 🟡 | `IUserRepository.delete`, `ICustomerRepository.findById`, `.delete`, `IRolRepository.findById` — sin usar | interfaces |
| 🟡 | `LoginResponseDto` — declarado, nunca usado; el controlador arma la respuesta a mano | `login-response.dto.ts` |
| 🟡 | `UserResponseDto.employee` — nunca poblado (`UserMapper` solo mapea `customer`) | `user-reponse.dto.ts:14` |
| 🟡 | `AppErrorCode` (18 valores) — **nunca se pasa a ningún `AppError`**. Todas las respuestas de error salen con `errorCode: undefined`. | `app-error-code.ts` |
| 🟡 | `if (!customerRole)` sobre un valor que el tipo garantiza no-nulo | `register-customer.use-case.ts:68` |
| 🟢 | `Server.close()` — loguea "Server closing..." y no cierra nada | `server.ts:29` |
| 🟢 | `Length` importado sin usar | `verify-email.dto.ts:1` |
| 🟢 | `HouseType` importado sin usar | `address.repository.ts:5` |
| 🟢 | `EmailVerification.attempts` — se persiste, nunca se incrementa ni se consulta | dominio + entidad |
| 🟢 | `Address.latitude` / `.longitude` — columnas y campos existen; ningún flujo los escribe | dominio + entidad |
| 🟢 | `IEmailService.sendWelcomeEmail` — implementado, nunca invocado | servicio |
| 🟢 | `UserType` enum en `user.typeorm-entity.ts:19` — sin uso; los roles se comparan con strings literales | 1 archivo |
| 🟢 | `docker-compose.yaml` — archivo de 0 bytes | raíz |

### 3.6 Magic numbers y magic strings

| Sev. | Valor | Ubicación | Comentario |
|---|---|---|---|
| 🟠 | `'customer'`, `'admin'`, `'employee'` como strings literales | `user.entity.ts:32,35,38`; `register-customer.use-case.ts:67` | Existe `UserType` enum sin usar. Un typo aquí es un fallo de autorización silencioso. |
| 🟠 | `'email_verification'` | `resend-code.use-case.ts:63`; `register-customer.use-case.ts:112`; middleware muerto | Contrato entre emisor y verificador, repetido como literal |
| 🟠 | `7 * 24 * 60 * 60 * 1000` (maxAge de cookie) × 3 | `auth.controller.ts` | Debe derivarse de `JWT_REFRESH_EXPIRES_IN`, hoy son independientes y pueden divergir |
| 🟡 | `600` (expiración temporal) hardcodeado | `customer.composition.ts:45` | Ignora `TEMPORARY_TOKEN_EXPIRATION` |
| 🟡 | `10` (salt rounds de bcrypt) | `bcrypt-password-hasher.service.ts:6` | Debería ser configurable |
| 🟡 | `401` numérico en vez de la constante `UNAUTHORIZED` que ya existe | `auth-token.middleware.ts:23,36,42,48` | Inconsistente con el resto |
| 🟡 | `400` numérico en vez de `BAD_REQUEST` | `validation-dto.ts:27,28` | Ídem |
| 🟢 | `'TOKEN_MISSING'`, `'TOKEN_EXPIRED'`, `'TOKEN_INVALID'`, `'TOKEN_NOT_ACTIVE'` | `auth-token.middleware.ts` | Tres de los cuatro existen en `AppErrorCode`; se reescriben a mano |
| 🟢 | `3000`, `5432`, `2525`, `5173` | `env.config.ts`, `cors.config.ts` | Defaults razonables, aceptables |

**Bien resuelto:** `MAX_ADDRESSES = 5`, `COOLDOWN_SECONDS = 90` y `TOKEN_LIFETIME_MINUTES` sí están
como constantes nombradas de clase. El patrón correcto ya existe en el código; solo falta aplicarlo
de forma consistente.

### 3.7 Inconsistencia crítica de tiempos de vida del token de verificación

Este hallazgo merece apartado propio porque involucra **cuatro valores que deberían ser uno**:

| Fuente | Valor | Archivo |
|---|---|---|
| Vida del registro en BD (registro) | **60 minutos** | `register-customer.use-case.ts:30` |
| Vida del JWT (registro) | **600 s = 10 minutos** | `customer.composition.ts:45` (hardcodeado) |
| Vida del registro en BD (reenvío) | **10 minutos** | `resend-code.use-case.ts:23` |
| Texto mostrado al usuario en el email | **"24 horas"** | `notification-email.template.ts:47` |

**Consecuencia real:** el enlace de verificación del registro expira a los **10 minutos** (lo manda
el JWT), mientras la fila en base de datos sigue "activa" 50 minutos más y el correo promete 24
horas. El usuario que abre el correo a los 15 minutos recibe *"El enlace de verificación es
inválido o ha expirado"* pese a que el email le dijo que tenía un día.

🟠 **Alto** — es un fallo funcional que genera tickets de soporte y abandono en el registro.

### 3.8 Manejo de async/await y promesas

🟢 **Correcto en general.** No se encontraron promesas sin `await`, ni mezcla de `.then()` con
`async/await`, ni constructores async. `catchError` cubre correctamente los handlers async.

Dos observaciones:

- 🟡 `verify-email-account.use-case.ts:56-57`: `verifyEmail()` e `invalidateUserToken()` son dos
  escrituras secuenciales **sin transacción**. Si la segunda falla, el email queda verificado con
  el token aún activo.
- 🟢 `register-customer.use-case.ts`: las validaciones previas (`findByEmail`, `findByDNI`,
  `findByName`) son secuenciales y **podrían paralelizarse** con `Promise.all`. Impacto bajo (3
  consultas por registro), pero es la única oportunidad clara de paralelización del código.

### 3.9 Manejo de null / undefined

| Sev. | Hallazgo | Ubicación |
|---|---|---|
| 🟠 | `UserRepository.toDomain` accede a `entity.rol.name` sin comprobación. En `save()`/`update()`, `toTypeOrm` construye un `RolEntity` **solo con `id`**, así que `saved.rol.name` es `undefined`. El `User` devuelto por el registro tiene `role_name: undefined`, y la respuesta de `POST /signup` **omite el campo `rol`** en el JSON. | `user.repository.ts:44-55` |
| 🟠 | `AddressRepository.toDomain` usa `addressEntity.customer?.id`, pero `findByCustomerId` **no carga la relación** `customer`. Todas las direcciones devueltas por `GET /api/address` tienen `customerId: undefined`. Hoy no se explota porque las comprobaciones de propiedad usan `findById` (que sí la carga), pero es una trampa para el próximo desarrollador. | `address.repository.ts:28-38,70-85` |
| 🟠 | `CustomerRepository.toDomain` accede a `entity.user.id` sin comprobación. Funciona porque todos los `find*` cargan `relations: ['user']`, pero es frágil ante un `find` nuevo que lo olvide. | `customer.repository.ts:66` |
| 🟡 | `findByCustomerId` devuelve `Address[] \| null` en lugar de `[]`. Obliga a `?? 0` en un sitio y a `if (!addresses) return []` en otro: la ausencia de resultados no es un caso excepcional. | interfaz + repo |
| 🟢 | `envConfig` usa `??` correctamente para defaults y `requireEnv` para obligatorios. Bien resuelto. |  |

### 3.10 Comentarios

🟢 En general adecuados y en español. Los mejores explican el *porqué*
(`register-customer.use-case.ts:142`: *"Si falla el email, no revertimos la transacción ya
confirmada"*), que es exactamente el tipo de comentario que vale la pena.

Sobran algunos redundantes (`// buscar usuario por email` sobre `findByEmail`), pero es ruido menor.

**Faltan comentarios donde sí hacen falta:** ningún comentario explica por qué `verifyEmailAccount`
consulta por `userId` en vez de por el token presentado (§6, S-02), ni por qué `invalidateUserToken`
"invalida" moviendo `expired_at` en vez de marcar `verified`.

---

## 4. TypeScript

Configuración base: `strict: true`, `noImplicitAny: true`, `exactOptionalPropertyTypes: true`,
`noImplicitOverride: true`, `noFallthroughCasesInSwitch: true`. **Es una configuración estricta y
bien elegida** — mejor que la de la mayoría de proyectos de este tamaño.

### 4.1 Uso de `any`

Solo **5 apariciones** en 3.550 líneas. Es un resultado muy bueno. ESLint las marca como warnings:

| Sev. | Ubicación | Comentario |
|---|---|---|
| 🟠 | `validation-dto.ts:6` — `function validateMiddlewareDTO(type: any)` | Debería ser `ClassConstructor<object>` de `class-transformer`. Al ser `any`, se pierde toda relación de tipos entre la ruta y el DTO. |
| 🟡 | `address.repository.ts:92` — `entity.houseType = domain.houseType as any` | El `as any` oculta la divergencia entre los dos enums `HouseType`. Es un síntoma, no la causa. |
| 🟢 | `match.validator.ts:17,21,45` | Inevitable: la API de `class-validator` lo exige |

### 4.2 Fallos de tipado que el compilador no detecta

#### 🟠 T-01 — `UserMapper` escribe un campo que el DTO no declara

`application/mappers/user.mapper.ts:22-27` vs `dtos/auth/response/user-reponse.dto.ts:12`

El DTO declara `birthday?: Date`. El mapper escribe `birthdate` (nombre distinto) con un **string**
`'YYYY-MM-DD'` (tipo distinto). El compilador **no lo detecta** porque la propiedad entra mediante
un *spread condicional*, y TypeScript no aplica comprobación de propiedades excedentes a los
spreads. Confirmado: `tsc` no reporta error en ese archivo.

**Consecuencia:** el tipo `UserResponseDto` **miente** sobre el contrato de la API. Un cliente
TypeScript que consuma este tipo esperará `birthday: Date` y recibirá `birthdate: string`.
Es el peor tipo de error de tipado: el que da falsa confianza.

#### 🟠 T-02 — `validate(dtoObject as unknown[])`

`validation-dto.ts:13`. Se castea un objeto a array para satisfacer al compilador. Funciona en
runtime porque `class-validator` valida objetos, pero la aserción es falsa y desactiva la
comprobación real.

#### 🟡 T-03 — `as SignOptions` repetido 4 veces

`jwt-token.service.ts:68,74,109`. El cast existe para sortear el tipo `StringValue` de `ms` que
`jsonwebtoken` exige en `expiresIn`. La solución correcta es tipar la configuración como
`SignOptions['expiresIn']` en `envConfig`, no castear en cada llamada.

#### 🟡 T-04 — `noUnusedLocals: false`

`tsconfig.json` activa `noUnusedParameters: true` pero desactiva `noUnusedLocals`. Por eso las
variables muertas `userId` y `addressId` de C-04 **no rompen la compilación** — solo generan un
warning de ESLint que nadie bloquea. Activar `noUnusedLocals: true` habría hecho fallar el build y
expuesto el bug meses antes.

### 4.3 Interfaces vs types, y tipos duplicados

🟢 El uso de `interface` para contratos (repositorios, servicios) y `class` para entidades y DTOs es
consistente y correcto. `HttpStatusCode` como *union type* de constantes literales es una decisión
elegante que da seguridad real sin complejidad.

🟠 **Tipos duplicados que deberían reutilizarse:**

| Tipo duplicado | Ubicaciones |
|---|---|
| `HouseType` | 4 declaraciones, 2 conjuntos de valores |
| `CustomerData` / `updatecustomerDto` | `customer.entity.ts:3`, `update-customer.user-case.ts:9` |
| Payload `{ userId, email }` | Declarado inline 4 veces en `token.interface.ts` + `JwtPayload` en `jwt-token.service.ts:6` |
| DTOs de dirección | `CreateCustomerAddressDto` ≡ `UpdatedAddressCustomerDto` |

### 4.4 Generics, narrowing y null safety

- 🟢 **Generics:** uso correcto y sobrio de `Repository<T>` de TypeORM. No hay sobreingeniería
  genérica, lo cual es una virtud.
- 🟡 **Narrowing:** `verify-email-account.use-case.ts:27` declara `let payload;` sin tipo — se
  infiere implícitamente. Debería anotarse con el tipo de retorno de `verifyVerificationSessionToken`.
- 🟢 **Optional chaining:** bien usado (`customer?.name`, `addresses?.length ?? 0`).
- 🟠 **Null safety:** los tres accesos sin comprobar de §3.9 (`entity.rol.name`, `entity.user.id`)
  pasan el compilador porque `strictPropertyInitialization: false` hace que las propiedades de las
  entidades TypeORM se consideren siempre definidas. Es una desactivación necesaria para TypeORM,
  pero tiene este coste que conviene conocer.

### 4.5 Enums

- 🟡 `AppErrorCode` — bien diseñado, **nunca usado**.
- 🟡 `UserType` — bien diseñado, **nunca usado**; los roles se comparan con strings literales.
- 🟠 `HouseType` — usado, pero duplicado con valores divergentes.
- 🟢 `HttpStatusCode` — no es un enum sino constantes + union. **Es la mejor decisión de tipado del
  proyecto**: permite `res.status(OK)` con seguridad de tipos y sin el peso de un enum.

### 4.6 Tipado de errores, servicios y repositorios

- 🟠 **Errores:** `errorHandler` recibe `error` sin tipar (implícitamente `any` por la firma de
  `ErrorRequestHandler`) y accede a `error.stack`/`error.message` sin validar que sea un `Error`.
  Si alguien hace `throw 'texto'` o `throw { code: 500 }`, `error.stack` es `undefined` y la
  plantilla de log produce `"undefined"`.
- 🟠 **Repositorios:** contratos inconsistentes — unos devuelven `| null`, `IRolRepository` lanza.
- 🟡 **Respuestas HTTP:** no existe ningún tipo para el cuerpo de las respuestas. Cada controlador
  construye su objeto literal, y ya hay 5 formas distintas (ver §5.5).

### 4.7 Cómo mejorar el tipado sin añadir complejidad

Cuatro cambios de bajo riesgo y alto retorno:

1. **`noUnusedLocals: true`** — habría detectado C-04 automáticamente.
2. **Tipar `validateMiddlewareDTO`** con `ClassConstructor<T>` y devolver un handler tipado.
3. **Un tipo `ApiResponse<T>`** compartido para unificar las respuestas (ver §15.5).
4. **`type TokenPayload = { userId: string; email: string }`** en `domain/interfaces/token.interface.ts`,
   reutilizado en las 5 posiciones donde hoy se repite inline.

Lo que **no** recomiendo: introducir `Result<T, E>`, branded types para IDs, o utilidades genéricas
de mapeo. El tipado actual es sólido; el problema no es falta de sofisticación sino cuatro puntos
concretos donde el tipo no refleja la realidad.

---
## 5. Backend / API

### 5.1 Inventario de endpoints

| Método | Ruta | Auth | Validación DTO | Estado |
|---|---|---|---|---|
| POST | `/api/auth/signin` | — | `LoginRequestDTO` | ✅ |
| POST | `/api/auth/verify-account` | — | `VerifyTokenDto` | ⚠️ ver S-02 |
| POST | `/api/auth/resend-code` | — | `ResendVerificationDto` | ⚠️ enumeración de usuarios |
| POST | `/api/auth/refresh-token` | cookie | ❌ ninguna | ⚠️ sin revocación |
| POST | `/api/customer/signup` | — | `CreateCustomerDTO` | ⚠️ expone `rol_id` |
| GET | `/api/customer/profile` | Bearer | — | ✅ |
| PATCH | `/api/customer/profile` | Bearer | `UpdateCustomerUserDTO` | ✅ |
| PATCH | `/api/customer/change-password` | Bearer | `ChangePasswordDTO` | ⚠️ 409 incorrecto |
| GET | `/api/address` | Bearer | — | ✅ |
| POST | `/api/address` | Bearer | `CreateCustomerAddressDto` | ⚠️ sin transacción |
| PUT | `/api/address/:addressId` | Bearer | `UpdatedAddressCustomerDto` | 🔴 **roto** (C-04) |
| DELETE | `/api/address/:addressId` | Bearer | — | ✅ |
| PATCH | `/api/address/:addressId` | Bearer | — | ⚠️ sin transacción |

**13 endpoints.** No existe `/health`, ni `/logout`, ni manejador 404.

### 5.2 Convenciones REST

🟢 **Bien:**
- Sustantivos en plural/colectivo, sin verbos en la URL (salvo `/signin`, `/signup`, `/verify-account`,
  aceptable por convención en endpoints de autenticación).
- `POST` para crear, `GET` para leer, `DELETE` para borrar.
- Recursos anidados por identificador en la URL (`/:addressId`).

🟠 **Problemas:**

1. **`PATCH /api/address/:addressId` no es idempotente ni semánticamente correcto.** Se usa para
   "marcar como predeterminada", pero no recibe body: el significado de la operación está implícito
   en el método HTTP. `PATCH` sin body es ambiguo — `POST /api/address/:id/set-default` o
   `PATCH` con `{ "isDefault": true }` serían correctos. Además **colisiona conceptualmente** con
   `PUT /:addressId`: dos métodos sobre la misma URL con semánticas que se solapan.

2. **`/api/customer/signup` está en el recurso equivocado.** Crear una cuenta es una operación de
   autenticación; debería ser `POST /api/auth/signup` o `POST /api/customers`. Hoy `signup` vive en
   `customer` y `signin` en `auth`, lo que obliga al frontend a conocer dos bases distintas para el
   mismo flujo.

3. **`GET /api/address` no expone su relación con el cliente.** Devuelve las direcciones del usuario
   autenticado, lo cual es correcto en la práctica, pero la URL sugiere una colección global.
   `GET /api/customers/me/addresses` sería más explícito.

### 5.3 Códigos de estado HTTP

🟢 Uso correcto de `200`, `201` (creación de dirección y de cliente), `401`, `403`, `404`.

🟠 **Incorrectos:**

| Caso | Actual | Correcto | Ubicación |
|---|---|---|---|
| Nueva contraseña ≠ confirmación | `409 Conflict` | `400` o `422` | `change-password.use-case.ts:40` |
| Nueva contraseña igual a la actual | `409 Conflict` | `422` | `change-password.use-case.ts:51` |
| Secreto de refresh no configurado | `409 Conflict` | `500` | `jwt-token.service.ts:104,115` |
| Email sin verificar al hacer login | `400` | `403 Forbidden` | `login.user-case.ts:44` |
| Cooldown de reenvío activo | `400` | `429 Too Many Requests` | `resend-code.use-case.ts:54` |
| `userId` ausente | `404` | `400` | `get-customer-addresses.use-case.ts:16` |
| DNI ya registrado (al actualizar) | `400` | `409 Conflict` | `update-customer.user-case.ts:29` |

`409 Conflict` significa "el estado del recurso impide la operación", no "los datos que enviaste no
concuerdan entre sí". El caso del cooldown es el más relevante: existe la constante
`TOO_MANY_REQUESTS` en `http-status-code.ts` y no se usa — el frontend no puede distinguir un
rate-limit de un error de validación.

### 5.4 Validación de request

🟢 **El patrón es correcto:** middleware declarativo con `class-validator`, aplicado antes del
controlador, con mensajes en español.

🟠 **Huecos:**

1. **Sin `whitelist: true`.** `plainToInstance` copia **todas** las propiedades del body, incluidas
   las no declaradas en el DTO, y `req.body = dtoObject` las propaga al controlador. Ver §6 (S-09).
2. **`POST /api/auth/refresh-token` no valida nada** — no hay DTO ni comprobación de formato.
3. **Ningún endpoint valida `req.params`.** `:addressId` llega como string arbitrario hasta la
   consulta SQL. TypeORM lo parametriza (no hay inyección), pero un `addressId` no-UUID produce un
   error del driver de PostgreSQL → 500 en vez de 400.
4. **`ChangePasswordDTO` no usa `@Match`,** pese a que `match.validator.ts` existe exactamente para
   eso. La comprobación se hace en el caso de uso y devuelve el código equivocado.
5. **Reglas de contraseña incoherentes:** `LoginRequestDTO` y `CreateCustomerDTO` exigen
   `@Length(8,12)`; `ChangePasswordDTO` exige `@MinLength(8)` sin máximo. Un usuario puede cambiar
   su contraseña a 20 caracteres y luego **no poder iniciar sesión**, porque el DTO de login la
   rechaza antes de llegar al caso de uso. 🔴 Es un bug funcional, no solo una inconsistencia.

### 5.5 Estructura de respuestas

Hay **cinco formatos distintos** para respuestas exitosas:

```jsonc
// GET /api/address
{ "data": [...] }

// POST /api/address
{ "data": {...}, "message": "Dirección creada exitosamente" }

// GET /api/customer/profile          ← sin envoltorio
{ "id": "...", "email": "...", "rol": "customer" }

// PATCH /api/customer/profile
{ "message": "...", "customer": {...} }

// POST /api/customer/signup
{ "message": "...", "data": { "user": {...} } }

// DELETE /api/address/:id
{ "message": "...", "deleteId": "..." }
```

Y **tres formatos** para errores:

```jsonc
{ "message": "...", "errorCode": undefined }              // errorHandler (AppError)
{ "message": "Internal Server Error", "errors": "..." }   // errorHandler (500)
{ "status": 400, "message": "Validation failed", "errors": [...] }  // validateMiddlewareDTO
{ "message": "Token expirado", "code": "TOKEN_EXPIRED" }  // auth middleware
```

🟠 **Por qué importa:** el cliente necesita lógica distinta por endpoint para extraer el mismo tipo
de información. Con 13 endpoints ya es molesto; con 40 será una fuente constante de bugs de
frontend. Además, `errorCode` vs `code` vs `errors` obliga a comprobar tres campos para saber qué
falló.

### 5.6 Paginación, filtrado, ordenación, búsqueda

**No existen** — y hoy es una decisión defendible: el único listado es `GET /api/address`, acotado
a 5 elementos por regla de negocio. **No hay sobreingeniería aquí, y eso es correcto.**

Se vuelve obligatorio en cuanto lleguen productos y pedidos. Recomendación para entonces: paginación
por cursor para pedidos (crecimiento ilimitado, orden temporal) y offset simple para catálogo.

### 5.7 Idempotencia

- `DELETE` es idempotente ✅ (`repository.delete` no falla si no existe).
- `PUT` debería serlo — está roto (C-04).
- 🟠 **`POST /api/customer/signup` no tiene protección contra doble envío.** Un doble clic o un
  reintento de red genera dos peticiones; la segunda falla con 409 gracias a la restricción `unique`
  de email, lo cual es aceptable. Pero **no hay clave de idempotencia**, así que un reintento tras
  un timeout de red no puede distinguirse de un registro duplicado.
- 🟠 **Falta idempotencia donde más se necesitará:** creación de pedidos y pagos. Conviene introducir
  el patrón `Idempotency-Key` antes de construir ese módulo, no después.

### 5.8 Versionamiento de API

🟠 **No existe.** Las rutas son `/api/auth`, no `/api/v1/auth`. Con un frontend web y una probable
app móvil, romper el contrato sin versión obliga a desplegar cliente y servidor de forma sincronizada
— algo imposible con apps móviles, donde conviven versiones antiguas durante semanas.

Añadir `/api/v1` **ahora** cuesta una línea en `app.ts`. Añadirlo después cuesta una migración.

### 5.9 Middleware

| Middleware | Estado |
|---|---|
| `cors` | ⚠️ lee `process.env` directo; lanza `Error` genérico → 500 en vez de 403 |
| `morgan('dev')` | ⚠️ formato de desarrollo en producción, sin correlación con pino |
| `express.json()` | 🟠 **sin `limit`** → acepta payloads de hasta 100 KB por defecto; conviene fijarlo explícitamente |
| `cookieParser()` | 🟠 **sin secreto** → no se pueden usar cookies firmadas |
| `verifyToken` | 🔴 puede colgar la petición (C-03) |
| `validateMiddlewareDTO` | 🟠 sin `whitelist` |
| `errorHandler` | 🟠 filtra mensajes internos (ver S-05) |
| `helmet` | ❌ **ausente** |
| rate limiting | ❌ **ausente** |
| compresión | ❌ ausente (menor) |
| request-id | ❌ ausente |

### 5.10 Autenticación y autorización

**Autenticación** 🟢 en lo esencial: access token corto (15 min) en cabecera `Authorization: Bearer`,
refresh token de 7 días en cookie `httpOnly` + `sameSite: 'strict'` + `secure` en producción. Esta
es la combinación recomendada y está bien elegida.

**Autorización** 🔴 **prácticamente inexistente**:

- No hay middleware de roles. `requireRoles()` existe, no comprueba roles y nunca se usa.
- `User` expone `isAdmin()`, `isEmployee()`, `isCustomer()` — solo se llama `isCustomer()` en
  `GetProfileUseCase`.
- La autorización a nivel de recurso está **dispersa dentro de cada caso de uso**
  (`if (address.customerId !== customer.id) throw FORBIDDEN`). Funciona en 3 de 4 casos de uso de
  dirección; **falta exactamente en el que está roto** (`UpdateCustomerAddressUseCase`, que la
  deriva del body).

*Por qué es un problema arquitectónico:* la comprobación de propiedad repetida manualmente en cada
caso de uso es un patrón que falla por omisión. Basta olvidarla una vez —y ya ocurrió— para abrir un
IDOR. Debe centralizarse.

### 5.11 Logging y observabilidad

| Aspecto | Estado |
|---|---|
| Logger estructurado | 🟢 pino, con `pino-pretty` solo en desarrollo. Correcto. |
| Logs de request | 🟠 `morgan('dev')` escribe texto coloreado a stdout, **fuera** de pino. En producción se obtienen dos formatos mezclados y el JSON de pino se vuelve inparseable para el agregador. |
| Correlación de peticiones | ❌ sin `request-id`; imposible seguir una petición entre logs |
| Métricas | ❌ ninguna |
| Health check | ❌ ninguno — un orquestador (Docker/K8s/Render) no puede saber si el servicio está vivo |
| Trazas | ❌ ninguna |
| `console.error` residual | 🟡 `index.ts:56` — duplica el log siguiente de pino |

### 5.12 ¿Está la API diseñada para producción?

**No todavía.** El diseño de fondo es correcto y la base es sólida, pero faltan elementos que no son
opcionales en un servicio expuesto a internet:

**Bloqueantes:** el build no compila (C-01, C-02), un endpoint roto (C-04), un middleware que cuelga
peticiones (C-03), `synchronize: true` contra la base de datos (S-01), ausencia total de rate
limiting (S-03).

**Necesarios antes de exponer:** `helmet`, health check, apagado ordenado, 404 handler, revocación
de refresh tokens, y dejar de filtrar mensajes de error internos.

---

## 6. Seguridad

Formato por hallazgo: **Problema · Riesgo · Vector · Corrección · Prioridad**.

---

### 🔴 S-01 — `synchronize: true` contra la base de datos

**Problema.** `infrastructure/database/typeorm/config/data-source.ts:12` activa `synchronize: true`,
sin condicionar por entorno. Al arrancar, TypeORM compara las entidades con el esquema real y ejecuta
DDL para alinearlos.

**Riesgo.** Pérdida de datos irreversible. Renombrar una propiedad de entidad se traduce en
`DROP COLUMN` + `ADD COLUMN`. Reordenar relaciones puede eliminar claves foráneas y sus datos.
La carpeta `migrations/` está declarada en el `DataSource` pero **está vacía**: no hay historial de
esquema al que volver.

**Vector.** No requiere atacante: basta un despliegue rutinario con un cambio de entidad.

**Corrección.**
```ts
synchronize: envConfig.app.nodeEnv === 'development',
migrationsRun: envConfig.app.nodeEnv !== 'development',
```
Generar la migración inicial desde el esquema actual (`typeorm migration:generate`) y añadir los
scripts `migration:generate` / `migration:run` a `package.json`.

**Prioridad: P0.**

---

### 🔴 S-02 — El token de verificación no se valida contra el token presentado

**Problema.** `application/use-cases/auth/verify-email-account.use-case.ts:48-49`:

```ts
const emailVerification =
  await this.emailVerificationRepository.findActiveByUserId(userId);   // ← por usuario
```

El caso de uso verifica la firma del JWT, extrae `userId`, y luego comprueba únicamente que
**exista alguna fila activa para ese usuario**. Nunca comprueba que el token presentado sea el que
está almacenado. `findActiveByToken()` existe en la interfaz y en el repositorio, y **no se usa**.

**Riesgo.** El mecanismo de invalidación es inefectivo. Cuando un usuario pide un reenvío,
`invalidateUserToken` mueve `expired_at` de las filas antiguas al momento actual, pero:

- el JWT antiguo sigue siendo criptográficamente válido hasta su propia expiración, y
- la comprobación en base de datos es satisfecha por la fila **nueva**.

Resultado: cualquier enlace de verificación emitido y aún no expirado sirve, aunque se haya
"invalidado". Si un enlace antiguo se filtró (historial de correo reenviado, cliente de correo
comprometido, logs de un proxy), el reenvío no lo revoca.

Agravante: la columna `verified` **nunca se pone a `true`** — `markAsVerified()` no se invoca en
ningún punto. Las filas se invalidan solo por tiempo. Y `attempts` se persiste pero nunca se
incrementa: no existe límite de intentos pese a que la columna se creó para eso.

**Corrección.**
```ts
const record = await this.emailVerificationRepository.findActiveByToken(token);
if (!record || record.user_id !== payload.userId) {
  throw new AppError('El enlace de verificación es inválido o ha expirado.', BAD_REQUEST);
}
// ... verificar email ...
await this.emailVerificationRepository.markAsVerified(record.id);
```
Y ejecutar `verifyEmail` + `markAsVerified` dentro de una transacción.

**Prioridad: P0.**

---

### 🔴 S-03 — Ausencia total de rate limiting

**Problema.** Ningún endpoint tiene límite de peticiones. No hay `express-rate-limit` ni equivalente
en `package.json`. La constante `TOO_MANY_REQUESTS` existe en `http-status-code.ts` y no se usa nunca.

**Riesgo por endpoint:**

| Endpoint | Riesgo |
|---|---|
| `POST /api/auth/signin` | Fuerza bruta y *credential stuffing* sin límite. bcrypt cost 10 (~50-100 ms) actúa como freno parcial, pero también convierte el endpoint en un vector de agotamiento de CPU. |
| `POST /api/auth/resend-code` | Bombardeo de correo a terceros. El cooldown de 90 s es **por usuario**, no por IP: un atacante puede iterar sobre miles de correos en paralelo. Coste económico directo en el proveedor de email y riesgo de que el dominio acabe en listas negras. |
| `POST /api/customer/signup` | Creación masiva de cuentas; cada una dispara un correo. |
| `POST /api/auth/refresh-token` | Sin límite en la emisión de tokens. |

**Corrección.** `express-rate-limit` con políticas diferenciadas: estricta en `/signin` (p. ej. 5
intentos / 15 min por IP+email), muy estricta en `/resend-code` y `/signup` (por IP), y general para
el resto. Devolver `429` con cabecera `Retry-After`. Para múltiples instancias, respaldar el
contador en Redis.

**Prioridad: P0.**

---

### 🔴 S-04 — Control de acceso roto en la actualización de direcciones

**Problema.** Ya descrito en C-04 desde la óptica funcional; aquí desde la de seguridad.

`AddressController.updateAddressCustomer` ignora `req.user.id`. `UpdateCustomerAddressUseCase`
resuelve el cliente con `findByUserId(data.customerId)` — un valor **controlado por el cliente**.

**Riesgo.** Broken Access Control (OWASP A01) / IDOR. La identidad autenticada no participa en la
decisión de autorización: el sistema confía en un identificador del body.

**Vector.** Hoy la explotación está bloqueada accidentalmente porque el endpoint siempre falla con
404 (el body ya no contiene el objeto esperado). Pero **la comprobación de propiedad depende de un
dato del atacante**: quien conozca el `user_id` de otra cuenta —y `GET /api/customer/profile`
devuelve `id` del usuario, que puede llegar a un tercero por capturas, tickets de soporte o logs de
frontend— podría modificar direcciones ajenas en cuanto el bug funcional se "arregle" sin corregir
el diseño.

Esto es lo peligroso del hallazgo: **la corrección obvia del 404 reactiva la vulnerabilidad.**

**Corrección.** El caso de uso debe recibir `(userId, addressId, dto)` como parámetros separados,
resolver el cliente **siempre** desde `req.user.id`, y usar el `addressId` de la URL:

```ts
async execute(userId: string, addressId: string, data: UpdatedAddressCustomerDto): Promise<Address>
```

**Prioridad: P0.**

---

### 🟠 S-05 — Filtración de información interna en las respuestas de error

**Problema.** Dos puntos:

`presentation/http/middlewares/errors/error-handler.middleware.ts:24-27`
```ts
res.status(INTERNAL_SERVER_ERROR).json({
  message: 'Internal Server Error',
  errors: error.message,          // ← mensaje interno al cliente
});
```

`application/use-cases/customer/register-customer.use-case.ts:170-173`
```ts
throw new AppError(
  `Error en desarrollo: ${error instanceof Error ? error.message : 'Error desconocido'}`,
  INTERNAL_SERVER_ERROR,
);
```

**Riesgo.** Divulgación de información (OWASP A05). Los mensajes de error de `pg`/TypeORM incluyen
nombres de tabla y columna, texto de restricciones violadas y fragmentos de SQL. El prefijo
*"Error en desarrollo:"* revela además que el mensaje no estaba pensado para producción.

**Vector.** Provocar un error interno (payload malformado que rompa una restricción) y leer la
respuesta para reconstruir el esquema de base de datos.

**Corrección.** Loguear el detalle con pino incluyendo un identificador de correlación, y devolver
al cliente solo un mensaje genérico más ese identificador:

```ts
const errorId = randomUUID();
logger.error({ err: error, errorId }, 'Unhandled error');
res.status(INTERNAL_SERVER_ERROR).json({
  message: 'Ha ocurrido un error interno. Contacta a soporte con el código de referencia.',
  errorId,
});
```

**Prioridad: P1.**

---

### 🟠 S-06 — Los refresh tokens no se pueden revocar, y no hay logout

**Problema.** `RefreshTokenUseCase` emite un par nuevo de tokens, pero **el refresh token anterior
sigue siendo válido** hasta su expiración natural (7 días). No hay almacén de tokens, ni lista de
revocación, ni `jti`, ni seguimiento de familias de tokens. Tampoco existe un endpoint de logout.

**Riesgo.** Un refresh token robado concede 7 días de acceso continuo, y **la víctima no tiene forma
de cortarlo**: no puede cerrar sesión, y cambiar la contraseña tampoco invalida nada
(`ChangePasswordUserCase` solo actualiza el hash).

**Corrección (incremental).**
1. Añadir `POST /api/auth/logout` que borre la cookie. *Mitiga parcialmente; no revoca.*
2. Añadir `jti` a los refresh tokens y una tabla `refresh_tokens (jti, user_id, revoked_at, expires_at)`;
   revocar el `jti` anterior en cada rotación y todos los del usuario al cambiar la contraseña.
3. Detección de reutilización: si llega un `jti` ya revocado, revocar la familia completa
   (indicador de robo de token).

**Prioridad: P1.**

---

### 🟠 S-07 — Cabeceras de seguridad ausentes y CORS mal integrado

**Problema.** No hay `helmet` ni configuración manual de cabeceras: faltan `X-Content-Type-Options`,
`Strict-Transport-Security`, `X-Frame-Options`, `Referrer-Policy`, y Express anuncia
`X-Powered-By: Express`.

Además, `cors.config.ts:5` lee `process.env.FRONTEND_URL` directamente (evitando `envConfig`) y
`callback(new Error('Not allowed by CORS'))` produce un **500** en vez de una denegación limpia.
La configuración tampoco declara `credentials: true`, pese a que la autenticación depende de una
cookie: es probable que el navegador no envíe la cookie de refresh en peticiones cross-origin.
**Requiere verificación con el frontend real.**

**Corrección.** Añadir `helmet()`, `app.disable('x-powered-by')`, mover el whitelist a `envConfig`
(admitiendo lista separada por comas), y añadir `credentials: true` junto con `allowedHeaders`.

**Prioridad: P1.**

---

### 🟠 S-08 — Debilidades en la emisión y verificación de JWT

**Problema.** Cuatro puntos en `jwt-token.service.ts`:

1. **Algoritmo no fijado.** Ninguna llamada a `jwt.verify` pasa `algorithms: ['HS256']`. Con secreto
   simétrico el riesgo de confusión de algoritmos es limitado, pero fijarlo es coste cero y elimina
   la clase entera de problema.
2. **Sin `issuer` ni `audience`.** Nada distingue estructuralmente un token de esta API de otro
   firmado con el mismo secreto.
3. **El tipo del token temporal no se comprueba.** `verifyVerificationSessionToken` devuelve `type`
   pero **no valida** que sea `'email_verification'`. La única comprobación existe en
   `verification-session-token.middleware.ts:39`, que es código muerto que ni siquiera compila (C-02).
   Cuando se añadan más tokens temporales (recuperar contraseña, por ejemplo) firmados con el mismo
   `TEMPORARY_TOKEN_SECRET`, serán intercambiables entre flujos.
4. **Secreto por defecto hardcodeado.** `customer.composition.ts:42`:
   `process.env.ACCESS_TOKEN_SECRET || 'secret_key_sysburger'`. Hoy es inalcanzable porque
   `envConfig` aborta el arranque si falta la variable — pero es una mina: si alguien elimina esa
   validación, la aplicación aceptará tokens firmados con un secreto público del repositorio.

**Corrección.** Fijar `algorithms`, añadir `issuer`/`audience` en firma y verificación, validar
`type` dentro del propio servicio, y eliminar el fallback del secreto.

**Prioridad: P1** (los puntos 3 y 4), **P2** (1 y 2).

---

### 🟡 S-09 — Mass assignment: validación sin `whitelist`

**Problema.** `validation-dto.ts:12` usa `plainToInstance(type, req.body)` sin
`excludeExtraneousValues`, y `validate()` sin `whitelist: true` / `forbidNonWhitelisted: true`.
Las propiedades no declaradas en el DTO sobreviven, y la línea 34 (`req.body = dtoObject`) las
propaga al controlador.

Agravante: `CreateCustomerDTO:50` declara `rol_id` como campo opcional del body.

**Riesgo.** Hoy la explotación está contenida: `RegisterCustomerUseCase` ignora `rol_id` y siempre
resuelve el rol con `findByName('customer')`; `Customer.updateProfile()` solo lee campos conocidos.
**Pero el hueco está abierto**: cualquier caso de uso futuro que haga `Object.assign(entity, data)`
—un patrón muy común— se convierte en escalada de privilegios inmediata.

**Corrección.**
```ts
const errors = await validate(dtoObject, {
  whitelist: true,
  forbidNonWhitelisted: true,
});
```
Y eliminar `rol_id` de `CreateCustomerDTO`: el rol nunca debe venir del cliente.

**Prioridad: P1** (es barato y cierra una clase entera de vulnerabilidad futura).

---

### 🟡 S-10 — Enumeración de usuarios

**Problema.** Tres canales:

| Endpoint | Filtración |
|---|---|
| `POST /api/auth/resend-code` | `404 "El usuario no existe"` vs `400 "El correo ya ha sido verificado"` vs `200`: distingue tres estados de cuenta |
| `POST /api/customer/signup` | `"El correo X ya esta registrado"` (y un mensaje distinto según esté verificado o no) |
| `POST /api/auth/signin` | Canal temporal: si el usuario no existe, se retorna **antes** de ejecutar bcrypt; si existe, se paga el coste del hash. Diferencia medible. |

**Riesgo.** Permite construir listas de correos registrados para *credential stuffing* o phishing
dirigido. Combinado con la ausencia de rate limiting (S-03), la enumeración es masiva y barata.

**Corrección.** `resend-code` debe responder siempre `200` con el mismo mensaje genérico. En login,
ejecutar una comparación bcrypt contra un hash señuelo cuando el usuario no existe, para igualar
tiempos. En signup el conflicto es difícil de ocultar sin dañar la UX: la mitigación práctica es
rate limiting agresivo.

**Prioridad: P2** (P1 si se maneja información sensible de clientes).

---

### 🟡 S-11 — Inyección de HTML en las plantillas de correo

**Problema.** `shared/templates/notification-email.template.ts:40` interpola sin escapar:

```ts
<h2>¡Hola ${nameComplete}!</h2>
```

`nameComplete` procede de `customer.name`. `CreateCustomerDTO.name` solo valida `@Length(2,100)`:
**no restringe caracteres**. (`UpdateCustomerUserDTO` sí exige `@Matches(/^[a-zA-ZÀ-ÿ\s]+$/)` — la
inconsistencia entre ambos DTOs es en sí misma un hallazgo.)

**Riesgo.** Un nombre como `<img src=x onerror=...>` se inyecta en el HTML del correo. El impacto es
bajo porque el correo llega a la propia dirección del atacante y los clientes de correo modernos
bloquean scripts. El riesgo real aparece si ese nombre se renderiza en un panel de administración.

**Corrección.** Aplicar la misma restricción de caracteres en `CreateCustomerDTO` y escapar las
interpolaciones en la plantilla.

**Prioridad: P2.**

---

### 🟡 S-12 — `.gitIgnore` con mayúscula: los secretos pueden acabar versionados

**Problema.** El archivo en la raíz se llama **`.gitIgnore`**, no `.gitignore`. Git solo reconoce el
nombre exacto en minúsculas. En Windows y macOS (sistemas de archivos insensibles a mayúsculas)
funciona por accidente — verificado en este equipo: `git check-ignore` sí ignora `.env`.

**Riesgo.** En Linux (CI, imágenes Docker, un compañero con otro sistema), git **no leerá el
archivo**, y `.env`, `dist/`, `node_modules/` y `.claude/` pasan a ser versionables. El `.env` de
este proyecto contiene credenciales de base de datos, secretos JWT, credenciales SMTP y claves de
Cloudinary. Un secreto commiteado permanece en el historial aunque se borre después.

**Corrección.** `git mv .gitIgnore .gitignore` y verificar en Linux. Añadir un escáner de secretos
(`gitleaks`) al hook de pre-commit ya existente.

**Prioridad: P1** — el coste es un comando y el impacto potencial es la fuga completa de credenciales.

---

### 🟡 S-13 — Política de contraseñas con máximo de 12 caracteres

**Problema.** `LoginRequestDTO:15` y `CreateCustomerDTO:44` imponen `@Length(8, 12)`.

**Riesgo.** Un máximo de 12 caracteres impide frases de contraseña y contraseñas generadas por
gestores (habitualmente 16-32 caracteres), empujando a los usuarios hacia contraseñas más débiles.
bcrypt admite hasta 72 bytes: no hay razón técnica para el límite.

Además genera el **bug funcional descrito en §5.4**: `ChangePasswordDTO` permite `MinLength(8)` sin
máximo, así que un usuario puede fijar una contraseña de 20 caracteres y quedar **bloqueado** en el
login, cuyo DTO la rechaza.

**Corrección.** Unificar en `@MinLength(8)` + `@MaxLength(72)` en los tres DTOs.

**Prioridad: P1** (por el bug de bloqueo, no por la política en sí).

---

### 6.14 Riesgos evaluados y descartados

Es tan importante señalar lo que **no** es un problema:

| Vector | Veredicto |
|---|---|
| **SQL Injection** | 🟢 **No presente.** Todas las consultas usan el query builder de TypeORM con parámetros. No hay `query()` crudo ni concatenación de SQL en todo el proyecto. |
| **NoSQL Injection** | 🟢 No aplica (PostgreSQL). |
| **XSS reflejado** | 🟢 La API solo devuelve JSON; no renderiza HTML de cara al navegador. Único punto de interpolación HTML: las plantillas de correo (S-11). |
| **CSRF** | 🟡 Mitigado razonablemente: `sameSite: 'strict'` en la cookie de refresh y access token en cabecera (no en cookie), lo que hace que las peticiones autenticadas no dependan de credenciales ambientales. `POST /refresh-token` sí depende solo de la cookie, pero `sameSite: strict` lo cubre en navegadores actuales. |
| **SSRF** | 🟢 No presente. La aplicación no hace peticiones HTTP salientes con URLs controladas por el usuario. |
| **Path traversal** | 🟢 No presente. No hay operaciones de sistema de archivos con entrada del usuario (`multer` está instalado pero sin usar). |
| **Command injection** | 🟢 No presente. No hay `exec`, `spawn` ni `eval`. |
| **Almacenamiento de contraseñas** | 🟢 **Correcto.** bcrypt con salt por contraseña, cost 10. `@Exclude()` en la columna. Ningún caso de uso devuelve el hash al cliente (verificado: `UserMapper` no mapea `password`). |
| **Secretos en el repositorio** | 🟢 `.env` no está versionado (`git ls-files` solo muestra `.env.example`) — pero ver S-12 sobre la fragilidad de esa protección. |
| **Logs con datos sensibles** | 🟢 Revisados todos los `logger.*`: no se registran contraseñas ni tokens. `logger.warn` en el registro loguea solo el mensaje de `AppError`. Buen criterio. |

---
## 7. Base de datos

PostgreSQL vía TypeORM 0.3, con 6 entidades: `users`, `customers`, `employees`, `roles`,
`address`, `email_verification`.

### 7.1 Diseño de tablas y relaciones

```
roles (1) ──< (N) users (1) ──── (1) customers (1) ──< (N) address
                    │  (1) ──── (1) employees
                    │  (1) ──< (N) email_verification
```

🟢 **El modelo relacional es correcto y bien normalizado.** La decisión de separar `users`
(credenciales) de `customers`/`employees` (datos de perfil) es acertada: permite que una persona
cambie de tipo sin duplicar credenciales, y mantiene la tabla de autenticación estrecha.

🟠 **Problemas de integridad:**

| Sev. | Problema | Ubicación |
|---|---|---|
| 🟠 | `UserEntity.email` es `nullable: true` pese a ser la clave de login y tener restricción `@Unique`. PostgreSQL permite múltiples `NULL` en una columna única: podrían existir varios usuarios sin email. | `user.typeorm-entity.ts:29` |
| 🟠 | `AddressEntity.customer` no declara `nullable: false`. Una dirección puede quedar huérfana. | `address.typeorm-entity.ts:55` |
| 🟠 | `department`, `province`, `district`, `address` son `nullable: true` en la tabla, pero **obligatorios** en el DTO. La base de datos no respalda la regla de negocio: cualquier escritura que no pase por el DTO puede insertar una dirección inválida. | `address.typeorm-entity.ts:25-36` |
| 🟠 | `houseType` es `varchar` sin restricción `CHECK` ni tipo enum. Combinado con los dos enums `HouseType` divergentes (§3.4), la columna puede acabar con `'casa'` y `'home'` mezclados. | `address.typeorm-entity.ts:18-19` |
| 🟡 | `CustomerEntity.dni` es `varchar(200)` para un valor de exactamente 8 dígitos. Igual `phone` (9 dígitos) y `name`/`last_name` (`varchar(200)` con DTO que limita a 100). Los tipos no reflejan el dominio. | `customer.typeorm-entity.ts` |
| 🟡 | `AddressEntity` no tiene restricción que garantice **una sola** dirección predeterminada por cliente. La regla se aplica solo en código (`clearDefaults` + `save`), sin transacción. Un índice único parcial (`WHERE isDefault = true`) lo garantizaría a nivel de motor. | `address.typeorm-entity.ts:21` |
| 🟡 | `EmailVerificationEntity` declara `@ManyToOne(() => UserEntity, (user) => user.id, ...)`. El selector inverso apunta a un **escalar** (`user.id`) en lugar de a la propiedad de relación (`user.emailVerification`), que sí existe en `UserEntity:51`. **Requiere verificación** contra el esquema generado: puede producir una relación duplicada o una columna FK inesperada. | `email-verification.typeorm-entity.ts:24` |
| 🟢 | `onDelete: 'CASCADE'` solo está declarado en `email_verification`. Las demás relaciones no definen política de borrado: el comportamiento por defecto (`NO ACTION`) impedirá borrar un usuario con cliente asociado. | varias |

### 7.2 Índices

🟠 **No hay una sola declaración `@Index` en el proyecto.** Solo existen los índices implícitos de
claves primarias y de las restricciones `UNIQUE` (`users.email`, `customers.dni`).

Consultas que hoy hacen recorrido secuencial:

| Consulta | Frecuencia | Índice recomendado |
|---|---|---|
| `email_verification` por `(userId, verified, expired_at)` | **Cada** registro, reenvío y verificación | `CREATE INDEX ... ON email_verification (user_id, verified, expired_at)` |
| `address` por `customer_id` | Cada listado y creación de dirección | `CREATE INDEX ... ON address (customer_id)` |
| `customers` por `user_id` | Cada petición de perfil y **cada operación de dirección** | Índice único sobre `user_id` |
| `email_verification` por `verification_token` | Tras corregir S-02, en cada verificación | Índice sobre `verification_token` |

`customers.user_id` merece atención especial: se consulta en **8 de los 13 endpoints** (todos los de
dirección más el perfil). Es la consulta más caliente de la aplicación y no tiene índice.

### 7.3 Consultas y N+1

🟢 **No se detectó ningún problema N+1.** Todos los repositorios usan `relations: [...]`, que TypeORM
resuelve con `JOIN` en una sola consulta. Es un acierto: el N+1 es el error más común con ORM y aquí
se evitó.

🟡 **Consultas mejorables:**

1. **Carga innecesaria de relaciones.** `CustomerRepository.findByDNI` y `.findById` cargan
   `relations: ['user']` siempre. En `RegisterCustomerUseCase` el único uso de `findByDNI` es
   comprobar existencia: se hace un `JOIN` con `users` para descartar el resultado.
   Un `exists()` sería suficiente.

2. **Contar cargando filas.** `CreateCustomerAddressUseCase:26-29` llama a `findByCustomerId` y usa
   solo `addresses.length`. Trae todas las columnas de hasta 5 filas para contarlas. Con el tope
   actual es irrelevante, pero el patrón (`SELECT *` para contar) no debería propagarse.

3. **Actualización más amplia de lo necesario.** `clearDefaults(customerId)` actualiza **todas** las
   direcciones del cliente, cuando por invariante solo una tiene `isDefault = true`. Añadir
   `isDefault: true` al criterio reduce las filas tocadas.

4. **`AddressRepository.update` hace dos viajes** (`findOne` + `save`) donde uno bastaría. Es
   defendible: permite una actualización parcial controlada. Lo dejaría como está.

**Verificado:** la sintaxis `repository.update({ customer: { id } }, {...})` en `clearDefaults` e
`invalidateUserToken` **funciona correctamente**. Inspeccionando `QueryBuilder.createPropertyPath`
de TypeORM, una relación many-to-one cuyas *join columns* están todas presentes se aplana al nombre
de la columna FK (`customer_id = $1`). No genera un `JOIN` inválido.

### 7.4 Transacciones y concurrencia

🟢 **`TypeOrmUnitOfWork` está bien implementado**: `QueryRunner` propio por operación (creado por
factory), `rollback` protegido con `isTransactionActive`, y `release()` en `finally`.
`RegisterCustomerUseCase` lo usa correctamente: validaciones y hash **fuera** de la transacción,
escrituras dentro, envío de correo **después** del commit. Ese orden es exactamente el correcto.

🟠 **Pero solo el registro es transaccional.** Estas secuencias multi-escritura corren sin transacción:

| Operación | Escrituras | Riesgo si falla a la mitad |
|---|---|---|
| `SetDefaultAddressUseCase` | `clearDefaults()` + `save()` | El cliente queda **sin ninguna** dirección predeterminada |
| `CreateCustomerAddressUseCase` | `clearDefaults()` + `save()` | Ídem |
| `VerifyEmailAccountUseCase` | `verifyEmail()` + `invalidateUserToken()` | Email verificado con el token aún activo |

🟠 **Condiciones de carrera sin control de concurrencia:**

1. **Registro simultáneo con el mismo email.** La comprobación `findByEmail` ocurre **antes** de
   abrir la transacción (`register-customer.use-case.ts:44` vs `:76`). Dos peticiones concurrentes
   pueden pasar ambas la validación. La restricción `UNIQUE` de PostgreSQL salva la integridad,
   pero el error resultante no es un `AppError`: cae en el `catch` genérico y se convierte en un
   **500 con el mensaje del driver** (agravando S-05), en vez de un 409 limpio.

2. **Tope de 5 direcciones.** Contar y luego insertar sin bloqueo permite superar el límite con
   peticiones concurrentes.

3. **Dos direcciones predeterminadas.** Sin el índice único parcial recomendado en §7.1, dos
   `setDefault` concurrentes pueden dejar dos.

No se usa bloqueo pesimista ni optimista en ningún punto. Para el volumen actual es asumible; para
pedidos y stock será obligatorio.

### 7.5 Migraciones

🔴 **No existen.** El `DataSource` declara `migrations: [join(__dirname, '../migrations/**/*')]`
pero **la carpeta no existe**, no hay scripts de migración en `package.json`, y `synchronize: true`
gestiona el esquema (S-01).

Consecuencias: no hay historial de cambios de esquema, no hay rollback, no se puede reproducir el
esquema en otro entorno de forma determinista, y no hay forma de aplicar cambios de datos.

### 7.6 Crecimiento sin control de `email_verification`

🟡 La tabla acumula una fila por registro y por reenvío, **sin proceso de limpieza**. Las filas
caducadas nunca se borran (`invalidateUserToken` solo mueve `expired_at`) y `verified` nunca se pone
a `true`. Cada consulta `findActiveByUserId` recorre un histórico creciente sin índice (§7.2).

Es el problema de rendimiento más previsible del proyecto a 12 meses vista. Solución: índice +
tarea programada que elimine filas con `expired_at < now() - interval '30 days'`.

### 7.7 Consultas potencialmente costosas

Con el volumen actual (una aplicación en desarrollo) **ninguna consulta es costosa hoy**. Las que se
degradarán primero, por orden:

1. `email_verification` por `userId` — tabla creciente, sin índice, consultada en cada registro.
2. `customers` por `user_id` — sin índice, en 8 de 13 endpoints.
3. `address` por `customer_id` — sin índice, acotada a 5 filas por cliente pero con recorrido
   secuencial sobre toda la tabla.

**No invento cifras**: para dimensionar esto correctamente hay que ejecutar `EXPLAIN ANALYZE` sobre
un volumen representativo. Recomiendo activar `logging: ['query', 'error']` con `maxQueryExecutionTime`
en un entorno de staging con datos sembrados.

### 7.8 Configuración de conexión

🟠 `data-source.ts` no configura **pool de conexiones** (`extra: { max, idleTimeoutMillis }`), ni
`connectTimeoutMS`, ni SSL. TypeORM usa los valores por defecto de `pg` (`max: 10`).

Con `synchronize: true` y sin límites explícitos, un despliegue en un proveedor gestionado con
límite de conexiones puede agotarlas silenciosamente. También conviene fijar `ssl` según el entorno:
la mayoría de PostgreSQL gestionados lo exigen.

---

## 8. Rendimiento

### 8.1 Evaluación honesta

**No se encontró ningún algoritmo cuadrático ni ningún bucle problemático en el proyecto.** No hay
bucles anidados, ni operaciones O(n²), ni procesamiento intensivo en memoria. El código es
mayoritariamente E/S: consultas a base de datos y llamadas SMTP.

Dar una tabla "Actual: O(n²) → Propuesta: O(n)" aquí sería inventar un problema. **El rendimiento
de esta aplicación no está limitado por CPU ni por algoritmos, sino por la base de datos y por la
ausencia de índices.**

### 8.2 Problemas reales de rendimiento

| Sev. | Problema | Impacto | Ubicación |
|---|---|---|---|
| 🟠 | **Falta de índices** (§7.2) | Recorrido secuencial en las 4 consultas más frecuentes. Coste por consulta: O(n) sobre el total de filas de la tabla, cuando debería ser O(log n). Es el único problema de rendimiento con impacto medible a corto plazo. | esquema |
| 🟠 | **`email_verification` sin purga** | La tabla crece de forma monótona; el coste del recorrido secuencial crece con ella. | §7.6 |
| 🟡 | **Sin pool configurado** | Bajo carga, peticiones encoladas esperando conexión. | `data-source.ts` |
| 🟡 | **Envío de correo síncrono dentro de la petición** | `sendVerificationEmail` bloquea la respuesta de `/signup` y `/resend-code` durante todo el diálogo SMTP (típicamente cientos de ms, con picos de segundos). Si el proveedor está lento, el registro parece colgado. | `register-customer.use-case.ts:136` |
| 🟡 | **Validaciones secuenciales en el registro** | `findByEmail` → `findByDNI` → `findByName` son 3 viajes independientes ejecutados en serie. Paralelizables con `Promise.all`: latencia de 3 RTT → 1 RTT. | `register-customer.use-case.ts:44-67` |
| 🟡 | **Bcrypt bloquea el event loop** | `bcryptjs` es una implementación **en JavaScript puro**, no un binding nativo. Su versión asíncrona trocea el trabajo en el event loop, pero es varias veces más lenta que `bcrypt` nativo. En un endpoint sin rate limiting (S-03), es un vector de saturación de CPU. | `bcrypt-password-hasher.service.ts` |
| 🟢 | **Sin caché** | No hay Redis ni caché en memoria. Hoy no hace falta: no hay datos calientes de solo lectura. Se volverá necesario con el catálogo de productos. | — |
| 🟢 | **Sin compresión HTTP** | Respuestas JSON pequeñas; impacto marginal hoy. | `app.ts` |
| 🟢 | **`morgan` + `pino` en paralelo** | Doble serialización de cada petición. Coste bajo, pero es trabajo duplicado. | `app.ts:19` |

### 8.3 Complejidad conceptual donde sí aplica

Los únicos puntos donde tiene sentido hablar de complejidad:

| Operación | Actual | Propuesta | Nota |
|---|---|---|---|
| Buscar verificación activa por usuario | O(n) recorrido secuencial sobre `email_verification` | O(log n) con índice compuesto | n crece sin límite (§7.6) |
| Buscar cliente por `user_id` | O(n) sobre `customers` | O(log n) con índice | n = número de clientes |
| Contar direcciones de un cliente | O(k) trayendo k filas completas (k ≤ 5) | O(1) con `COUNT` | Impacto real: despreciable |

### 8.4 Qué medir antes de optimizar

No optimizaría nada más allá de los índices sin datos. Recomiendo, en este orden:

1. Activar `logging: ['query']` + `maxQueryExecutionTime: 200` en staging para detectar consultas lentas reales.
2. `EXPLAIN ANALYZE` sobre las 4 consultas de §7.2 con volumen sembrado representativo.
3. Prueba de carga sobre `/signin` (el endpoint más caro por bcrypt) para dimensionar el rate limit.

---

## 9. Manejo de errores

### 9.1 Estado actual

Existe una infraestructura de errores razonable pero **aplicada de forma inconsistente**:

```
domain/errors/
├── app-error.error.ts       AppError(message, statusCode, errorCode?)
├── app-error-code.ts        enum AppErrorCode (18 valores) ← nunca usado
├── http-status-code.ts      constantes + union type
└── validation.error.ts      ValidationError(message)      ← con captureStackTrace
```

Y **cuatro** caminos distintos por los que un error llega al cliente:

1. `catchError` → `next(error)` → `errorHandler` (el camino previsto)
2. `validateMiddlewareDTO` responde directamente con 400
3. `auth-token.middleware` responde directamente con 401… o **no responde** (C-03)
4. `auth.controller.refreshToken` responde directamente con 401

### 9.2 Hallazgos

| Sev. | Hallazgo | Ubicación |
|---|---|---|
| 🔴 | **Error silencioso que cuelga la petición** — el `catch` sin rama final del middleware de auth (C-03) | `auth-token.middleware.ts:34-53` |
| 🟠 | **Errores genéricos `new Error(...)` en dominio y aplicación.** `VerifyAccessTokenUseCase:14` (`'Usuario no encontrado.'`), `User.validateEmail:18`, `User.verifyEmail:23`, `RolRepository:12,19`, `AddressRepository:52`, `CustomerRepository:42`. Al no ser `AppError`, `errorHandler` los convierte en **500** aunque sean condiciones de negocio esperables (404/409). | 6 archivos |
| 🟠 | **Fuga de mensajes internos** (S-05) | `error-handler.middleware.ts:26`, `register-customer.use-case.ts:171` |
| 🟠 | **`AppErrorCode` nunca se usa.** Ningún `AppError` recibe el tercer parámetro, así que todas las respuestas llevan `errorCode: undefined`. El cliente no puede distinguir programáticamente "email ya registrado" de "DNI ya registrado": ambos son `409` con textos distintos. Obliga al frontend a comparar cadenas en español. | todo el proyecto |
| 🟠 | **`ValidationError` de dominio solo se traduce en un sitio.** `RegisterCustomerUseCase:163` lo convierte en `AppError(400)`. Pero `Customer.updateProfile()` también lanza `ValidationError`, y `UpdateCustomerUseCase` **no** lo captura: un DNI inválido que sortee el DTO produce un **500**. | `update-customer.user-case.ts` |
| 🟡 | **`try/catch` que traga el error.** En `resend-code.use-case.ts:89-94` y `register-customer.use-case.ts:141-146`, un fallo de envío de correo se loguea y se continúa. La decisión es **deliberada y correcta** (no revertir un registro confirmado por un fallo de correo) y está bien comentada — pero el usuario recibe *"Un nuevo enlace ha sido enviado a tu correo"* cuando puede no haberse enviado, y no hay reintento. Es donde encaja el patrón *outbox*. | 2 archivos |
| 🟡 | **`catch` que no aporta.** `verify-email-account.use-case.ts:28-35` captura y sustituye el error del token, perdiendo la distinción entre "expirado" y "malformado". El propio `JwtTokenService` se esfuerza en re-lanzar los errores originales de JWT y aquí se descartan. | 1 archivo |
| 🟡 | **`errorHandler` no valida el tipo del error.** Accede a `error.stack \|\| error.message` sin comprobar que sea un `Error`. Un `throw 'string'` produce `"undefined"` en el log. | `error-handler.middleware.ts:23` |
| 🟢 | **Doble logueo.** `index.ts:56-57` hace `console.error(error)` y luego `logger.error(...)`. | `index.ts` |
| 🟢 | **Sin manejadores globales.** No hay `process.on('unhandledRejection')` ni `('uncaughtException')`. Un fallo fuera del ciclo de petición termina el proceso sin log estructurado. | `index.ts` |

### 9.3 Estrategia propuesta

Una jerarquía de errores **de dominio, sin códigos HTTP**, y una única traducción a HTTP en el borde:

```
domain/errors/
├── domain.error.ts            abstract DomainError { abstract code: string }
├── not-found.error.ts         NotFoundError      → 404
├── conflict.error.ts          ConflictError      → 409
├── validation.error.ts        ValidationError    → 422
├── unauthorized.error.ts      UnauthorizedError  → 401
└── forbidden.error.ts         ForbiddenError     → 403
```

Reglas:

1. **El dominio y la aplicación lanzan errores de dominio.** Nunca conocen códigos HTTP.
2. **Un único `errorHandler` traduce** `DomainError → HTTP` mediante un mapa, y cualquier otra cosa
   en un 500 genérico con `errorId`.
3. **Un único formato de respuesta de error** para los cuatro caminos actuales.
4. **Los errores de infraestructura se envuelven** en el repositorio: la violación de la restricción
   `unique` de PostgreSQL (código `23505`) se traduce a `ConflictError`, no a 500.
5. **`errorCode` siempre presente** para que el cliente pueda ramificar sin leer español.
6. **Nada de mensajes internos al cliente**: van al log con `errorId` de correlación.

Formato único propuesto:

```jsonc
{
  "error": {
    "code": "EMAIL_ALREADY_REGISTERED",
    "message": "El correo ya está registrado.",
    "details": [ { "field": "email", "constraint": "..." } ],  // solo en validación
    "errorId": "9f3c…"                                          // solo en 5xx
  }
}
```

Nota de compatibilidad: este cambio **rompe el contrato con el frontend**. Ver §14 para la
estrategia de migración sin cortes.

---

## 10. Testing

### 10.1 Estado actual

🔴 **No existe ni un solo test.** `npm test` ejecuta `echo "Error: no test specified" && exit 1`.
No hay framework instalado (ni Jest, ni Vitest, ni node:test). `tsconfig.json` excluye `src/test` e
incluye `test/*.*.ts` — **dos rutas que no existen**, residuo de un intento anterior.

Es la carencia más grave del proyecto después de los bloqueantes de build, y explica por qué C-04
(un endpoint completamente roto) ha podido convivir con el código sin ser detectado.

### 10.2 Testabilidad del código actual

Aquí el proyecto tiene una ventaja importante que conviene reconocer: **la arquitectura ya está
preparada para testear**. La inyección por constructor y las interfaces de dominio significan que
los tests unitarios no necesitan infraestructura.

**Fácil de testear (sin cambios):**

| Componente | Por qué |
|---|---|
| Todos los casos de uso | Reciben interfaces por constructor; basta un objeto literal como doble |
| `User`, `Customer` (entidades) | Lógica pura, sin dependencias. Los tests más rentables del proyecto |
| `UserMapper` | Función pura entrada→salida |
| `BcryptPasswordHasher` | Sin dependencias externas |
| `catchError` | Función de orden superior aislada |

**Difícil de testear (requiere cambios):**

| Componente | Obstáculo | Solución |
|---|---|---|
| `RegisterCustomerUseCase` | Lee `process.env.FRONTEND_URL` directamente | Inyectar la URL base por constructor |
| `ResendCodeUseCase` | Ídem | Ídem |
| `NodemailerEmailService` | Crea el `Transporter` en el constructor con `process.env` | Inyectar el transporter o la configuración |
| `JwtTokenService` | Testeable, pero con 6 parámetros posicionales opcionales | Pasar a objeto de configuración |
| `envConfig` | Se evalúa al importar y lanza si faltan variables | Convertir en función `loadConfig()` |
| Repositorios | Requieren PostgreSQL real | Testcontainers (integración, no unitario) |
| `cloudinary.config.ts` | Lanza al importarse | Eliminar (código muerto) |

Las cinco primeras filas tienen la misma causa: **acceso a `process.env` fuera de la capa de
configuración** (§2.2). Corregir eso desbloquea la testabilidad de todo el proyecto.

### 10.3 Estrategia propuesta

**Herramientas:** Vitest (más rápido que Jest, soporte nativo de TS sin configuración adicional) +
Supertest (HTTP) + Testcontainers (PostgreSQL efímero).

#### Nivel 1 — Tests unitarios (~70% del esfuerzo)

Sin E/S. Dobles como objetos literales que implementan las interfaces de dominio.

| Objetivo | Casos mínimos |
|---|---|
| `User` | email inválido lanza; `verifyEmail()` dos veces lanza; `canLogin()` según `email_verified`; `isCustomer/isAdmin/isEmployee` |
| `Customer` | DNI de 7/9 dígitos lanza, 8 pasa; teléfono de 8/10 lanza, 9 pasa; `updateProfile` con campos parciales; fecha inválida lanza |
| `LoginUseCase` | usuario inexistente → 401; email sin verificar → 403; contraseña incorrecta → 401; camino feliz emite ambos tokens; **el email se normaliza a minúsculas** |
| `RegisterCustomerUseCase` | email duplicado verificado / no verificado; DNI duplicado; **rollback si falla el guardado del cliente**; **commit y respuesta correcta si falla el envío de correo**; `release()` se llama siempre |
| `VerifyEmailAccountUseCase` | token inválido; usuario inexistente; email ya verificado; **token de otro usuario rechazado** (regresión de S-02); camino feliz |
| `ResendCodeUseCase` | cooldown activo; email ya verificado; usuario inexistente; camino feliz invalida el token previo |
| `ChangePasswordUserCase` | contraseña actual incorrecta; nueva ≠ confirmación; nueva igual a la actual; camino feliz llama a `hash` y `update` |
| Casos de uso de dirección | **propiedad ajena → FORBIDDEN** (los 4); tope de 5; primera dirección es predeterminada; no se puede borrar la predeterminada |
| `UserMapper` | con y sin cliente; **formato de `birthdate`** (regresión de T-01) |

#### Nivel 2 — Tests de integración (~20%)

Repositorios contra PostgreSQL real (Testcontainers), sin HTTP.

- Mappers `toDomain`/`toTypeOrm` de ida y vuelta.
- **`UserRepository.save()` devuelve `role_name` poblado** (regresión de §3.9).
- **`AddressRepository.findByCustomerId` devuelve `customerId` poblado** (regresión de §3.9).
- `clearDefaults` e `invalidateUserToken` afectan exactamente las filas esperadas.
- **`TypeOrmUnitOfWork`: rollback real deja la base sin rastro** — el test más valioso de este nivel.
- Restricción `unique` de email produce el error esperado.

#### Nivel 3 — Tests E2E (~10%)

Supertest sobre `createApp()` con base de datos efímera y servicios externos como dobles.

- Flujo completo: signup → verificar correo → login → perfil → cambiar contraseña → login con la nueva.
- Flujo de direcciones: crear → listar → marcar predeterminada → actualizar → borrar.
- **Autorización: el usuario A no puede leer, modificar ni borrar direcciones de B** (los 4 verbos).
- Middleware: sin token → 401; token expirado → 401; token de usuario borrado → **debe responder,
  no colgarse** (regresión de C-03).
- Validación: cada DTO rechaza entradas inválidas con 400.

### 10.4 Casos límite y negativos que deben cubrirse

**Casos límite:** DNI de 7/8/9 dígitos; teléfono de 8/9/10; contraseña de 7/8/12/13/73 caracteres
(expondría S-13); dirección nº 5 y nº 6 (tope); borrar la única dirección existente; reenvío en el
segundo 89 y en el 91 (cooldown); verificar en el minuto 9 y en el 11 (expiración — expondría §3.7).

**Casos negativos:** token firmado con otro secreto; token con `type` incorrecto (S-08); refresh
token usado tras rotación (S-06); `addressId` no-UUID; body con propiedades extra (S-09); registro
concurrente con el mismo email (§7.4).

### 10.5 Orden de introducción recomendado

1. **Primero, tests de regresión de los cuatro bloqueantes** (C-01…C-04). Fijan el comportamiento
   correcto *antes* de corregirlos.
2. Entidades de dominio — máximo retorno, coste casi nulo.
3. Casos de uso de autenticación y dirección — cubren la lógica de negocio y de autorización.
4. E2E del flujo de registro completo — es el flujo con más piezas y más riesgo.
5. Integración de repositorios — el más costoso de montar; último.

**Meta razonable:** 70% de cobertura en `domain/` y `application/`. No perseguiría cobertura en
`infrastructure/` ni en `presentation/`: ahí el valor está en los E2E, no en el porcentaje.

---
## 11. Mantenibilidad

### 11.1 Evaluación por dimensión

| Dimensión | Nota | Comentario |
|---|---|---|
| **Cohesión** | 🟢 Alta | Cada archivo hace una cosa. Un caso de uso por operación, un repositorio por agregado. Muy buena granularidad. |
| **Acoplamiento** | 🟡 Medio | Bajo entre capas (mérito real). Alto con `process.env` en 6 archivos y con TypeORM en el `DataSource` global. |
| **Complejidad** | 🟢 Baja | Ninguna función supera complejidad ~14; el promedio está por debajo de 5. |
| **Reutilización** | 🟡 Media | Los mappers y `catchError` se reutilizan bien; la lógica de cookies, formateo de fechas y comprobación de propiedad están copiadas. |
| **Extensibilidad** | 🟢 Buena | Añadir un módulo nuevo (productos, pedidos) no exige modificar código existente, salvo el composition root. |
| **Consistencia** | 🟡 Media | Ver §11.2 |
| **Organización de carpetas** | 🟢 Muy buena | La estructura por capas es clara y navegable. Un desarrollador nuevo encuentra las cosas. |
| **Convenciones** | 🟡 Media | Buenas convenciones, aplicadas de forma desigual |
| **Documentación** | 🟡 Media | Existe y es abundante, pero **desactualizada** (§11.3) |
| **Configuración** | 🟠 Débil | `.env.example` incompleto (§11.4), `docker-compose.yaml` vacío |

### 11.2 Inconsistencias de convención

Cada una es menor; juntas son fricción diaria:

| Área | Variantes coexistentes |
|---|---|
| Nombres de archivo | `*.use-case.ts` (14) vs `*.user-case.ts` (2) |
| Nombres de clase | `RegisterCustomerUseCase` vs `ChangePasswordUserCase` |
| Idioma en el código | `Rol`/`RolEntity`/`rol_id` (español) junto a `User`/`Address`/`houseType` (inglés), en el mismo modelo |
| Convención de campos | `role_name`, `rol_id`, `last_name`, `email_verified` (snake_case) junto a `houseType`, `isDefault`, `apartmentNumber` (camelCase) — **en la misma base de datos** |
| Códigos de estado | Constantes (`OK`, `BAD_REQUEST`) en casos de uso vs literales (`401`, `400`) en middlewares |
| Modificadores | `public readonly` en `LoginUseCase` y `ChangePasswordUserCase` vs `private readonly` en el resto — el primero **expone los repositorios públicamente** sin motivo |
| Formato de respuesta | 5 variantes (§5.5) |
| Formato de error | 4 variantes (§9.1) |
| Barriles `index.ts` | Presentes en `entities`, `repository`, `use-cases`, `routes`; ausentes en `dtos`, `mappers`, `services`, `controller` |

La mezcla snake_case/camelCase **dentro del mismo esquema de base de datos** es la que más costará:
obliga a recordar caso por caso cómo se llama cada columna.

### 11.3 Documentación

🟢 **Cantidad y esfuerzo notables**: 5 documentos en `docs/` (incluido `doc.burger.yaml`) y un README
de 19 KB con tabla de contenidos, diagramas y ejemplos.

🟠 **Pero el README describe un sistema que ya no existe.** Contrastado con el código:

| README dice | Código real |
|---|---|
| "verificación de email (OTP de 6 dígitos)" | Verificación por **enlace con JWT**, no OTP |
| "Autenticación con JWT (login por email **o username**)" | Solo por email; no existe `username` en ninguna entidad |
| "✅ Registro de empleados (transaccional)" | **No existe** ningún caso de uso de empleado; solo la entidad TypeORM |
| Sección "Sistema de Verificación OTP" | No hay OTP en el código |

Documentación incorrecta es peor que ausente: dirige al desarrollador nuevo hacia suposiciones
falsas. Un README que promete OTP hará que alguien busque durante media hora un código que no existe.

Falta además: documentación de API ejecutable (no hay OpenAPI/Swagger generado desde el código;
`docs/API_DOCUMENTATION.md` es manual y se desincronizará igual), y `ADR`s que expliquen las
decisiones arquitectónicas tomadas —que son buenas y merecen quedar registradas.

### 11.4 Configuración y onboarding

🔴 **Un clon nuevo del repositorio no arranca.** `.env.example` declara **10** variables; `envConfig`
exige **20** vía `requireEnv`, que lanza al importarse. Faltan en el ejemplo:

```
FRONTEND_URL              TEMPORARY_TOKEN_SECRET      TEMPORARY_TOKEN_EXPIRATION
OTP_SECRET                CLOUDINARY_CLOUD_NAME       CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET     MAILER_SERVICE              MAILER_EMAIL
MAILER_PORT               MAILER_USER                 MAILER_PASSWORD
NODE_ENV
```

Un desarrollador nuevo copia `.env.example`, ejecuta `npm run dev` y obtiene
`Error: Variable de entorno requerida: FRONTEND_URL`. Corrige, reintenta, obtiene el siguiente. Diez
iteraciones antes de arrancar.

Agravante: `OTP_SECRET` y las tres de `CLOUDINARY_*` son **obligatorias pero no se usan en ningún
sitio** (`cloudinary.config.ts` es código muerto y no hay OTP). El proyecto exige credenciales de un
servicio que no utiliza.

🟡 `docker-compose.yaml` existe con **0 bytes**. Un `docker-compose` funcional con PostgreSQL sería
la mejora de onboarding con mayor relación beneficio/coste del proyecto.

### 11.5 Herramientas de calidad

🟢 **Bien montadas y funcionando**: ESLint 9 (flat config) + Prettier + `eslint-config-prettier` +
Husky + lint-staged con hook `pre-commit`. Esto es más de lo que tienen muchos proyectos.

🟠 **Pero no bloquean nada relevante:** `lint-staged` ejecuta `eslint --fix`, que corrige lo
autocorregible y **deja pasar los warnings**. Los 12 warnings actuales incluyen las dos variables
muertas que delatan C-04. Añadir `--max-warnings 0` y un `tsc --noEmit` al hook habría impedido que
un endpoint roto llegara a `develop`.

No hay CI: ninguna verificación automática en el repositorio remoto.

### 11.6 Qué se convertirá en problema al crecer

Por orden de urgencia:

1. **El composition root.** 3 archivos con instancias duplicadas ya hoy. Con pedidos, pagos, catálogo
   y notificaciones será inmanejable y seguirá generando divergencias de configuración como la de
   `JwtTokenService`.
2. **Las inconsistencias de formato de respuesta.** Cada nuevo endpoint añade una variante más; el
   frontend acumula casos especiales.
3. **La ausencia de tests.** Sin red de seguridad, cada refactor es una apuesta. Ya se pagó el precio
   con C-04.
4. **Convenciones de nombres mezcladas (español/inglés, snake/camel).** Cuesta poco arreglarlo ahora
   y mucho con 30 tablas.
5. **`AppError` con HTTP en el dominio.** Cuando aparezca el primer worker o job programado, habrá
   que decidir qué hacer con los códigos HTTP en la lógica de negocio.
6. **Sin migraciones.** Cada día con `synchronize: true` es un día más de esquema sin historial.

---

## 12. Code smells

### 🔴 Broken Window — código muerto que rompe el build

**Dónde.** `verification-session-token.middleware.ts` importa de `src/utils`, eliminado hace 3
commits. El archivo no compila y nunca se usa.

**Por qué es un smell.** No es solo código muerto: es **evidencia de una migración incompleta**
(commit `c32a73d`) que nadie verificó porque `npm run build` ya fallaba por otra razón (C-01). Dos
fallos que se ocultan mutuamente.

**Solución.** Reparar el import y montar el middleware (contiene la única validación de `type`, ver
S-08), o eliminarlo. No dejarlo en el limbo.

---

### 🟠 Duplicate Code

**Dónde.** `CreateCustomerAddressDto` ≡ `UpdatedAddressCustomerDto`; `HouseType` × 4;
`JwtTokenService` construido 2 veces con configuración distinta; `res.cookie` × 3; formateo de
`birthdate` × 2; ramas `instanceof jwt.*Error` × 2.

**Solución.** DTO base con `extends`; un único `HouseType` en `domain/`; una sola construcción del
servicio de tokens en un container compartido; helper `setRefreshCookie(res, token)`; helper
`formatDateOnly(date)`; extraer `isJwtError(error)`.

---

### 🟠 Shotgun Surgery

**Dónde.** Cambiar la duración del refresh token exige tocar: `envConfig.refreshToken.expiry`,
`auth.controller.ts:33`, `:52` y `:84` (el `maxAge` de la cookie, tres veces). Cambiar el tiempo de
vida del token de verificación exige tocar **cuatro** valores en cuatro archivos (§3.7) — y hoy los
cuatro discrepan.

**Por qué.** Un concepto único disperso en múltiples lugares sin fuente de verdad.

**Solución.** Derivar el `maxAge` de la cookie de la configuración del token; una sola constante
`EMAIL_VERIFICATION_TTL` usada por el JWT, por la fila en base de datos y por la plantilla de correo.

---

### 🟠 Primitive Obsession

**Dónde.** `execute(userId: string, addressId: string)`, `role_name: string`, `houseType` como
`varchar`, fechas como `string` en unos sitios y `Date` en otros (`updatecustomerDto.birthdate?: string`
vs `Customer.birthdate?: Date`), `type: string` en `generateVerificationSessionToken`.

**Por qué.** `execute(addressId, userId)` y `execute(userId, addressId)` son indistinguibles para el
compilador — y de hecho **el orden difiere entre casos de uso**: `DeleteCustomerAddressUseCase`
recibe `(addressId, userId)` mientras `GetAddressCustomerUseCase` recibe `(userId)`. Un intercambio
accidental compila sin problema.

**Solución (proporcionada).** No introduciría *branded types* para todo. Sí: un union type para
`type: 'email_verification' | 'password_reset'`, el enum `UserType` ya existente para los roles, y
`houseType` como enum de PostgreSQL.

---

### 🟠 Leaky Abstraction

**Dónde (tres direcciones distintas):**

1. `AppError(message, statusCode: HttpStatusCode)` en `domain/` — HTTP filtrándose *hacia dentro*.
2. `IAddressRepository.findByCustomerId(): Promise<Address[] | null>` — el `null` es un detalle de
   "no encontré filas", no un concepto de dominio.
3. `IRolRepository` lanza donde los demás devuelven `null` — dos contratos incompatibles tras la
   misma abstracción.

---

### 🟠 Inappropriate Intimacy / Feature Envy

**Dónde.** `AddressController.updateAddressCustomer` construye una entidad de dominio a partir del
body y se la pasa al caso de uso. El controlador conoce la forma interna de `Address` en vez de
enviar un DTO.

**Consecuencia directa.** Es la causa de C-04 y S-04. No es un smell teórico: **este smell concreto
produjo un endpoint roto y un fallo de control de acceso**.

**Solución.** El controlador extrae primitivas de `req` (`userId`, `addressId`, DTO validado); el
caso de uso construye la entidad.

---

### 🟡 Dead Code

Inventario completo en §3.5: 19 elementos, desde archivos enteros (`cloudinary.config.ts`,
`house-type.enum.ts`) hasta enums completos sin usar (`AppErrorCode`, `UserType`) y métodos de
interfaz nunca invocados.

El caso más significativo es `markAsVerified()`: existe, está implementado, y **su ausencia de uso
es la razón por la que la columna `verified` nunca se actualiza** (§7). El código muerto aquí no es
solo ruido, es la huella de una funcionalidad a medio implementar.

---

### 🟡 Long Method

**Dónde.** `RegisterCustomerUseCase.execute` — 140 líneas, `try` que abarca todo el método, `catch`
de tres ramas y `finally`.

**Solución.** Extraer `assertEmailAvailable()`, `assertDniAvailable()`, `createVerificationRecord()`
y `translateError()`. El método principal queda como orquestador legible de ~40 líneas.

---

### 🟡 Deep Nesting

**Dónde.** `customer.controller.ts:46-50` — ternario anidado dentro de un ternario:

```ts
const birthdate = updatedCustomer.birthdate
  ? updatedCustomer.birthdate instanceof Date
    ? updatedCustomer.birthdate.toISOString().split('T')[0]
    : String(updatedCustomer.birthdate).split('T')[0]
  : null;
```

El anidamiento delata incertidumbre sobre el tipo real de `birthdate` — que es exactamente el
problema de fondo (§4.2, T-01): el repositorio devuelve a veces `Date` y a veces string, según
provenga de la entidad o del driver.

**Solución.** Normalizar el tipo en el mapper del repositorio; el controlador recibe siempre `Date | null`.

---

### 🟡 Excessive Parameters

**Dónde.** `new JwtTokenService(secret, expiresIn, tempSecret, tempExpiration, refreshSecret, refreshExpiration)`
— 6 parámetros posicionales, 4 opcionales. Es precisamente por esto que `customer.composition.ts`
pasa solo los 4 primeros y **acaba con un servicio sin capacidad de refresh**, silenciosamente.

También: constructor de `Address` con 12 parámetros posicionales, 4 opcionales.

**Solución.** Objeto de configuración: `new JwtTokenService({ access: {...}, refresh: {...}, temporary: {...} })`.
El error de configuración se vuelve imposible de cometer.

---

### 🟡 Tight Coupling a `process.env`

**Dónde.** 6 archivos, incluidos **dos casos de uso** (§2.2).

**Por qué es un smell serio.** Un caso de uso que lee `process.env` no es una unidad de negocio pura:
es intestable sin manipular estado global del proceso, y su comportamiento depende de algo invisible
en su firma.

---

### 12.11 Smells buscados y **no** encontrados

| Smell | Veredicto |
|---|---|
| **God Object** | 🟢 Ausente. Ninguna clase acumula responsabilidades desmedidas. |
| **God Function** | 🟢 Ausente. La mayor tiene 140 líneas y es orquestación legítima. |
| **Large Class** | 🟢 Ausente. La mayor (`JwtTokenService`) tiene 125 líneas y 6 métodos cohesivos. |
| **Circular Dependencies** | 🟢 Ausente entre módulos (§2.4). |
| **Anemic Domain Model** | 🟢 Ausente — y esto merece destacarse: `User` y `Customer` **contienen invariantes reales** (validación de email, DNI, teléfono, `canLogin()`, `updateProfile()`). En proyectos con esta estructura lo habitual es encontrar entidades vacías; aquí no. |
| **Callback Hell / Promise Hell** | 🟢 Ausente. `async/await` usado consistentemente. |
| **Magic Numbers descontrolados** | 🟡 Parcial — las constantes importantes (`MAX_ADDRESSES`, `COOLDOWN_SECONDS`) sí están nombradas. |

---

## 13. Estrategia de refactorización

**Principio rector: cambios incrementales, no reescritura.** La arquitectura es correcta; el problema
son defectos concretos y localizados. Reescribir destruiría trabajo bien hecho.

Cada fase es desplegable de forma independiente.

---

### Fase 1 — Críticas (1–2 semanas)

*Bugs, vulnerabilidades, riesgo de pérdida de datos, caídas.*

| # | Tarea | Referencia | Esfuerzo |
|---|---|---|---|
| 1.1 | Eliminar `ignoreDeprecations` de `tsconfig.json` — **desbloquea el build** | C-01 | 5 min |
| 1.2 | Corregir el import de `verification-session-token.middleware.ts` | C-02 | 15 min |
| 1.3 | Añadir `return next(error)` al `catch` del middleware de auth | C-03 | 15 min |
| 1.4 | `synchronize: false` + generar la migración inicial + scripts de migración | S-01 | 3–4 h |
| 1.5 | Reparar `PUT /api/address/:addressId`: firma `(userId, addressId, dto)`, autorización desde `req.user` | C-04 / S-04 | 2–3 h |
| 1.6 | Verificar el token de verificación con `findActiveByToken` + `markAsVerified` + transacción | S-02 | 2–3 h |
| 1.7 | Añadir `express-rate-limit` en `/signin`, `/signup`, `/resend-code`, `/refresh-token` | S-03 | 2–3 h |
| 1.8 | Dejar de filtrar `error.message` al cliente; añadir `errorId` de correlación | S-05 | 1 h |
| 1.9 | Unificar la política de contraseñas (`MinLength(8)` + `MaxLength(72)`) en los 3 DTOs | S-13 | 30 min |
| 1.10 | `git mv .gitIgnore .gitignore` y verificar en Linux | S-12 | 10 min |
| 1.11 | `whitelist: true` + `forbidNonWhitelisted: true`; eliminar `rol_id` de `CreateCustomerDTO` | S-09 | 30 min |
| 1.12 | Unificar el TTL del token de verificación en una sola constante | §3.7 | 1 h |
| 1.13 | Completar `.env.example` con las 20 variables y eliminar las obligatorias no usadas | §11.4 | 30 min |
| 1.14 | Instalar Vitest y escribir **tests de regresión de 1.3, 1.5, 1.6** | §10 | 1 día |

> 1.14 va al final de la fase pero debería escribirse **antes** de cada corrección correspondiente.

**Resultado:** el proyecto compila, se despliega, no pierde datos, no cuelga peticiones, y las cuatro
vulnerabilidades P0 quedan cerradas.

---

### Fase 2 — Importantes (3–4 semanas)

*Mantenibilidad, escalabilidad, testing, arquitectura.*

| # | Tarea | Referencia | Esfuerzo |
|---|---|---|---|
| 2.1 | Suite de tests unitarios de entidades y casos de uso (meta: 70% en `domain/` + `application/`) | §10.3 | 1 semana |
| 2.2 | Centralizar la configuración: eliminar los 6 accesos a `process.env` fuera de `envConfig`; inyectar `frontendUrl` en los casos de uso | §2.2 | 4–6 h |
| 2.3 | Container único de composición: una instancia por repositorio y servicio | §2.7 | 4–6 h |
| 2.4 | Jerarquía de errores de dominio sin HTTP + traducción única en `errorHandler` + `errorCode` siempre presente | §9.3 | 1–2 días |
| 2.5 | Formato único de respuesta (`ApiResponse<T>`) en los 13 endpoints | §5.5 | 1 día |
| 2.6 | Añadir `helmet`, `/health`, manejador 404, apagado ordenado (SIGTERM + `DataSource.destroy()`), `limit` en `express.json` | §5.9 | 4 h |
| 2.7 | Índices de base de datos (4 migraciones) + purga de `email_verification` | §7.2, §7.6 | 4 h |
| 2.8 | Transacciones en direcciones y verificación de email | §7.4 | 4 h |
| 2.9 | Revocación de refresh tokens: `jti` + tabla + `POST /logout` | S-06 | 1–2 días |
| 2.10 | Tests E2E del flujo de registro y del de direcciones (incluida autorización cruzada) | §10.3 | 2 días |
| 2.11 | CI en GitHub Actions: `type-check` + `lint --max-warnings 0` + `test` | §11.5 | 3 h |
| 2.12 | Endurecer JWT: `algorithms`, `issuer`, `audience`, validación de `type`, eliminar el secreto por defecto | S-08 | 3 h |
| 2.13 | Restricciones de integridad: `NOT NULL`, índice único parcial de dirección predeterminada, enum de `houseType` | §7.1 | 4 h |

---

### Fase 3 — Mejoras (2–3 semanas)

*Clean code, organización, naming.*

| # | Tarea | Referencia |
|---|---|---|
| 3.1 | Eliminar los 19 elementos de código muerto de §3.5 | §3.5 |
| 3.2 | Unificar `HouseType` en una sola declaración | §3.4 |
| 3.3 | `UpdatedAddressCustomerDto extends CreateCustomerAddressDto` | §3.4 |
| 3.4 | Renombrar `*.user-case.ts` → `*.use-case.ts`, `ChangePasswordUserCase` → `...UseCase`, `isMatchPassword`, `passwordHasherd`, `updatecustomerDto` | §3.2 |
| 3.5 | Extraer helpers: `setRefreshCookie`, `formatDateOnly`, `isJwtError` | §12 |
| 3.6 | Descomponer `RegisterCustomerUseCase.execute` en 4 métodos | §12 |
| 3.7 | Corregir `UserMapper` (`birthday`/`birthdate`) y el `toDomain` de `UserRepository` (`role_name`) | T-01, §3.9 |
| 3.8 | `findByCustomerId` devuelve `[]` en vez de `null` | §3.9 |
| 3.9 | Sustituir literales `401`/`400` por las constantes existentes; usar `AppErrorCode` | §3.6 |
| 3.10 | `noUnusedLocals: true` + `--max-warnings 0` en el hook de pre-commit | T-04 |
| 3.11 | Actualizar README (eliminar OTP, username y registro de empleados) | §11.3 |
| 3.12 | `docker-compose.yaml` funcional con PostgreSQL | §11.4 |
| 3.13 | Unificar convención de nombres de columnas (decisión de equipo: todo snake_case) | §11.2 |
| 3.14 | Migrar `bcryptjs` → `bcrypt` (binding nativo) | §8.2 |

---

### Fase 4 — Nice to have

| # | Tarea | Justificación |
|---|---|---|
| 4.1 | Versionado `/api/v1` | Barato ahora, caro después. **Adelantaría esto a Fase 2** si hay app móvil prevista. |
| 4.2 | OpenAPI generado desde el código | Elimina la desincronización de la documentación manual |
| 4.3 | `request-id` + logging estructurado de peticiones (sustituir `morgan` por `pino-http`) | Observabilidad |
| 4.4 | Envío de correo asíncrono con cola + patrón outbox | Latencia y fiabilidad |
| 4.5 | Métricas (Prometheus) y health check profundo | Operación |
| 4.6 | `Result<T,E>` en casos de uso | Solo si el equipo lo adopta como convención completa |
| 4.7 | Testcontainers para tests de repositorio | Alto coste de montaje, valor moderado |
| 4.8 | Idempotency-Key | **Antes** del módulo de pedidos, no después |

---

## 14. Cómo no romper funcionalidad

Para cada cambio de riesgo: qué se ve afectado, qué test debe existir antes, cómo migrar, cómo verificar.

---

### 14.1 Desactivar `synchronize` (1.4) — **el cambio de mayor riesgo**

**Comportamiento afectado.** Hoy el esquema se crea solo al arrancar. Al desactivarlo, una base de
datos vacía **no tendrá tablas** y la aplicación fallará en la primera consulta.

**Antes del cambio.**
- Volcado completo del esquema y los datos de producción (`pg_dump`).
- Test de integración que arranque contra una base vacía + migraciones y verifique el flujo de registro.

**Migración segura.**
1. Generar la migración inicial desde el esquema **actual** (`typeorm migration:generate InitialSchema`).
2. Revisar el SQL generado **línea por línea**: si difiere del esquema real, `synchronize` había
   introducido divergencias que hay que reconciliar antes.
3. En la base existente, marcar la migración como aplicada sin ejecutarla (insertar la fila en
   `migrations`), para que no intente recrear tablas existentes.
4. Desplegar con `synchronize: false` y `migrationsRun: true`.

**Verificación.** El esquema tras el despliegue debe ser idéntico al del volcado previo
(`pg_dump --schema-only` y comparar). Flujo de registro y login funcionando.

**Reversión.** Restaurar `synchronize: true` es inmediato, pero **no revierte DDL ya ejecutado**.
Por eso el volcado previo no es opcional.

---

### 14.2 Reparar `PUT /api/address/:addressId` (1.5)

**Comportamiento afectado.** El endpoint **hoy siempre devuelve 404** (C-04). Es imposible que un
cliente dependa de su funcionamiento correcto — pero es posible que dependa del 404.

**Antes del cambio.**
- E2E que documente el comportamiento actual (404) — para constatar el cambio, no para preservarlo.
- E2E del comportamiento deseado: A actualiza su dirección → 200; **A intenta actualizar la de B →
  403** (este es el test que importa).

**Migración segura.** Cambio de contrato: el body pasa de `{ address: {...} }` (que nunca funcionó)
al DTO plano ya validado por la ruta. Coordinar con el frontend en el mismo despliegue. Como el
endpoint está roto, no hay periodo de compatibilidad que mantener.

**Verificación.** Los 4 casos: propietario→200, ajeno→403, inexistente→404, body inválido→400.

---

### 14.3 Verificación de email por token (1.6)

**Comportamiento afectado.** Enlaces de verificación **ya emitidos y aún no usados** dejarán de
funcionar si su token no coincide con la fila activa (que es justamente el fallo a corregir).

**Antes del cambio.**
- Test: token válido y almacenado → 200.
- Test: token válido pero **no** el almacenado → 400 (regresión de S-02).
- Test: token de otro usuario → 400.

**Migración segura.** Desplegar en una ventana de baja actividad. Los usuarios afectados pueden
recuperarse con `/resend-code`, que ya existe — pero conviene que el mensaje de error lo indique
explícitamente ("solicita un nuevo enlace").

**Verificación.** Registro completo de extremo a extremo con el enlace real del correo.

---

### 14.4 Unificar el formato de respuestas (2.5) — **el de mayor impacto en el frontend**

**Comportamiento afectado.** **Todos** los endpoints. Cualquier cliente que lea `response.data`,
`response.customer` o `response.user` se rompe.

**Antes del cambio.**
- E2E que capture la forma exacta de la respuesta actual de los 13 endpoints (*snapshot tests*).
- Inventario de qué consume el frontend en cada uno.

**Migración segura — no hacerlo de golpe.** Dos opciones, en orden de preferencia:

- **Opción A (recomendada): versionar.** Montar el formato nuevo bajo `/api/v1` y mantener las rutas
  actuales sirviendo el formato antiguo durante un periodo de transición. El frontend migra endpoint
  por endpoint. Esto convierte 4.1 en prerrequisito de 2.5.
- **Opción B: despliegue coordinado.** Solo viable si frontend y backend se despliegan juntos y no
  hay app móvil.

**Verificación.** Contract tests que validen la forma de la respuesta de cada endpoint en ambas
versiones.

---

### 14.5 Jerarquía de errores de dominio (2.4)

**Comportamiento afectado.** Los códigos HTTP que devuelve cada caso de uso. Corregir los 7 códigos
incorrectos de §5.3 **cambia el contrato**: un frontend que trate `409` como "las contraseñas no
coinciden" dejará de funcionar cuando pase a ser `422`.

**Antes del cambio.** Un test por caso de uso que fije el código HTTP esperado, escrito **primero
con los valores actuales** y actualizado deliberadamente en el mismo commit que el cambio, para que
el diff documente cada modificación de contrato.

**Migración segura.** Introducir `errorCode` **primero**, manteniendo los códigos HTTP actuales.
El frontend migra a `errorCode`. Solo entonces corregir los códigos HTTP. Así el cliente deja de
depender del código de estado antes de que este cambie.

---

### 14.6 Rate limiting (1.7)

**Comportamiento afectado.** Usuarios legítimos tras NAT corporativo o CGNAT pueden alcanzar el
límite por IP.

**Migración segura.** Desplegar en **modo observación** primero: contar y loguear sin bloquear,
durante una semana. Ajustar umbrales con datos reales. Después activar el bloqueo. Fijar
`app.set('trust proxy', 1)` si hay proxy inverso — **sin esto, todas las peticiones comparten la IP
del proxy y el rate limit bloquea a todo el mundo a la vez.**

**Verificación.** Métricas de peticiones bloqueadas por endpoint antes de activar el bloqueo real.

---

### 14.7 Principios generales para esta refactorización

1. **Un cambio de comportamiento por commit.** Renombrados y cambios de lógica nunca en el mismo commit.
2. **Test de caracterización primero** cuando el comportamiento actual sea dudoso: escribir el test
   que documenta lo que hace *hoy*, y luego cambiarlo deliberadamente.
3. **Fase 1 antes que nada**: sin build funcionando, ninguna verificación es fiable.
4. **Sin CI, cada despliegue es manual.** Adelantaría 2.11 (CI) al inicio de la Fase 2.
5. **Los cambios de esquema, siempre por migración** una vez desactivado `synchronize`.
6. **Cambios de contrato de API, siempre versionados** o con despliegue coordinado explícito.

---
## 15. Código mejorado

Siete correcciones para los problemas más importantes. En cada una: código actual, problema, código
propuesto, explicación y contrapartidas.

---

### 15.1 Middleware de autenticación que cuelga la petición (C-03)

#### Código actual

`src/presentation/http/middlewares/auth/auth-token.middleware.ts:34-53`

```ts
} catch (error) {
  if (error instanceof jwt.TokenExpiredError) {
    return res.status(401).json({ message: 'Token expirado', code: 'TOKEN_EXPIRED' });
  }
  if (error instanceof jwt.JsonWebTokenError) {
    return res.status(401).json({ message: 'Token inválido', code: 'TOKEN_INVALID' });
  }
  if (error instanceof jwt.NotBeforeError) {
    return res.status(401).json({ message: 'Token no válido aún', code: 'TOKEN_NOT_ACTIVE' });
  }
}
```

#### Problema

Si el error no pertenece a la familia `jsonwebtoken`, no se responde ni se llama a `next()`. La
petición queda colgada hasta el timeout del cliente, reteniendo el socket y sin dejar rastro en logs.
Se dispara con `new Error('Usuario no encontrado.')` (token válido de un usuario borrado) y con
cualquier error del driver de PostgreSQL.

#### Código propuesto

```ts
import { UNAUTHORIZED } from '../../../../domain/errors/http-status-code';
import { AppError } from '../../../../domain/errors/app-error.error';
import { AppErrorCode } from '../../../../domain/errors/app-error-code';

export const verifyToken = (verifyTokenUseCase: VerifyAccessTokenUseCase) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const [scheme, token] = (req.headers.authorization ?? '').split(' ');
      if (scheme !== 'Bearer' || !token) {
        throw new AppError(
          'Acceso denegado: token no proporcionado',
          UNAUTHORIZED,
          AppErrorCode.TOKEN_MISSING,
        );
      }

      req.user = await verifyTokenUseCase.execute(token);
      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return next(new AppError('Token expirado', UNAUTHORIZED, AppErrorCode.TOKEN_EXPIRED));
      }
      if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.NotBeforeError) {
        return next(new AppError('Token inválido', UNAUTHORIZED, AppErrorCode.TOKEN_INVALID));
      }
      return next(error);   // ← cualquier otro error llega al errorHandler
    }
  };
};
```

#### Explicación

**Qué cambió.** Se añade `return next(error)` como rama final; el middleware deja de escribir en `res`
y delega todas las respuestas al `errorHandler`; se comprueba el esquema `Bearer` explícitamente; se
usan las constantes y el enum que ya existen en lugar de literales.

**Por qué.** Un middleware que responde directamente crea un cuarto formato de respuesta de error
(§9.1) y puede olvidar responder — que es exactamente lo que ocurrió. Delegando a `next(error)`, el
formato queda garantizado en un solo sitio y es **imposible** terminar sin respuesta.

**Qué soluciona.** Elimina el cuelgue de peticiones, unifica el formato de error de autenticación y
hace que los errores inesperados queden logueados.

**Contrapartidas.** El cuerpo de la respuesta 401 cambia de `{ message, code }` a lo que emita el
`errorHandler` (`{ message, errorCode }`). Requiere coordinación con el frontend, o adaptar
`errorHandler` para emitir ambos campos durante la transición.

---

### 15.2 Actualización de dirección: endpoint roto y control de acceso (C-04 / S-04)

#### Código actual

`src/presentation/http/controller/address.controller.ts:54-65`

```ts
public updateAddressCustomer = catchError(async (req: Request, res: Response) => {
  const userId = req.user.id;          // nunca usado
  const { addressId } = req.params;    // nunca usado
  const { address } = req.body;
  const response = await this.updateCustomerAddressUseCase.execute(address);
  return res.status(OK).json({ message: 'Dirección actualizada correctamente', data: response });
});
```

`src/application/use-cases/customer/address/update-customer-address.use-case.ts:18-38`

```ts
async execute(data: Address): Promise<Address> {
  const customer = await this.customerRepository.findByUserId(data.customerId);  // ← del body
  ...
}
```

#### Problema

Tres fallos encadenados: (1) `req.body` **es** el DTO validado, así que `req.body.address` es el
string de la calle, no un objeto — el endpoint siempre devuelve 404; (2) la identidad autenticada se
descarta y la autorización se resuelve con un identificador del body; (3) el `:addressId` de la URL
se ignora.

#### Código propuesto

```ts
// controller
public updateAddressCustomer = catchError(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { addressId } = req.params;
  const dto = req.body as UpdatedAddressCustomerDto;

  const response = await this.updateCustomerAddressUseCase.execute(userId, addressId, dto);

  return res.status(OK).json({ message: 'Dirección actualizada correctamente', data: response });
});
```

```ts
// use case
async execute(
  userId: string,
  addressId: string,
  data: UpdatedAddressCustomerDto,
): Promise<Address> {
  const customer = await this.customerRepository.findByUserId(userId);   // ← del token
  if (!customer) {
    throw new AppError('El perfil de cliente no existe', NOT_FOUND);
  }

  const address = await this.addressRepository.findById(addressId);      // ← de la URL
  if (!address) {
    throw new AppError('Dirección no encontrada', NOT_FOUND);
  }
  if (address.customerId !== customer.id) {
    throw new AppError('La dirección no pertenece al usuario registrado', FORBIDDEN);
  }

  // El caso de uso construye la entidad; el controlador nunca la toca
  address.houseType       = data.houseType;
  address.address         = data.address;
  address.department      = data.department;
  address.province        = data.province;
  address.district        = data.district;
  address.apartmentNumber = data.apartmentNumber;
  address.reference       = data.reference;

  return this.addressRepository.update(address);
}
```

#### Explicación

**Qué cambió.** La firma pasa de `execute(data: Address)` a `execute(userId, addressId, dto)`. El
`userId` viene **siempre** del token verificado; el `addressId`, **siempre** de la URL; el DTO aporta
únicamente datos, nunca identidad. Nótese que `isDefault` se omite deliberadamente: cambiar la
dirección predeterminada es la responsabilidad de `PATCH /:addressId`, y permitirlo aquí rompería la
invariante de "una sola predeterminada" (que este endpoint no protege con `clearDefaults`).

**Por qué.** La regla es: **nada que provenga del cliente puede participar en una decisión de
autorización.** Con la firma anterior, el compilador no podía impedir que se pasara un identificador
del body.

**Qué soluciona.** Repara el endpoint, cierra el IDOR y hace que la construcción de la entidad de
dominio vuelva a la capa de aplicación (elimina el *Feature Envy* de §12).

**Contrapartidas.** Cambio de contrato: el body pasa de `{ address: {...} }` al DTO plano. Como el
endpoint nunca funcionó, ningún cliente puede depender de la forma anterior. El `isDefault` del DTO
queda sin efecto en este endpoint: conviene eliminarlo del DTO de actualización para no engañar.

---

### 15.3 Verificación de email: vincular el token presentado (S-02)

#### Código actual

`src/application/use-cases/auth/verify-email-account.use-case.ts:48-57`

```ts
const emailVerification =
  await this.emailVerificationRepository.findActiveByUserId(userId);
if (!emailVerification) {
  throw new AppError('El enlace de verificación es inválido o ha expirado.', BAD_REQUEST);
}
await this.userRepository.verifyEmail(userId);
await this.emailVerificationRepository.invalidateUserToken(userId);
```

#### Problema

Se comprueba que exista **alguna** fila activa para el usuario, no que el token presentado sea el
almacenado. Un enlace antiguo pero criptográficamente válido pasa la comprobación gracias a la fila
nueva. `findActiveByToken()` y `markAsVerified()` existen y no se usan; la columna `verified` nunca
llega a `true`. Además las dos escrituras no son atómicas.

#### Código propuesto

```ts
async execute(token: string): Promise<VerifyTokenResponse> {
  let payload: VerificationSessionPayload;
  try {
    payload = this.tokenService.verifyVerificationSessionToken(token);
  } catch {
    throw new AppError('El enlace de verificación es inválido o ha expirado.', BAD_REQUEST);
  }

  // El token presentado debe ser exactamente el almacenado y activo
  const record = await this.emailVerificationRepository.findActiveByToken(token);
  if (!record || record.user_id !== payload.userId) {
    throw new AppError('El enlace de verificación es inválido o ha expirado.', BAD_REQUEST);
  }

  const user = await this.userRepository.findById(payload.userId);
  if (!user) {
    throw new AppError('Usuario no encontrado', NOT_FOUND);
  }
  if (user.email_verified) {
    throw new AppError('El correo electrónico ya ha sido verificado.', BAD_REQUEST);
  }

  const unitOfWork = this.unitOfWorkFactory();
  try {
    await unitOfWork.startTransaction();
    await unitOfWork.userRepository.verifyEmail(user.id);
    await unitOfWork.emailVerificationRepository.markAsVerified(record.id);
    await unitOfWork.emailVerificationRepository.invalidateUserToken(user.id);
    await unitOfWork.commit();
  } catch (error) {
    await unitOfWork.rollback();
    throw error;
  } finally {
    unitOfWork.release();
  }

  user.email_verified = true;
  return {
    user,
    access_token:  this.tokenService.generateAccessToken(user.id, user.email),
    refresh_token: this.tokenService.generateRefreshToken(user.id, user.email),
  };
}
```

#### Explicación

**Qué cambió.** Se busca por **token** en lugar de por usuario, se comprueba que el token pertenezca
al usuario del payload, se marca la fila como `verified` (que es para lo que existe la columna) y las
tres escrituras se ejecutan en una transacción.

**Por qué.** Un token de un solo uso debe invalidarse **por identidad del token**, no por tiempo. La
comprobación cruzada `record.user_id === payload.userId` impide que un token válido de otro usuario
sirva, aunque un futuro cambio relaje la búsqueda.

**Qué soluciona.** Los enlaces antiguos dejan de funcionar tras un reenvío; el token se consume de
verdad (un enlace, un uso); se elimina la ventana en la que el email queda verificado con el token
aún activo.

**Contrapartidas.** Introduce una dependencia de `IUnitOfWork` en este caso de uso (hay que
inyectarla en `auth.composition.ts`). Requiere un índice sobre `verification_token` (§7.2): sin él,
`findActiveByToken` hace recorrido secuencial sobre una columna `text`. Y los enlaces ya emitidos que
no coincidan con la fila activa dejarán de funcionar tras el despliegue (ver §14.3).

---

### 15.4 `synchronize: true` y ausencia de migraciones (S-01)

#### Código actual

`src/infrastructure/database/typeorm/config/data-source.ts`

```ts
export const AppDataBaseSources = new DataSource({
  type: 'postgres',
  host: envConfig.database.host,
  // ...
  synchronize: true,
  logging: false,
  entities:   [join(__dirname, '../entities/**/*{.ts,.js}')],
  migrations: [join(__dirname, '../migrations/**/*{.ts,.js}')],
});
```

#### Problema

TypeORM ejecuta DDL automáticamente al arrancar para alinear el esquema con las entidades. Un
renombrado de propiedad se traduce en `DROP COLUMN`. La carpeta `migrations/` está declarada pero
vacía: no hay historial ni forma de revertir. No hay configuración de pool ni de SSL.

#### Código propuesto

```ts
const isDev = envConfig.app.nodeEnv === 'development';

export const AppDataBaseSources = new DataSource({
  type: 'postgres',
  host: envConfig.database.host,
  port: envConfig.database.port,
  username: envConfig.database.user,
  password: envConfig.database.password,
  database: envConfig.database.name,

  // Nunca DDL automático fuera de desarrollo
  synchronize: isDev,
  migrationsRun: !isDev,

  logging: isDev ? ['query', 'error'] : ['error'],
  maxQueryExecutionTime: 200,          // registra las consultas lentas

  ssl: envConfig.database.ssl ? { rejectUnauthorized: false } : false,
  extra: {
    max: envConfig.database.poolMax,   // por defecto 10
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  },

  entities:   [join(__dirname, '../entities/**/*{.ts,.js}')],
  migrations: [join(__dirname, '../migrations/**/*{.ts,.js}')],
});
```

Y en `package.json`:

```jsonc
"migration:generate": "typeorm-ts-node-commonjs migration:generate -d src/infrastructure/database/typeorm/config/data-source.ts",
"migration:run":      "typeorm-ts-node-commonjs migration:run -d src/infrastructure/database/typeorm/config/data-source.ts",
"migration:revert":   "typeorm-ts-node-commonjs migration:revert -d src/infrastructure/database/typeorm/config/data-source.ts"
```

#### Explicación

**Qué cambió.** `synchronize` queda restringido a desarrollo; las migraciones se ejecutan al arrancar
fuera de desarrollo; se añade pool, timeouts, SSL condicional y detección de consultas lentas.

**Por qué.** `synchronize` es una herramienta de prototipado. En un sistema con datos reales, un
despliegue rutinario puede destruirlos sin aviso ni posibilidad de reversión.

**Qué soluciona.** Elimina el riesgo de pérdida de datos, crea historial de esquema, hace los
entornos reproducibles y da visibilidad sobre consultas lentas (§7.7).

**Contrapartidas.** Añade un paso de trabajo: cada cambio de entidad requiere generar y revisar una
migración. Es exactamente el punto: obliga a mirar el SQL antes de ejecutarlo. La migración inicial
debe marcarse como aplicada en la base existente para que no intente recrear tablas (§14.1).

---

### 15.5 Filtración de errores internos y formato de respuesta (S-05, §5.5)

#### Código actual

`src/presentation/http/middlewares/errors/error-handler.middleware.ts`

```ts
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ message: error.message, errorCode: error.errorCode });
    return;
  }
  logger.error(`${error.stack || error.message}`);
  res.status(INTERNAL_SERVER_ERROR).json({
    message: 'Internal Server Error',
    errors: error.message,          // ← mensaje interno al cliente
  });
};
```

#### Problema

`error.message` de un error no controlado procede de `pg`/TypeORM e incluye nombres de tabla y
columna, texto de restricciones y fragmentos de SQL. Además, el error se serializa con plantilla de
string, perdiendo la estructura que pino podría aprovechar, y no hay forma de correlacionar el log
con el incidente que reportó el usuario.

#### Código propuesto

```ts
import { randomUUID } from 'crypto';

interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
    errorId?: string;
  };
}

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof AppError) {
    logger.warn(
      { statusCode: error.statusCode, code: error.errorCode, path: req.path },
      error.message,
    );
    const body: ApiErrorBody = {
      error: {
        code: error.errorCode ?? AppErrorCode.BAD_REQUEST,
        message: error.message,
      },
    };
    res.status(error.statusCode).json(body);
    return;
  }

  // Error no controlado: el detalle va al log, nunca al cliente
  const errorId = randomUUID();
  logger.error({ err: error, errorId, path: req.path, method: req.method }, 'Unhandled error');

  const body: ApiErrorBody = {
    error: {
      code: AppErrorCode.INTERNAL_SERVER_ERROR,
      message: 'Ha ocurrido un error interno. Contacta a soporte con el código de referencia.',
      errorId,
    },
  };
  res.status(INTERNAL_SERVER_ERROR).json(body);
};
```

#### Explicación

**Qué cambió.** El mensaje interno deja de enviarse al cliente y se sustituye por un `errorId`
correlacionable. El error se pasa a pino como objeto (`{ err: error }`), que lo serializa con stack
estructurado en lugar de aplanarlo a texto. Se añade contexto de la petición. `errorCode` siempre
está presente.

**Por qué.** El usuario necesita saber *que* algo falló y poder referenciarlo; el detalle técnico
pertenece al log. Un `errorId` da soporte accionable sin exponer la estructura interna.

**Qué soluciona.** Cierra S-05, unifica el formato de error y hace los logs consultables por campo
(`errorId`, `path`, `statusCode`) en lugar de por búsqueda de texto.

**Contrapartidas.** Cambio de contrato (`{ message, errors }` → `{ error: { code, message } }`).
Ver §14.4 y §14.5 para migrarlo sin cortar el frontend: introducir `errorCode` primero, cambiar la
envoltura después. Durante depuración en desarrollo puede convenir incluir el mensaje real,
condicionado a `nodeEnv === 'development'`.

---

### 15.6 `role_name` perdido al guardar y `birthday`/`birthdate` en el mapper (§3.9, T-01)

#### Código actual

`src/infrastructure/repositories/user.repository.ts:44-66`

```ts
private toDomain(entity: UserEntity): User {
  return new User(entity.id, entity.email, entity.password,
    entity.rol.name,     // ← undefined tras save(), donde rol solo tiene id
    entity.rol.id, entity.email_verified, entity.createdAt, entity.updatedAt);
}

private toTypeOrm(user: User): UserEntity {
  const entity = new UserEntity();
  // ...
  const rolEntity = new RolEntity();
  rolEntity.id = user.rol_id;      // ← solo el id; name queda sin poblar
  entity.rol = rolEntity;
  return entity;
}
```

`src/application/mappers/user.mapper.ts:22-27`

```ts
...(customer.birthdate && {
  birthdate: customer.birthdate instanceof Date
    ? customer.birthdate.toISOString().split('T')[0]
    : String(customer.birthdate).split('T')[0],
}),
```

#### Problema

Dos fallos que se combinan en la respuesta de `POST /signup`:

1. `save()` devuelve la entidad que se le pasó, cuyo `rol` solo tiene `id`. `toDomain` lee
   `entity.rol.name` → `undefined`, así que el `User` devuelto por el registro tiene
   `role_name: undefined` y la respuesta **omite el campo `rol`**.
2. El DTO declara `birthday?: Date` pero el mapper escribe `birthdate` con un string. TypeScript no
   lo detecta porque la propiedad entra por un *spread* condicional, que no está sujeto a la
   comprobación de propiedades excedentes (verificado: `tsc` no reporta error).

#### Código propuesto

```ts
// user.repository.ts — preservar el nombre del rol al mapear de vuelta
private toDomain(entity: UserEntity): User {
  if (!entity.rol) {
    throw new Error('[UserRepository] La relación "rol" no fue cargada');
  }
  return new User(
    entity.id, entity.email, entity.password,
    entity.rol.name, entity.rol.id,
    entity.email_verified, entity.createdAt, entity.updatedAt,
  );
}

async save(user: User): Promise<User> {
  const entity = this.toTypeOrm(user);
  const saved = await this.repository.save(entity);
  // save() no rehidrata la relación: se recupera con el nombre del rol poblado
  return this.findById(saved.id) as Promise<User>;
}
```

```ts
// user-reponse.dto.ts — el tipo debe describir lo que la API devuelve
export class UserResponseDto {
  id: string;
  email: string;
  rol: string;
  email_verified: boolean;
  customer?: {
    id: string;
    name: string;
    last_name: string;
    dni: string;
    phone: string;
    birthdate: string | null;      // ISO 'YYYY-MM-DD', no Date
  } | null;
}
```

```ts
// user.mapper.ts — asignación directa, sujeta a comprobación de tipos
if (customer) {
  response.customer = {
    id: customer.id,
    name: customer.name,
    last_name: customer.last_name,
    dni: customer.dni,
    phone: customer.phone,
    birthdate: customer.birthdate ? toIsoDateOnly(customer.birthdate) : null,
  };
}
```

#### Explicación

**Qué cambió.** `toDomain` falla explícitamente si la relación no está cargada, en lugar de producir
`undefined` en silencio. `save()` relee la entidad para devolver un `User` completo. El DTO declara
el nombre y el tipo reales (`birthdate: string | null`), y el mapper asigna directamente en lugar de
mediante spread condicional — con lo que el compilador **sí** verifica la asignación.

**Por qué.** El campo `rol` desaparecía de la respuesta de registro sin que nada lo señalara, y el
tipo `UserResponseDto` describía un contrato que la API no cumplía. Ambos son fallos silenciosos: el
peor tipo, porque dan falsa confianza.

**Qué soluciona.** `POST /signup` devuelve `rol`; el tipo del DTO deja de mentir; futuras
discrepancias entre mapper y DTO las detecta el compilador.

**Contrapartidas.** `save()` añade una consulta extra (`findById`). Alternativa sin coste: poblar
`rolEntity.name` en `toTypeOrm` a partir de `user.role_name`, pero eso asume que el `User` de entrada
lo trae correcto. La relectura es más segura y el registro no es un camino caliente. Y el cambio de
`birthday` a `birthdate` en el tipo es un cambio de contrato **solo nominal**: la API ya devolvía
`birthdate`; lo que cambia es que el tipo por fin lo refleja.

---

### 15.7 `JwtTokenService`: 6 parámetros posicionales que ya causaron una divergencia

#### Código actual

```ts
// jwt-token.service.ts
constructor(
  private readonly secret: string,
  private readonly expiresIn: string = '1d',
  private readonly temporaryTokenSecret?: string,
  private readonly temporaryTokenExpiration: number = 600,
  private readonly refreshTokenSecret?: string,
  private readonly refreshTokenExpiration?: string,
) {}
```

```ts
// auth.composition.ts:38 — completo
new JwtTokenService(
  envConfig.accessToken.secret, envConfig.accessToken.expiry,
  envConfig.temporaryToken.secret, envConfig.temporaryToken.expiration,
  envConfig.refreshToken.secret, envConfig.refreshToken.expiry,
);

// customer.composition.ts:41 — incompleto, con secreto por defecto
new JwtTokenService(
  process.env.ACCESS_TOKEN_SECRET || 'secret_key_sysburger',
  process.env.ACCESS_TOKEN_EXPIRY,
  process.env.TEMPORARY_TOKEN_SECRET,
  600,                                    // ← ignora TEMPORARY_TOKEN_EXPIRATION
);                                        // ← sin secreto de refresh
```

#### Problema

Seis parámetros posicionales con cuatro opcionales permiten construir un servicio **parcialmente
configurado sin ningún error de compilación**. Eso ya ocurrió: la instancia de `customer.composition`
no puede emitir refresh tokens, usa una expiración hardcodeada distinta de la configurada (causa
directa de la incoherencia de TTL de §3.7) y contiene un secreto por defecto hardcodeado (S-08).

#### Código propuesto

```ts
export interface JwtTokenServiceConfig {
  access:    { secret: string; expiresIn: string };
  refresh:   { secret: string; expiresIn: string };
  temporary: { secret: string; expiresInSeconds: number };
  issuer: string;
  audience: string;
}

export class JwtTokenService implements ITokenService {
  constructor(private readonly config: JwtTokenServiceConfig) {}

  generateAccessToken(userId: string, email: string): string {
    return jwt.sign({ userId, email }, this.config.access.secret, {
      expiresIn: this.config.access.expiresIn,
      issuer:    this.config.issuer,
      audience:  this.config.audience,
    } as SignOptions);
  }

  verifyAccessToken(token: string): TokenPayload {
    const decoded = jwt.verify(token, this.config.access.secret, {
      algorithms: ['HS256'],              // algoritmo fijado explícitamente
      issuer:     this.config.issuer,
      audience:   this.config.audience,
    }) as TokenPayload;
    return { userId: decoded.userId, email: decoded.email };
  }

  verifyVerificationSessionToken(token: string): VerificationSessionPayload {
    const decoded = jwt.verify(token, this.config.temporary.secret, {
      algorithms: ['HS256'],
      issuer:     this.config.issuer,
      audience:   this.config.audience,
    }) as VerificationSessionPayload;

    // El tipo del token se valida aquí, no en un middleware que puede olvidarse
    if (decoded.type !== 'email_verification') {
      throw new jwt.JsonWebTokenError('Tipo de token inválido');
    }
    return decoded;
  }
  // ...
}
```

Y una única construcción en el container compartido:

```ts
const tokenService = new JwtTokenService({
  access:    { secret: envConfig.accessToken.secret,  expiresIn: envConfig.accessToken.expiry },
  refresh:   { secret: envConfig.refreshToken.secret, expiresIn: envConfig.refreshToken.expiry },
  temporary: { secret: envConfig.temporaryToken.secret,
               expiresInSeconds: envConfig.temporaryToken.expiration },
  issuer:   'burgergo-api',
  audience: 'burgergo-client',
});
```

#### Explicación

**Qué cambió.** Un único objeto de configuración con todos los campos **obligatorios**; se elimina el
secreto por defecto; se fija `algorithms: ['HS256']`; se añaden `issuer`/`audience`; la validación de
`type` se mueve al propio servicio. Se elimina también la comprobación repetida
`if (!this.temporaryTokenSecret)`, ahora imposible por construcción.

**Por qué.** Convertir un error de configuración en un error de compilación. Con la firma anterior,
olvidar el secreto de refresh era legal; ahora no compila. El fallo de §3.7 y parte de S-08 tenían la
misma raíz: una API que permitía construir el objeto a medias.

**Qué soluciona.** Elimina la divergencia entre las dos instancias, la expiración hardcodeada, el
secreto por defecto y la falta de validación de `type` (que hoy solo existe en código muerto).

**Contrapartidas.** Cambio incompatible en el constructor: hay que actualizar las dos composiciones
(que es justamente lo que se quiere). Añadir `issuer`/`audience` **invalida todos los tokens
existentes**: los usuarios con sesión activa deberán volver a iniciarla. Conviene desplegarlo en una
ventana de baja actividad, o aceptar temporalmente tokens sin `issuer` durante un periodo de gracia
antes de exigirlo.

---
## 16. Arquitectura propuesta

### 16.1 Principio: evolución, no reescritura

La estructura actual **es correcta**. La propuesta siguiente conserva las cuatro capas y la
disciplina de dependencias existentes, y solo corrige lo que está mal ubicado o duplicado. No
propongo una estructura por *features* (vertical slices), ni CQRS, ni un contenedor de DI con
decoradores: para un proyecto de 3.500 líneas con un desarrollador serían sobreingeniería y
destruirían la claridad actual.

**Cambios respecto a la estructura de hoy (marcados con `←`):**

```
src/
├── domain/                                  ← sin cambios estructurales
│   ├── entities/
│   │   ├── user.entity.ts
│   │   ├── customer.entity.ts
│   │   ├── address.entity.ts
│   │   ├── email-verification.entity.ts
│   │   ├── rol.entity.ts
│   │   └── index.ts
│   ├── enums/
│   │   ├── house-type.enum.ts               ← ÚNICA declaración (hoy hay 4)
│   │   └── user-type.enum.ts                ← se empieza a usar de verdad
│   ├── errors/
│   │   ├── domain.error.ts                  ← NUEVO: base abstracta, sin HTTP
│   │   ├── not-found.error.ts               ← NUEVO
│   │   ├── conflict.error.ts                ← NUEVO
│   │   ├── forbidden.error.ts               ← NUEVO
│   │   ├── unauthorized.error.ts            ← NUEVO
│   │   ├── validation.error.ts
│   │   └── error-code.ts                    ← AppErrorCode, por fin usado
│   ├── interfaces/                            (puertos de servicios)
│   │   ├── token.interface.ts
│   │   ├── email.interface.ts
│   │   └── password-hasher.interface.ts
│   └── repository/                            (puertos de persistencia)
│       ├── *.repository.interface.ts           ← contratos homogéneos: todos `| null`
│       ├── unit-of-work.interface.ts
│       └── index.ts
│
├── application/
│   ├── use-cases/
│   │   ├── auth/
│   │   ├── customer/
│   │   └── address/                         ← sube un nivel (hoy: customer/address/)
│   ├── dtos/
│   │   ├── request/
│   │   └── response/
│   ├── mappers/
│   └── validators/
│
├── infrastructure/
│   ├── config/
│   │   ├── env.config.ts                    ← ÚNICO acceso a process.env del proyecto
│   │   └── index.ts
│   ├── database/typeorm/
│   │   ├── config/data-source.ts
│   │   ├── entities/
│   │   ├── migrations/                      ← NUEVO: hoy declarada pero vacía
│   │   └── unit-of-work.typeorm.ts
│   ├── repositories/
│   └── services/
│       ├── jwt-token.service.ts
│       ├── bcrypt-password-hasher.service.ts
│       └── nodemailer-email.service.ts
│
├── presentation/http/
│   ├── container.ts                         ← NUEVO: reemplaza los 3 composition/*.ts
│   ├── routes/
│   │   └── v1/                              ← NUEVO: versionado
│   ├── controllers/
│   ├── middlewares/
│   │   ├── auth/
│   │   ├── validation/
│   │   ├── errors/error-handler.middleware.ts  ← única traducción DomainError → HTTP
│   │   ├── rate-limit/                      ← NUEVO
│   │   └── catch-error.middleware.ts
│   └── config/cors.config.ts                ← lee de envConfig, no de process.env
│
├── shared/
│   ├── logger.ts
│   ├── templates/
│   └── utils/date.util.ts                   ← NUEVO: formateo de fechas, hoy duplicado ×2
│
├── app.ts
├── server.ts
└── index.ts

test/                                        ← NUEVO
├── unit/
├── integration/
└── e2e/
```

**Eliminados:** `presentation/http/config/cloudinary.config.ts` (muerto, §3.5),
`domain/enum/house-type.enum.ts` (duplicado con valores distintos),
`presentation/http/composition/` (absorbido por `container.ts`).

### 16.2 Los tres cambios que importan

Todo lo demás es reubicación cosmética. Estos tres tienen consecuencias reales:

#### 1. `container.ts` — una sola instancia de cada dependencia

Hoy: `UserRepository` ×2, `CustomerRepository` ×3, `JwtTokenService` ×2 **con configuración
divergente** (§3.4). El container elimina la clase entera de problema:

```ts
export const buildContainer = (dataSource: DataSource) => {
  // Repositorios: una instancia cada uno
  const userRepository     = new UserRepository(dataSource.getRepository(UserEntity));
  const customerRepository = new CustomerRepository(dataSource.getRepository(CustomerEntity));
  // ...

  // Servicios: una instancia, una configuración
  const tokenService = new JwtTokenService({ /* ver §15.7 */ });
  const passwordHasher = new BcryptPasswordHasher(envConfig.security.bcryptRounds);
  const emailService = new NodemailerEmailService(envConfig.mailer);

  // Casos de uso y controladores
  const loginUseCase = new LoginUseCase(userRepository, passwordHasher, tokenService);
  // ...

  return { authController, customerController, addressController, verifyAccessToken };
};
```

#### 2. Errores de dominio sin HTTP

`domain/errors/domain.error.ts` deja de conocer códigos HTTP. La traducción ocurre **una sola vez**,
en el borde:

```ts
const HTTP_STATUS_BY_ERROR = new Map<Function, HttpStatusCode>([
  [NotFoundError,     NOT_FOUND],
  [ConflictError,     CONFLICT],
  [ValidationError,   UNPROCESSABLE_CONTENT],
  [UnauthorizedError, UNAUTHORIZED],
  [ForbiddenError,    FORBIDDEN],
]);
```

Esto desacopla el dominio del protocolo y hace que los 7 códigos HTTP incorrectos de §5.3 se corrijan
en un único sitio.

#### 3. `envConfig` como frontera única

Ningún archivo fuera de `infrastructure/config/` puede leer `process.env`. Es una regla verificable
con una sola regla de ESLint (`no-restricted-properties`), y es lo que desbloquea la testabilidad de
los casos de uso (§10.2).

### 16.3 Cómo encaja el crecimiento previsto

Añadir el módulo de pedidos con esta estructura:

```
domain/entities/order.entity.ts, order-item.entity.ts
domain/repository/order.repository.interface.ts
application/use-cases/order/{create,cancel,list}-order.use-case.ts
application/dtos/request/create-order.dto.ts
infrastructure/database/typeorm/entities/order.typeorm-entity.ts
infrastructure/database/typeorm/migrations/17xxxx-CreateOrders.ts
infrastructure/repositories/order.repository.ts
presentation/http/controllers/order.controller.ts
presentation/http/routes/v1/order.routes.ts
+ 3 líneas en container.ts
+ 1 línea en app.ts
```

**Cero modificaciones** de código existente. Eso es la señal de que la arquitectura escala — y ya es
cierto hoy, salvo por el composition root.

### 16.4 Lo que deliberadamente NO propongo

| Propuesta descartada | Razón |
|---|---|
| Estructura por *features* / vertical slices | La estructura por capas ya funciona y el equipo la conoce. Migrar cuesta días y no resuelve ningún problema identificado. |
| Contenedor de DI (`tsyringe`, `inversify`) | La inyección manual es explícita, sin magia y perfectamente testeable. Un container añade un concepto nuevo para resolver un problema que `buildContainer()` resuelve en 40 líneas. |
| CQRS / Event Sourcing | Sobreingeniería flagrante a esta escala. |
| Microservicios | No hay ningún problema que los justifique. |
| GraphQL | El consumo actual es CRUD simple. |
| `Result<T, E>` en todos los casos de uso | Beneficio real, pero exige adopción disciplinada de todo el equipo. Con un desarrollador y sin tests, las excepciones tipadas dan el 80% del beneficio por el 20% del coste. |
| Monorepo | Un solo despliegue, un solo equipo. |

---

## 17. Deuda técnica

**Prioridades:** P0 = crítico (bloquea despliegue o expone datos) · P1 = importante (antes de
producción) · P2 = mejora · P3 = opcional

**Complejidad:** estimación de esfuerzo, no de dificultad conceptual.

### P0 — Crítico

| # | Problema | Impacto | Complejidad | Ref. |
|---|---|---|---|---|
| 1 | `tsconfig.json` inválido: `npm run build` falla | **Crítico** — no se puede desplegar | Trivial (5 min) | C-01 |
| 2 | Import a `src/utils` inexistente: no compila | **Crítico** — bloquea el build | Baja (15 min) | C-02 |
| 3 | Middleware de auth cuelga la petición sin responder | **Crítico** — disponibilidad | Baja (15 min) | C-03 |
| 4 | `synchronize: true` contra la base de datos | **Crítico** — pérdida de datos | Media (4 h) | S-01 |
| 5 | `PUT /address/:id` roto + control de acceso desde el body | **Alto** — funcionalidad + IDOR | Media (3 h) | C-04 / S-04 |
| 6 | Token de verificación no vinculado al presentado | **Alto** — enlaces revocados siguen sirviendo | Media (3 h) | S-02 |
| 7 | Sin rate limiting en ningún endpoint | **Alto** — fuerza bruta, bombardeo de correo | Media (3 h) | S-03 |

### P1 — Importante

| # | Problema | Impacto | Complejidad | Ref. |
|---|---|---|---|---|
| 8 | Cero tests | **Alto** — cada cambio es una apuesta | Alta (1–2 sem) | §10 |
| 9 | Mensajes de error internos enviados al cliente | Alto — divulgación de esquema | Baja (1 h) | S-05 |
| 10 | Contraseña máx. 12 en login / sin máx. al cambiarla → **bloqueo de cuenta** | Alto — bug funcional | Trivial (30 min) | S-13 |
| 11 | `.gitIgnore` con mayúscula: `.env` versionable en Linux | Alto — fuga de credenciales | Trivial (10 min) | S-12 |
| 12 | Refresh tokens irrevocables; sin logout | Alto — 7 días de acceso tras robo | Media (1–2 d) | S-06 |
| 13 | Sin `whitelist` en validación (mass assignment) | Medio — hueco latente | Trivial (30 min) | S-09 |
| 14 | Sin `helmet` ni cabeceras de seguridad; CORS sin `credentials` | Medio | Baja (2 h) | S-07 |
| 15 | TTL del token de verificación: 4 valores incoherentes (10 min real vs "24 h" en el correo) | Medio — abandono en el registro | Baja (1 h) | §3.7 |
| 16 | Sin índices en las 4 consultas más frecuentes | Medio — degradación progresiva | Baja (3 h) | §7.2 |
| 17 | `.env.example` cubre 10 de 20 variables; un clon no arranca | Medio — onboarding | Trivial (30 min) | §11.4 |
| 18 | `process.env` leído en 6 archivos, incluidos 2 casos de uso | Medio — intestables | Media (5 h) | §2.2 |
| 19 | Sin `/health`, sin 404, sin apagado ordenado | Medio — operación | Baja (3 h) | §5.9 |
| 20 | Operaciones multi-escritura sin transacción (direcciones, verificación) | Medio — inconsistencia | Media (4 h) | §7.4 |
| 21 | Composition root duplica instancias; `JwtTokenService` divergente | Medio — configuración incoherente | Media (5 h) | §3.4 |
| 22 | Sin CI | Medio — nada verifica los PR | Baja (3 h) | §11.5 |
| 23 | JWT sin `algorithms`/`issuer`/`audience`; `type` sin validar; secreto por defecto | Medio | Baja (3 h) | S-08 |
| 24 | `email_verification` crece sin purga | Medio — degradación a 12 meses | Baja (2 h) | §7.6 |

### P2 — Mejora

| # | Problema | Impacto | Complejidad | Ref. |
|---|---|---|---|---|
| 25 | 5 formatos de respuesta y 4 de error | Medio — fricción constante en frontend | Media (1–2 d) | §5.5, §9.1 |
| 26 | `AppErrorCode` nunca usado: cliente compara textos en español | Medio | Baja (3 h) | §9.2 |
| 27 | 7 códigos HTTP semánticamente incorrectos | Bajo-medio | Baja (2 h) | §5.3 |
| 28 | Sin versionado `/api/v1` | Medio a futuro | Trivial ahora | §5.8 |
| 29 | 19 elementos de código muerto | Bajo — ruido | Baja (3 h) | §3.5 |
| 30 | `HouseType` ×4 con valores divergentes | Medio — riesgo de datos inconsistentes | Baja (2 h) | §3.4 |
| 31 | DTOs de dirección duplicados | Bajo | Trivial | §3.4 |
| 32 | `role_name: undefined` tras `save()`; `birthday` vs `birthdate` | Bajo-medio — el tipo miente | Baja (2 h) | §3.9, T-01 |
| 33 | Restricciones de integridad ausentes (`NOT NULL`, enum, único parcial) | Medio | Media (4 h) | §7.1 |
| 34 | Nombres inconsistentes (`user-case`, `passwordHasherd`, `isMatchPassword`) | Bajo | Baja (2 h) | §3.2 |
| 35 | README describe funcionalidad inexistente (OTP, username, empleados) | Medio — desinforma | Baja (2 h) | §11.3 |
| 36 | Mezcla snake_case/camelCase en el esquema | Bajo ahora, alto con 30 tablas | Media | §11.2 |
| 37 | `docker-compose.yaml` vacío | Bajo — onboarding | Baja (1 h) | §11.4 |
| 38 | `morgan` + `pino` en paralelo, sin `request-id` | Bajo-medio — depuración | Baja (2 h) | §5.11 |
| 39 | Envío de correo síncrono dentro de la petición | Bajo-medio — latencia | Media | §8.2 |
| 40 | Inyección de HTML en plantillas de correo | Bajo | Baja (1 h) | S-11 |
| 41 | Enumeración de usuarios en 3 endpoints | Bajo-medio | Baja (2 h) | S-10 |
| 42 | `noUnusedLocals: false`; hook no bloquea warnings | Bajo — habría detectado C-04 | Trivial | T-04 |

### P3 — Opcional

| # | Problema | Impacto | Complejidad | Ref. |
|---|---|---|---|---|
| 43 | `bcryptjs` (JS puro) en vez de `bcrypt` nativo | Bajo | Baja | §8.2 |
| 44 | Sin OpenAPI generado | Bajo | Media | §11.3 |
| 45 | Validaciones del registro secuenciales (paralelizables) | Muy bajo | Trivial | §8.2 |
| 46 | Sin métricas ni trazas | Bajo | Media | §5.11 |
| 47 | Sin idempotencia en operaciones de escritura | Bajo hoy, **alto con pedidos** | Media | §5.7 |
| 48 | Sin caché | Nulo hoy | — | §8.2 |
| 49 | Codificación corrupta en comentarios | Cosmético | Trivial | §3.2 |

**Total: 49 elementos** — 7 P0, 17 P1, 18 P2, 7 P3.

---

## 18. Resumen ejecutivo

### 18.1 Estado actual

| Dimensión | Nota | Justificación |
|---|---|---|
| **Arquitectura** | **7/10** | Clean Architecture aplicada con disciplina real: el dominio no importa infraestructura, los repositorios están invertidos, las entidades de dominio están separadas de las de TypeORM. Es un trabajo notablemente por encima de lo habitual en proyectos de este tamaño. Resta por duplicación en el composition root, `AppError` con HTTP en el dominio y UoW aplicado solo en un flujo. |
| **Código** | **5/10** | Funciones pequeñas, complejidad baja, buena granularidad, casi sin `any` (5 en 3.550 líneas). Pero **el proyecto no compila**, un endpoint está completamente roto, hay 19 elementos de código muerto y duplicaciones que ya han causado divergencias de configuración. |
| **Seguridad** | **3/10** | Buenos fundamentos (bcrypt con salt, cookie httpOnly+sameSite, access token corto, sin SQL injection, sin secretos en el repositorio). Pero cuatro problemas P0 abiertos: `synchronize: true`, ausencia total de rate limiting, token de verificación no vinculado, y control de acceso derivado del body. |
| **Performance** | **6/10** | Sin N+1 (mérito real, es el error más común con ORM), sin algoritmos costosos, sin bloqueos del event loop. Penaliza la ausencia total de índices, `email_verification` sin purga, sin pool configurado y correo síncrono en la petición. |
| **Testing** | **1/10** | Cero tests. `npm test` devuelve error. Sin framework instalado. El único punto por encima de 0 es que la arquitectura **ya está preparada** para testear: la inyección por constructor hace que la suite unitaria sea barata de escribir. |
| **Escalabilidad** | **5/10** | La estructura escala sin modificar código existente. Frena: composition root duplicado, sin migraciones, sin transacciones generalizadas, sin versionado de API, sin paginación (aún no necesaria). |
| **Mantenibilidad** | **6/10** | Carpetas claras, archivos pequeños, ESLint/Prettier/Husky configurados, mensajes de error cuidados. Penaliza: sin tests, README que describe un sistema que no existe, `.env.example` incompleto que impide arrancar un clon, y convenciones aplicadas de forma desigual. |
| **Media ponderada** | **4.7/10** | Un proyecto con **arquitectura de 7 y ejecución de 4**. |

### 18.2 Top 10 problemas

1. **El proyecto no compila.** `tsconfig.json` inválido + import a `src/utils` (eliminado hace 3 commits). `npm run build` falla → **no se puede desplegar**.
2. **`synchronize: true` contra la base de datos**, sin ninguna migración. Un despliegue rutinario con un cambio de entidad puede destruir datos sin aviso ni reversión.
3. **`PUT /api/address/:addressId` está roto y deriva la autorización del body.** Siempre devuelve 404, ignora `req.user.id` y `:addressId`. Corregir solo el 404 sin corregir el diseño **activa un IDOR**.
4. **El middleware de autenticación puede colgar la petición.** Un `catch` sin rama final: ante un error no-JWT no responde ni llama a `next()`. Sockets retenidos, sin log.
5. **Ausencia total de rate limiting.** Fuerza bruta ilimitada en `/signin` y bombardeo de correo vía `/resend-code` (el cooldown es por usuario, no por IP).
6. **El token de verificación de email no se valida contra el presentado.** Se comprueba que exista *alguna* fila activa del usuario, así que un enlace "invalidado" sigue funcionando. `findActiveByToken()` existe y no se usa.
7. **Cero tests.** Es la causa raíz de que los puntos 1, 3 y 4 hayan llegado a `develop` sin detectarse.
8. **Se filtran mensajes de error internos al cliente** (`errors: error.message`, y un literal *"Error en desarrollo:"* en producción), exponiendo estructura de base de datos.
9. **Bug de bloqueo de cuenta por política de contraseñas:** cambiarla a más de 12 caracteres es válido, pero el DTO de login rechaza esa longitud → el usuario no puede volver a entrar.
10. **Refresh tokens irrevocables y sin logout.** Un token robado concede 7 días de acceso que la víctima no puede cortar de ninguna forma.

### 18.3 Top 10 mejoras a realizar primero

Ordenadas por **beneficio / riesgo**, no por severidad:

1. **Eliminar `ignoreDeprecations` de `tsconfig.json`** — 5 minutos, desbloquea el build. Sin esto, nada más es verificable.
2. **Corregir el import de `verification-session-token.middleware.ts`** — 15 minutos, segundo bloqueante.
3. **`return next(error)` en el `catch` del middleware de auth** — 15 minutos, elimina el cuelgue de peticiones.
4. **`git mv .gitIgnore .gitignore`** — 10 minutos, evita una fuga de credenciales en cualquier máquina Linux.
5. **Unificar la política de contraseñas** (`MinLength(8)` + `MaxLength(72)` en los 3 DTOs) — 30 minutos, elimina el bloqueo de cuentas.
6. **`whitelist: true` + `forbidNonWhitelisted` y quitar `rol_id` del DTO de registro** — 30 minutos, cierra una clase entera de vulnerabilidad futura.
7. **Rate limiting con `express-rate-limit`** — 3 horas, cierra el riesgo de seguridad de mayor exposición.
8. **`synchronize: false` + migración inicial** — 4 horas, elimina el riesgo de pérdida de datos. Requiere volcado previo (§14.1).
9. **Reparar `PUT /address/:id` con la firma `(userId, addressId, dto)`** — 3 horas, repara funcionalidad y cierra el IDOR de forma definitiva.
10. **Vitest + tests de regresión de los cuatro bloqueantes** — 1 día, y a partir de ahí toda corrección queda protegida.

Los seis primeros suman **menos de dos horas** y resuelven dos bloqueantes de despliegue, un problema
de disponibilidad, un bug funcional y dos riesgos de seguridad. Es el mejor retorno disponible.

### 18.4 Riesgos técnicos principales

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| **Pérdida de datos por `synchronize: true`** | Alta si se sigue desarrollando | Crítico e irreversible | P0-4, con volcado previo |
| **No se puede desplegar** (build roto) | **Ya materializado** | Crítico | P0-1, P0-2 |
| **Regresión al refactorizar sin tests** | Muy alta | Alto | Tests de regresión antes de cada corrección |
| **Reactivar el IDOR al "arreglar" el 404** | Alta si se corrige superficialmente | Alto | Corregir la firma del caso de uso, no solo el parsing |
| **Fuga de credenciales por `.gitIgnore`** | Media (al primer clon en Linux o CI) | Crítico | P1-11 + `gitleaks` en pre-commit |
| **Agotamiento por fuerza bruta / coste de correo** | Media | Alto | Rate limiting |
| **Degradación de base de datos** por falta de índices y tabla sin purga | Alta a 12 meses | Medio | Índices + purga programada |
| **Bus factor = 1** | Alta | Alto | Documentación correcta + tests como especificación ejecutable |
| **Deriva de la documentación** | **Ya materializada** (README) | Medio | OpenAPI generado desde el código |
| **Coste de infraestructura por conexiones sin límite** | Baja | Medio | Configurar el pool |

### 18.5 Recomendación

**Refactorización parcial dirigida. No reescribir, no migrar de arquitectura.**

**Justificación:**

La distinción clave de este análisis es que **la arquitectura y la ejecución están en niveles muy
distintos**. La arquitectura merece un 7: la separación por capas es real, la inversión de
dependencias es genuina (verificada archivo por archivo), las entidades de dominio contienen
invariantes en lugar de ser anémicas, el Unit of Work está correctamente implementado y no hay un
solo N+1 ni una sola consulta SQL construida por concatenación. Eso representa decisiones de diseño
acertadas y trabajo sostenido.

Los problemas graves **no son arquitectónicos**: son defectos localizados y de bajo coste de
corrección. Dos bloqueantes de build se arreglan en 20 minutos. El endpoint roto es un archivo. El
cuelgue del middleware es una línea. `synchronize: true` es una línea más una migración generada.
Ninguno de los 49 elementos de deuda técnica requiere rediseñar nada.

**Reescribir sería un error.** Destruiría una base correcta para reconstruir los mismos conceptos, y
—sin tests— con alta probabilidad de reintroducir los mismos bugs. **Migrar de arquitectura** (a
vertical slices, a microservicios, a NestJS) tampoco resolvería ninguno de los diez problemas
principales: todos ellos existirían igual en cualquier otra estructura.

**Lo que sí es un problema estructural** es la ausencia total de tests. No es deuda de código: es la
razón por la que un endpoint completamente roto, dos errores de compilación y un middleware que
cuelga peticiones han podido convivir en la rama `develop`. Cualquier plan que no empiece por ahí
repetirá el patrón.

**Plan recomendado:**

1. **Días 1–2 (Fase 1 rápida).** Los seis cambios de menos de 30 minutos: build, middleware,
   `.gitignore`, política de contraseñas, `whitelist`. Elimina dos bloqueantes de despliegue y tres
   riesgos, con riesgo de regresión prácticamente nulo.
2. **Semana 1 (Fase 1 completa).** Vitest + tests de regresión, rate limiting, migraciones,
   corrección del endpoint de direcciones y del token de verificación. Al terminar, el proyecto es
   desplegable y no tiene P0 abiertos.
3. **Semanas 2–5 (Fase 2).** Suite de tests, centralización de la configuración, container único,
   jerarquía de errores, índices, revocación de refresh tokens y CI. Al terminar, el proyecto está
   listo para producción.
4. **Después.** Fase 3 (limpieza) y solo entonces continuar con productos y pedidos.

**Recomendación adicional sobre el orden del roadmap:** no añadiría el módulo de pedidos antes de
completar la Fase 2. Pedidos y pagos exigen transacciones, idempotencia y control de acceso
robusto — precisamente las tres áreas con deuda abierta hoy. Construir sobre ellas multiplicaría el
coste de corregirlas.

**Adelantar dos elementos de fases posteriores:** el versionado `/api/v1` (§5.8) y el `Idempotency-Key`
(§5.7). Ambos cuestan casi nada ahora y son caros de retrofitar. El versionado además es
prerrequisito práctico para unificar el formato de respuestas sin romper el frontend (§14.4).

---

## Anexo — Reconocimiento de lo que está bien hecho

Este análisis identifica 49 elementos de deuda técnica, y conviene contrapesarlo. Lo siguiente está
resuelto correctamente y **no debe tocarse** durante la refactorización:

- **Separación de capas con dependencias hacia el dominio**, verificada archivo por archivo. `domain/` no importa nada de fuera.
- **Entidades de dominio separadas de las entidades TypeORM**, con mappers explícitos. Es la parte más costosa de Clean Architecture y está bien ejecutada.
- **Modelo de dominio rico**: `User` y `Customer` contienen invariantes reales (email, DNI, teléfono, `canLogin()`, `updateProfile()`), no son estructuras vacías.
- **`TypeOrmUnitOfWork`** correctamente implementado: `QueryRunner` por operación vía factory, `rollback` protegido, `release()` en `finally`.
- **Orden del registro transaccional**: validaciones y hash fuera de la transacción, escrituras dentro, envío de correo después del commit. Es exactamente el orden correcto, y el comentario que lo explica es del tipo que vale la pena conservar.
- **Sin N+1 y sin SQL concatenado.** Todas las relaciones se cargan con `relations`, todas las consultas van parametrizadas.
- **Almacenamiento de contraseñas correcto**: bcrypt con salt por contraseña, `@Exclude()` en la columna, y ningún camino que devuelva el hash al cliente.
- **Estrategia de tokens bien elegida**: access corto en cabecera, refresh largo en cookie `httpOnly` + `sameSite: strict` + `secure` en producción.
- **`HttpStatusCode` como constantes + union type** en lugar de enum: la mejor decisión de tipado del proyecto.
- **Configuración de TypeScript estricta** (`strict`, `exactOptionalPropertyTypes`, `noImplicitOverride`), y solo 5 `any` en 3.550 líneas.
- **Logs sin datos sensibles**: revisados todos los `logger.*`; no se registran contraseñas ni tokens.
- **Granularidad de archivos**: promedio de ~40 líneas, ninguna clase-dios, ninguna función de 500 líneas.
- **Herramientas de calidad ya montadas**: ESLint 9 flat config, Prettier, Husky, lint-staged.
- **Mensajes de usuario consistentes**, en español y descriptivos.
- **Ausencia de sobreingeniería**: sin paginación prematura, sin caché innecesaria, sin abstracciones especulativas. El código hace lo que necesita hacer.

La conclusión operativa es directa: **este es un proyecto bien diseñado con la ejecución incompleta,
no un proyecto mal diseñado.** La distancia hasta "listo para producción" se mide en semanas de
correcciones dirigidas, no en meses de reescritura.
