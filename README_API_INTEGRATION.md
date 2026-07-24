# 🚀 Guía de Integración Backend API Comprobantes (`http://localhost:8083`) para Frontend

Este documento contiene la guía completa de integración frontend para la API de **Comprobantes y Transportistas**, disponible en Swagger UI en:
👉 **`http://localhost:8083/swagger-ui/index.html`**

---

## 🛠️ 1. Configuración Base

* **URL Base Backend**: `http://localhost:8083`
* **Formato Predeterminado**: `application/json`
* **Autenticación**: `Bearer <token_jwt>` (se requiere en todos los endpoints privados).

### Cabeceras HTTP Estándar (Headers)

```http
Authorization: Bearer <JWT_TOKEN_OBTENIDO_DE_IAM>
Content-Type: application/json
Accept: application/json
```

> **Nota para Angular**: Se recomienda configurar un `HttpInterceptor` que agregue automáticamente el encabezado `Authorization: Bearer ...` a todas las peticiones dirigidas a `http://localhost:8083`.

---

## 📋 2. Módulos y Endpoints Principales

---

### 1. Comprobantes de Combustible (`/api_comprobante/comprobantes`)

#### 1.1 Listar Comprobantes (Paginado / Filtrado)
* **Método**: `GET`
* **URL**: `/api_comprobante/comprobantes`
* **Query Parameters**:
  * `ruc` (**Requerido**, `string`): RUC del transportista (ej. `20412345670`).
  * `placa` (opcional, `string`): Filtrar por placa vehicular.
  * `estado` (opcional, `string`): `CONFORME`, `OBSERVADO`, `INHABILITADO`, `PENDIENTE`.
  * `busqueda` (opcional, `string`): Filtro general (serie, número, grifo).

#### 1.2 Registrar Comprobante Forma A - Surtido Directo (`multipart/form-data`)
* **Método**: `POST`
* **URL**: `/api_comprobante/comprobantes?ruc={ruc}`
* **Header Especial**: `Content-Type: multipart/form-data`
* **Form Data**:
  * `request` (`string` en formato JSON):
    ```json
    {
      "serie": "F001",
      "numero": "0001234",
      "fechaEmision": "2026-07-15",
      "mes": "Julio",
      "anio": 2026,
      "rucDistribuidor": "20512345678",
      "distribuidorRazonSocial": "GRIFO REPSOL S.A.",
      "distribuidorDireccion": "Av. Separadora Industrial 1450",
      "distribuidorDepartamento": "Lima",
      "distribuidorProvincia": "Lima",
      "distribuidorDistrito": "Villa El Salvador",
      "tipoCombustibleCodigo": "B5",
      "azufrePpm": 45.0,
      "galones": 320.5,
      "costo": 1602.5,
      "placas": [
        { "vehiculoUuid": "550e8400-e29b-41d4-a716-446655440001", "galonesAsignados": 320.5 }
      ]
    }
    ```
  * `archivo` (`Blob` / `File`): Documento adjunto (PDF o imagen de la factura).

#### 1.3 Registrar Comprobante Forma B - Consumidor Directo / Granel (`multipart/form-data`)
* **Método**: `POST`
* **URL**: `/api_comprobante/comprobantes/granel?ruc={ruc}`
* **Form Data**: `request` (`JSON`), `archivo` (`File`).

#### 1.4 Obtener Detalle del Comprobante
* **Método**: `GET`
* **URL**: `/api_comprobante/comprobantes/{comprobanteUuid}`

#### 1.5 Modificar Comprobante
* **Método**: `PUT`
* **URL**: `/api_comprobante/comprobantes/{comprobanteUuid}`
* **Body**: `JSON` con los campos a actualizar.

#### 1.6 Eliminar Comprobante (Anulación)
* **Método**: `DELETE`
* **URL**: `/api_comprobante/comprobantes/{comprobanteUuid}`

#### 1.7 Registrar Nota de Crédito
* **Método**: `POST`
* **URL**: `/api_comprobante/comprobantes/notas-credito`
* **Body**:
  ```json
  {
    "comprobanteUuid": "550e8400-e29b-41d4-a716-446655440000",
    "serieNc": "F002",
    "numeroNc": "0000091",
    "fechaEmisionNc": "2026-06-28",
    "motivo": "Anulación por devolución",
    "alcance": "TOTAL",
    "galonesAfectados": null,
    "mes": "Junio"
  }
  ```

#### 1.8 Catálogos Auxiliares para el Formulario
* **Vehículos Asociados**: `GET /api_comprobante/comprobantes/vehiculos-asociados?ruc={ruc}`
* **Distribuidores / Grifos**: `GET /api_comprobante/comprobantes/distribuidores?ruc={ruc}`
* **Tipos de Combustible**: `GET /api_comprobante/comprobantes/tipos-combustible`
* **Estados de Comprobante**: `GET /api_comprobante/comprobantes/estados`

---

### 2. Vehículos Transportista (`/api_comprobante/vehiculos`)

| Método | URL | Descripción | Parámetros |
| :--- | :--- | :--- | :--- |
| `GET` | `/api_comprobante/vehiculos` | Listar vehículos registrados | `buscar`, `categoria`, `estado` |
| `POST` | `/api_comprobante/vehiculos` | Registrar individualmente | Body JSON `VehiculoRequest` |
| `GET` | `/api_comprobante/vehiculos/{uuid}` | Obtener detalle | Path `uuid` |
| `PUT` | `/api_comprobante/vehiculos/{uuid}` | Editar vehículo | Path `uuid`, Body JSON |
| `DELETE` | `/api_comprobante/vehiculos/{uuid}` | Eliminar vehículo | Path `uuid` |
| `POST` | `/api_comprobante/vehiculos/excel` | Carga masiva via Excel | FormData `archivo` (`.xlsx`) |
| `GET` | `/api_comprobante/vehiculos/padron` | Padrón Nacional ATU | Query `ruc` (req), `buscar` |
| `GET` | `/api_comprobante/vehiculos/categorias` | Categorías M1, M2, M3, etc. | Sin parámetros |

---

### 3. Perfil y Cuenta Bancaria / Abono (`/api_comprobante/perfil`)

| Método | URL | Descripción | Parámetros / Body |
| :--- | :--- | :--- | :--- |
| `GET` | `/api_comprobante/perfil` | Obtener datos de perfil | Query `ruc` (req) |
| `PUT` | `/api_comprobante/perfil/contacto` | Editar teléfono / email | Query `ruc` (req), Body JSON |
| `GET` | `/api_comprobante/perfil/cuenta-abono` | Consultar CCI registrado | Query `ruc` (req) |
| `PUT` | `/api_comprobante/perfil/cuenta-abono` | Registrar/Modificar CCI | Query `ruc` (req), Body JSON |
| `GET` | `/api_comprobante/catalogos/bancos` | Catálogo de bancos y OPE | Ninguno |

---

### 4. Verificación y Elegibilidad (`/api_comprobante/verificacion`)

| Método | URL | Descripción | Parámetros |
| :--- | :--- | :--- | :--- |
| `GET` | `/api_comprobante/verificacion/semaforo` | Estado del semáforo de elegibilidad | Query `ruc` (req) |
| `GET` | `/api_comprobante/verificacion/datos` | Datos principales de la empresa | Query `ruc` (req) |
| `GET` | `/api_comprobante/verificacion/autorizaciones` | Listado de rutas / resoluciones | Query `ruc` (req) |

---

### 5. Ubigeo y Consultas Externas (`/api_comprobante/ubigeo`, `/api_comprobante/validacion`)

| Método | URL | Descripción | Parámetros |
| :--- | :--- | :--- | :--- |
| `GET` | `/api_comprobante/ubigeo/departamentos` | Departamentos | Ninguno |
| `GET` | `/api_comprobante/ubigeo/provincias` | Provincias | Query `departamentoId` |
| `GET` | `/api_comprobante/ubigeo/distritos` | Distritos | Query `provinciaId` |
| `GET` | `/api_comprobante/validacion/sunat` | Consulta RUC SUNAT | Query `ruc` |
| `GET` | `/api_comprobante/validacion/reniec` | Consulta DNI RENIEC | Query `dni` |

---

## 💻 3. Ejemplos de Implementación en Angular (`HttpClient`)

### Ejemplo 1: Enviar Comprobante con Archivo PDF (`multipart/form-data`)

```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ComprobanteService {
  private baseUrl = 'http://localhost:8083/api_comprobante/comprobantes';

  constructor(private http: HttpClient) {}

  registrarComprobante(ruc: string, datosFactura: any, archivoPdf: File): Observable<any> {
    const formData = new FormData();
    
    // Convertir objeto JSON a String Blob o agregar como texto
    formData.append('request', JSON.stringify(datosFactura));
    formData.append('archivo', archivoPdf, archivoPdf.name);

    return this.http.post(`${this.baseUrl}?ruc=${ruc}`, formData);
  }

  obtenerComprobantes(ruc: string, estado?: string): Observable<any[]> {
    let url = `${this.baseUrl}?ruc=${ruc}`;
    if (estado) url += `&estado=${estado}`;
    return this.http.get<any[]>(url);
  }
}
```

---

## ⚠️ 4. Respuestas HTTP y Manejo de Errores

* **`200 OK`**: Petición procesada correctamente.
* **`201 Created`**: Registro exitoso (comprobante, vehículo o cuenta bancaria).
* **`400 Bad Request`**: Datos de entrada inválidos o faltantes. Devuelve objeto JSON con detalle de errores.
* **`401 Unauthorized`**: Token JWT ausente, expirado o inválido.
* **`404 Not Found`**: El recurso solicitado (ej. `comprobanteUuid`) no existe.
* **`500 Internal Server Error`**: Error interno en backend.
