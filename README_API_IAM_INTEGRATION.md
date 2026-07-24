# 🚀 Guía de Integración Backend API IAM (`http://localhost:8080`) para Frontend

Este documento contiene la guía completa de integración frontend para la API de **Gestión de Identidad y Accesos (IAM)**, disponible en Swagger UI en:
👉 **`http://localhost:8080/swagger-ui/index.html`**

---

## 🛠️ 1. Configuración Base

* **URL Base Backend**: `http://localhost:8080`
* **Formato Predeterminado**: `application/json`
* **Seguridad / Cifrado**: Ciertos campos críticos en peticiones de login/registro se envían cifrados con RSA. (Verificar la configuración de `ENCRYPTION_PRIVATE_KEY` en `env.front.js`).

### Cabeceras HTTP Estándar (Headers)

Para endpoints **públicos** (Login, Registro, Recuperación):
```http
Content-Type: application/json
Accept: application/json
```

Para endpoints **privados** (Actualizar contraseña o datos del usuario validado, Logout):
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
Accept: application/json
```

---

## 📋 2. Módulos y Endpoints Principales

---

### 1. Autenticación y Sesión (`/api_iam/auth`)

#### 1.1 Iniciar Sesión (Login)
* **Método**: `POST`
* **URL**: `/api_iam/auth/login`
* **Acceso**: Público
* **Body (`application/json`)**:
  ```json
  {
    "username": "20512345678",
    "password": "<contraseña cifrada con llave pública o en texto claro según conf.>",
    "captchaToken": "<token de recaptcha>"
  }
  ```
* **Respuesta Esperada (200 OK)**:
  Devuelve el `accessToken`, `refreshToken`, y la información básica del usuario logueado. También puede setear las cookies `access_token` y `refresh_token` como `HttpOnly`.

#### 1.2 Refrescar Token
* **Método**: `POST`
* **URL**: `/api_iam/auth/refresh`
* **Acceso**: Público (requiere enviar el Refresh Token válido, usualmente a través de cookies).

#### 1.3 Cerrar Sesión (Logout)
* **Método**: `POST`
* **URL**: `/api_iam/auth/logout`
* **Acceso**: Privado (`Bearer Token`)
* **Descripción**: Invalida el token JWT actual y limpia las cookies de sesión en el backend.

---

### 2. Registro de Nuevos Transportistas (`/api_iam/registro`)

#### 2.1 Validar RUC e Iniciar Registro
* **Método**: `POST`
* **URL**: `/api_iam/registro/validar-ruc`
* **Acceso**: Público
* **Descripción**: Consulta a SUNAT/ATU si el RUC es válido para registrarse. Devuelve los datos de la empresa en caso afirmativo.

#### 2.2 Solicitar Envío de Código OTP (Correo / SMS)
* **Método**: `POST`
* **URL**: `/api_iam/registro/otp/enviar`
* **Acceso**: Público
* **Body**: `{"ruc": "...", "correo": "..."}`

#### 2.3 Verificar OTP y Crear Cuenta
* **Método**: `POST`
* **URL**: `/api_iam/registro/otp/verificar`
* **Acceso**: Público
* **Body**: Contiene el código OTP ingresado por el usuario, junto con los datos para finalizar la creación del usuario (contraseña nueva).

---

### 3. Recuperación de Contraseña (`/api_iam/recuperacion`)

#### 3.1 Solicitar Envío de Código OTP
* **Método**: `POST`
* **URL**: `/api_iam/recuperacion/enviar-otp`
* **Acceso**: Público
* **Body**: `{"ruc": "20512345678"}`

#### 3.2 Verificar Código OTP
* **Método**: `POST`
* **URL**: `/api_iam/recuperacion/verificar-otp`
* **Acceso**: Público
* **Body**: `{"ruc": "20512345678", "codigoOtp": "123456"}`
* **Respuesta Esperada**: Devuelve un "Token Temporal de Recuperación" necesario para el siguiente paso.

#### 3.3 Actualizar / Restablecer Clave
* **Método**: `POST`
* **URL**: `/api_iam/recuperacion/actualizar-clave`
* **Acceso**: Público (pero requiere el `tokenTemporal` devuelto en el paso 3.2).
* **Body**: `{"tokenTemporal": "...", "nuevaClave": "..."}`

---

### 4. Gestión del Usuario (`/api_iam/usuario`)

*Estos endpoints requieren estar autenticado (Bearer Token o Cookie).*

#### 4.1 Cambiar Contraseña desde el Perfil
* **Método**: `PUT`
* **URL**: `/api_iam/usuario/actualizar/contrasena`
* **Body**: `{"claveActual": "...", "claveNueva": "..."}`

#### 4.2 Actualizar Datos de Contacto
* **Método**: `PUT`
* **URL**: `/api_iam/usuario/actualizar/contacto`
* **Body**: `{"correo": "...", "celular": "..."}`

---

### 5. Catálogos IAM (`/api_iam/catalogo`)

#### 5.1 Obtener Tipos de Persona (Natural / Jurídica)
* **Método**: `GET`
* **URL**: `/api_iam/catalogo/tipo-persona`
* **Acceso**: Público

---

## 💻 3. Ejemplos de Implementación en Angular (`HttpClient`)

### Ejemplo 1: Flujo de Autenticación (Login)

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private baseUrl = 'http://localhost:8080/api_iam/auth';

  constructor(private http: HttpClient) {}

  login(credentials: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/login`, credentials);
  }

  logout(): Observable<any> {
    // Recuerda que esto debe llevar el Bearer Token en los headers 
    // (automático si usas un HttpInterceptor)
    return this.http.post(`${this.baseUrl}/logout`, {});
  }
}
```

---

## ⚠️ 4. Respuestas HTTP y Manejo de Errores

* **`200 OK`**: Petición procesada correctamente.
* **`400 Bad Request`**: Datos inválidos, credenciales incorrectas (login) o código OTP erróneo.
* **`401 Unauthorized`**: Token JWT ausente, expirado o inválido. (Requerido renovar con `/auth/refresh`).
* **`429 Too Many Requests`**: Límite excedido de intentos de envío de código OTP.
* **`500 Internal Server Error`**: Error interno en el backend de identidades.
