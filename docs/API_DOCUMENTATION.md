# 📋 BurgerGo API — Documentación de Endpoints Implementados

> **Base URL:** `http://localhost:3000/api`  
> **Autenticación:** Bearer Token (JWT) en el header `Authorization`  
> **Formato:** JSON  

---

## 🔐 Auth — `/api/auth`

### 1. Iniciar Sesión
```
POST /api/auth/signin
```
**Autenticación requerida:** ❌ No  
**Body:**
```json
{
  "email": "usuario@correo.com",     // Requerido si no se envía username
  "username": "usuarioEjemplo",      // Requerido si no se envía email
  "password": "Password1"            // Requerido. 8-12 chars, 1 mayúscula, 1 minúscula, 1 número
}
```
**Respuesta exitosa `200`:**
```json
{
  "message": "Bienvenido a BurgerGO",
  "user": {
    "id": "uuid",
    "email": "usuario@correo.com",
    "rol": "customer",
    "email_verified": true
  },
  "access_token": "eyJhbGci..."
}
```

---

### 2. Verificar Cuenta (Magic Link)
```
POST /api/auth/verify-account
```
**Autenticación requerida:** ❌ No  
**Body:**
```json
{
  "token": "eyJhbGci..."   // JWT de verificación enviado al correo
}
```
**Respuesta exitosa `200`:**
```json
{
  "message": "Cuenta verificada correctamente. Ahora puedes acceder a la plataforma.",
  "user": {
    "id": "uuid",
    "email": "usuario@correo.com",
    "rol": "customer",
    "email_verified": true
  },
  "access_token": "eyJhbGci..."
}
```

---

### 3. Reenviar Código de Verificación
```
POST /api/auth/resend-code
```
**Autenticación requerida:** ❌ No  
**Body:**
```json
{
  "email": "usuario@correo.com"   // Requerido. Debe ser un email válido
}
```
**Respuesta exitosa `200`:**
```json
{
  "message": "Un nuevo enlace de verificación ha sido enviado a tu correo.",
  "data": { ... }
}
```

---

## 👤 Cliente — `/api/customer`

### 4. Registrar Cliente
```
POST /api/customer/signup
```
**Autenticación requerida:** ❌ No  
**Body:**
```json
{
  "name": "Juan",             // Requerido. 2-100 chars
  "last_name": "Pérez",       // Requerido. 2-100 chars
  "phone": "987654321",       // Requerido. 7-15 chars
  "dni": "12345678",          // Requerido. Exactamente 8 dígitos
  "email": "juan@correo.com", // Requerido. Formato email válido
  "password": "Password1",    // Requerido. 8-12 chars
  "rol_id": "uuid"            // Opcional. UUID del rol
}
```
**Respuesta exitosa `201`:**
```json
{
  "message": "Usuario registrado correctamente. Revisa tu correo para verificar tu cuenta.",
  "data": {
    "user": {
      "id": "uuid",
      "email": "juan@correo.com",
      "rol": "customer",
      "email_verified": false
    }
  }
}
```

---

### 5. Obtener Perfil del Cliente
```
GET /api/customer/profile
```
**Autenticación requerida:** ✅ Sí (Bearer Token)  
**Body:** No aplica  
**Respuesta exitosa `200`:**
```json
{
  "id": "uuid",
  "email": "juan@correo.com",
  "rol": "customer",
  "email_verified": true,
  "customer": {
    "id": "uuid",
    "name": "Juan",
    "last_name": "Pérez",
    "dni": "12345678",
    "phone": "987654321",
    "birthdate": "1995-06-15"   // Puede ser null si no fue completado
  }
}
```

---

### 6. Actualizar Perfil del Cliente
```
PATCH /api/customer/profile
```
**Autenticación requerida:** ✅ Sí (Bearer Token)  
**Body:**
```json
{
  "name": "Juan",           // Requerido. Solo letras, 2-100 chars
  "last_name": "Pérez",     // Requerido. 2-100 chars
  "phone": "987654321",     // Requerido. Exactamente 9 dígitos numéricos
  "dni": "12345678",        // Requerido. Exactamente 8 dígitos numéricos
  "birthdate": "1995-06-15" // Opcional. Formato YYYY-MM-DD
}
```
**Respuesta exitosa `200`:**
```json
{
  "message": "Perfil de cliente actualizado correctamente",
  "customer": {
    "id": "uuid",
    "name": "Juan",
    "last_name": "Pérez",
    "phone": "987654321",
    "dni": "12345678",
    "birthdate": "1995-06-15"
  }
}
```

---

### 7. Cambiar Contraseña
```
PATCH /api/customer/change-password
```
**Autenticación requerida:** ✅ Sí (Bearer Token)  
**Body:**
```json
{
  "currentPassword": "Password1",      // Requerido. Mín 8 chars, 1 mayúscula, 1 minúscula, 1 número
  "newPassword": "NewPassword2",       // Requerido. Mismo formato
  "confirmedPassword": "NewPassword2"  // Requerido. Mismo formato
}
```
**Respuesta exitosa `200`:**
```json
{
  "message": "La contraseña se cambio exitosamente"
}
```

---

## 📍 Direcciones — `/api/address`

### 8. Listar Direcciones del Cliente
```
GET /api/address
```
**Autenticación requerida:** ✅ Sí (Bearer Token)  
**Body:** No aplica  
**Respuesta exitosa `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "houseType": "casa",
      "department": "Lima",
      "province": "Lima",
      "district": "Miraflores",
      "address": "Av. Larco 123",
      "apartmentNumber": "402",
      "reference": "Frente al parque",
      "isDefault": true
    }
  ]
}
```

---

### 9. Crear Dirección
```
POST /api/address
```
**Autenticación requerida:** ✅ Sí (Bearer Token)  
**Body:**
```json
{
  "houseType": "casa",           // Requerido. Enum: "casa" | "trabajo" | "pareja" | "other"
  "department": "Lima",          // Requerido
  "province": "Lima",            // Requerido
  "district": "Miraflores",      // Requerido
  "address": "Av. Larco 123",    // Requerido. Máx 250 chars
  "apartmentNumber": "402",      // Opcional. Máx 50 chars
  "reference": "Frente al parque", // Opcional. Máx 250 chars
  "isDefault": false             // Opcional. Boolean
}
```
**Respuesta exitosa `201`:**
```json
{
  "data": { ... },
  "message": "Dirección creada exitosamente"
}
```

---

### 10. Actualizar Dirección
```
PUT /api/address/:addressId
```
**Autenticación requerida:** ✅ Sí (Bearer Token)  
**Params:** `addressId` — UUID de la dirección a actualizar  
**Body:**
```json
{
  "address": {
    "houseType": "trabajo",
    "department": "Lima",
    "province": "Lima",
    "district": "San Isidro",
    "address": "Av. El Derby 254",
    "apartmentNumber": null,
    "reference": "Torre Camino Real",
    "isDefault": false
  }
}
```
**Respuesta exitosa `200`:**
```json
{
  "message": "Dirección actualizada correctamente",
  "data": { ... }
}
```

---

### 11. Eliminar Dirección
```
DELETE /api/address/:addressId
```
**Autenticación requerida:** ✅ Sí (Bearer Token)  
**Params:** `addressId` — UUID de la dirección a eliminar  
**Body:** No aplica  
**Respuesta exitosa `200`:**
```json
{
  "message": "Dirección eliminada correctamente",
  "deleteId": "uuid"
}
```

---

### 12. Establecer Dirección Predeterminada
```
PATCH /api/address/:addressId
```
**Autenticación requerida:** ✅ Sí (Bearer Token)  
**Params:** `addressId` — UUID de la dirección que será la predeterminada  
**Body:** No aplica  
**Respuesta exitosa `200`:**
```json
{
  "message": "La dirección predeterminada ha sido cambiada."
}
```

---

## 📊 Resumen General

| # | Método | Endpoint | Auth | Descripción |
|---|--------|----------|------|-------------|
| 1 | `POST` | `/api/auth/signin` | ❌ | Login con email o username |
| 2 | `POST` | `/api/auth/verify-account` | ❌ | Verificar cuenta con token |
| 3 | `POST` | `/api/auth/resend-code` | ❌ | Reenviar email de verificación |
| 4 | `POST` | `/api/customer/signup` | ❌ | Registrar nuevo cliente |
| 5 | `GET` | `/api/customer/profile` | ✅ | Ver perfil del cliente autenticado |
| 6 | `PATCH` | `/api/customer/profile` | ✅ | Actualizar datos del perfil |
| 7 | `PATCH` | `/api/customer/change-password` | ✅ | Cambiar contraseña |
| 8 | `GET` | `/api/address` | ✅ | Listar todas las direcciones |
| 9 | `POST` | `/api/address` | ✅ | Crear nueva dirección |
| 10 | `PUT` | `/api/address/:id` | ✅ | Actualizar dirección existente |
| 11 | `DELETE` | `/api/address/:id` | ✅ | Eliminar dirección |
| 12 | `PATCH` | `/api/address/:id` | ✅ | Establecer dirección predeterminada |

---

## 🔮 Endpoints Pendientes (Roadmap)

| Módulo | Endpoint Sugerido | Descripción |
|--------|-------------------|-------------|
| Productos | `GET /api/products` | Listar catálogo de hamburguesas |
| Productos | `GET /api/products/:id` | Detalle de un producto |
| Categorías | `GET /api/categories` | Listar categorías del menú |
| Pedidos | `POST /api/orders` | Crear un nuevo pedido (checkout) |
| Pedidos | `GET /api/orders` | Historial de pedidos del cliente |
| Pedidos | `GET /api/orders/:id` | Detalle de un pedido específico |
| Auth | `POST /api/auth/forgot-password` | Solicitar recuperación de contraseña |
| Auth | `POST /api/auth/reset-password` | Restablecer contraseña con token |
