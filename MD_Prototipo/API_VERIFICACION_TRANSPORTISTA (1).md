# API Verificación del Transportista

## Base URL

```
/api_comprobante/verificacion
```

---

## 1. Datos del Transportista

Obtiene la información general del transportista a partir de su RUC.

### `GET /api_comprobante/verificacion/datos`

**Query Parameters:**

| Parámetro | Tipo   | Requerido | Descripción           | Ejemplo       |
| --------- | ------ | --------- | --------------------- | ------------- |
| `ruc`     | String | Sí        | RUC del transportista | `20412345670` |

**Response 200 OK:**

```json
{
  "data": {
    "lista": {
      "id": 1,
      "razonSocial": "Transportes Lima Sur S.A.C.",
      "ruc": "20412345670",
      "tipoEntidad": "Persona jurídica",
      "estado": "Habilitado",
      "totalAutorizaciones": 3
    },
    "respuesta": "OK",
    "mensaje": "Detalle de transportista obtenido correctamente"
  }
}
```

**Campos del Response:**

| Campo                 | Tipo    | Descripción                      | Ejemplo                       |
| --------------------- | ------- | -------------------------------- | ----------------------------- |
| `id`                  | Integer | ID interno del transportista     | `1`                           |
| `razonSocial`         | String  | Razón social                     | `Transportes Lima Sur S.A.C.` |
| `ruc`                 | String  | RUC                              | `20412345670`                 |
| `tipoEntidad`         | String  | Tipo de entidad                  | `Persona jurídica`            |
| `estado`              | String  | Estado del transportista         | `Habilitado`                  |
| `totalAutorizaciones` | Integer | Cantidad total de autorizaciones | `3`                           |

**Response 500 Error:**

```json
{
  "data": {
    "lista": {
      "code": "VER_001",
      "message": "Error al obtener datos del transportista",
      "descripcion": "<detalle del error>"
    },
    "respuesta": "ERROR",
    "mensaje": "Error al procesar la solicitud"
  }
}
```

---

## 2. Autorizaciones del Transportista

Lista todas las autorizaciones de transporte asociadas al transportista.

### `GET /api_comprobante/verificacion/autorizaciones`

**Query Parameters:**

| Parámetro | Tipo   | Requerido | Descripción           | Ejemplo       |
| --------- | ------ | --------- | --------------------- | ------------- |
| `ruc`     | String | Sí        | RUC del transportista | `20412345670` |

**Response 200 OK:**

```json
{
  "data": {
    "lista": [
      {
        "id": 1,
        "tipoTransporte": "Transporte regular de personas",
        "estado": "Vigente",
        "numeroResolucion": "R.D. 0452-2024-ATU",
        "autoridad": "ATU",
        "ambito": "Lima Metropolitana",
        "fechaInicioVigencia": "2024-03-15",
        "fechaFinVigencia": "2029-03-14"
      },
      {
        "id": 2,
        "tipoTransporte": "Transporte de trabajadores",
        "estado": "Vigente",
        "numeroResolucion": "R.D. 0871-2023-MPC",
        "autoridad": "Municipalidad Provincial del Callao",
        "ambito": "Callao",
        "fechaInicioVigencia": "2023-08-01",
        "fechaFinVigencia": "2027-07-31"
      },
      {
        "id": 3,
        "tipoTransporte": "Transporte turístico",
        "estado": "Vencida",
        "numeroResolucion": "R.D. 1290-2022-MTC",
        "autoridad": "MTC",
        "ambito": "Nacional",
        "fechaInicioVigencia": "2022-01-10",
        "fechaFinVigencia": "2026-01-09"
      }
    ],
    "respuesta": "OK",
    "mensaje": "Se encontraron 3 autorizaciones"
  }
}
```

**Campos del Response (cada elemento del array):**

| Campo                 | Tipo    | Descripción                                  | Ejemplo                          |
| --------------------- | ------- | -------------------------------------------- | -------------------------------- |
| `id`                  | Integer | ID de la autorización                        | `1`                              |
| `tipoTransporte`      | String  | Tipo de transporte autorizado                | `Transporte regular de personas` |
| `estado`              | String  | Estado: `Vigente` o `Vencida`                | `Vigente`                        |
| `numeroResolucion`    | String  | Número de resolución administrativa          | `R.D. 0452-2024-ATU`             |
| `autoridad`           | String  | Autoridad que otorgó la autorización         | `ATU`                            |
| `ambito`              | String  | Ámbito geográfico de la autorización         | `Lima Metropolitana`             |
| `fechaInicioVigencia` | String  | Fecha inicio vigencia (formato `YYYY-MM-DD`) | `2024-03-15`                     |
| `fechaFinVigencia`    | String  | Fecha fin vigencia (formato `YYYY-MM-DD`)    | `2029-03-14`                     |

**Response 500 Error:**

```json
{
  "data": {
    "lista": {
      "code": "VER_002",
      "message": "Error al listar autorizaciones del transportista",
      "descripcion": "<detalle del error>"
    },
    "respuesta": "ERROR",
    "mensaje": "Error al procesar la solicitud"
  }
}
```

---

## 3. Semáforo de Condiciones

Obtiene el estado de las condiciones de elegibilidad del transportista para el subsidio.

### `GET /api_comprobante/verificacion/semaforo`

**Query Parameters:**

| Parámetro | Tipo   | Requerido | Descripción           | Ejemplo       |
| --------- | ------ | --------- | --------------------- | ------------- |
| `ruc`     | String | Sí        | RUC del transportista | `20412345670` |

**Response 200 OK:**

```json
{
  "data": {
    "lista": [
      {
        "codigo": "RUC_ACTIVO",
        "nombre": "RUC activo y habido",
        "estado": "CUMPLE",
        "descripcion": "Tu RUC figura en estado ACTIVO y con condición de domicilio HABIDO en SUNAT.",
        "icono": "CHECK",
        "colorNombre": "verde",
        "colorHex": "#16A34A"
      },
      {
        "codigo": "AUTORIZACION_VIGENTE",
        "nombre": "Autorización de transporte vigente",
        "estado": "CUMPLE",
        "descripcion": "La ATU registra tu autorización como vigente a la fecha de la solicitud.",
        "icono": "CHECK",
        "colorNombre": "verde",
        "colorHex": "#16A34A"
      },
      {
        "codigo": "VEHICULOS_HABILITADOS",
        "nombre": "Vehículos habilitados",
        "estado": "REVISAR",
        "descripcion": "Tienes 2 vehículo(s) observado(s): C4T-119, C4T-220.",
        "icono": "WARNING",
        "colorNombre": "amarillo",
        "colorHex": "#EAB308"
      }
    ],
    "respuesta": "OK",
    "mensaje": "Se encontraron 3 condiciones"
  }
}
```

**Campos del Response (cada elemento del array):**

| Campo         | Tipo   | Descripción                          | Valores posibles                                              | Ejemplo                             |
| ------------- | ------ | ------------------------------------ | ------------------------------------------------------------- | ----------------------------------- |
| `codigo`      | String | Código de la condición               | `RUC_ACTIVO`, `AUTORIZACION_VIGENTE`, `VEHICULOS_HABILITADOS` | `RUC_ACTIVO`                        |
| `nombre`      | String | Nombre descriptivo de la condición   | -                                                             | `RUC activo y habido`               |
| `estado`      | String | Estado de la condición               | `CUMPLE`, `REVISAR`, `NO_CUMPLE`                              | `CUMPLE`                            |
| `descripcion` | String | Descripción contextual del resultado | -                                                             | `Tu RUC figura en estado ACTIVO...` |
| `icono`       | String | Icono a renderizar en frontend       | `CHECK`, `WARNING`, `ERROR`                                   | `CHECK`                             |
| `colorNombre` | String | Nombre del color del semáforo        | `verde`, `amarillo`, `rojo`, `gris`                           | `verde`                             |
| `colorHex`    | String | Color hexadecimal                    | -                                                             | `#16A34A`                           |

**Notas para VEHICULOS_HABILITADOS:**

- `estado=CUMPLE`: Todos los vehículos tienen TUC vigente
- `estado=REVISAR`: Al menos un vehículo tiene TUC observado (no vigente). La descripción incluye las placas observadas
- `estado=NO_CUMPLE`: No se encontraron vehículos habilitados

**Response 500 Error:**

```json
{
  "data": {
    "lista": {
      "code": "VER_003",
      "message": "Error al obtener semáforo de condiciones del transportista",
      "descripcion": "<detalle del error>"
    },
    "respuesta": "ERROR",
    "mensaje": "Error al procesar la solicitud"
  }
}
```

---

## Notas para Frontend

1. **Formato de fechas**: Se devuelven en formato `YYYY-MM-DD` (ISO 8601). Formatear al mostrar (ej: `DD/MM/YYYY`).

2. **Mapeo de iconos del semáforo**:
   - `CHECK` → icono de verificación / checkmark verde
   - `WARNING` → icono de advertencia / amarillo
   - `ERROR` → icono de error / rojo

3. **Estados del semáforo**:
   - `CUMPLE` → condición satisfecha
   - `REVISAR` → condición con observación, puede continuar pero con restricciones
   - `NO_CUMPLE` → condición no satisfecha, bloqueante

4. **Colores del semáforo** (viene de `te_nivel_semaforo`):
   - `E001` → verde (`#16A34A`) - CONFORME
   - `E002` → gris (`#9CA3AF`) - NO_ENCONTRADO
   - `E004` → rojo (`#DC2626`) - NO_CONFORME
   - `E005` → azul (`#2563EB`) - EN_PROCESO
   - Los colores se pueden usar directamente en el frontend con `colorHex` para estilos CSS

5. **Cuando no existe transportista con el RUC**: El endpoint `/datos` retorna `lista: null`.
