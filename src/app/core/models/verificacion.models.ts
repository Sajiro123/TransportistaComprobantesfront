export interface DatosTransportista {
  uuid: string;
  razonSocial: string;
  ruc: string;
  tipoEntidad: string;
  estado: string;
  totalAutorizaciones: number;
  activoSunat: boolean;
  habidoSunat: boolean;
}

export interface DatosTransportistaResponse {
  data: {
    lista: DatosTransportista;
    respuesta: 'OK';
    mensaje: string;
  };
}

export interface VerificacionErrorDetalle {
  code: string;
  message: string;
  descripcion: string;
}

export interface VerificacionErrorResponse {
  data: {
    lista: VerificacionErrorDetalle;
    respuesta: 'ERROR';
    mensaje: string;
  };
}

export interface VerificacionServiceError extends VerificacionErrorDetalle {
  status?: number;
}

// ── Autorizaciones del Transportista ───────────────────────
export interface AutorizacionTransportista {
  uuid: string;
  tipoTransporte: string;
  estado: string; // 'Vigente' | 'Vencida'
  numeroResolucion: string;
  autoridad: string | null;
  tipoEntidad?: string | null;
  ambito: string | null;
  fechaInicioVigencia: string; // YYYY-MM-DD
  fechaFinVigencia: string; // YYYY-MM-DD
  fuente: string; // 'ATU' | 'MTC'
}

export interface AutorizacionesData {
  totalAutorizaciones: number;
  totalAtu: number;
  totalMtc: number;
  autorizaciones: AutorizacionTransportista[];
}

export interface AutorizacionesResponse {
  data: {
    lista: AutorizacionesData;
    respuesta: 'OK';
    mensaje: string;
  };
}

// ── Semáforo de Condiciones ───────────────────────────────
export interface SemaforoCondicion {
  codigo: string;
  nombre: string;
  estado: 'CUMPLE' | 'REVISAR' | 'NO_CUMPLE';
  descripcion: string;
  icono: 'CHECK' | 'WARNING' | 'ERROR';
  colorNombre: string;
  colorHex: string;
}

export interface SemaforoResponse {
  data: {
    lista: SemaforoCondicion[];
    respuesta: 'OK';
    mensaje: string;
  };
}
