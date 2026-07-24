// =========================================================
// SIGT – ATU | Models
// =========================================================

export interface Usuario {
  email: string;
  password: string;
  nombre: string;
  tipoEntidad: 'regional' | 'municipal' | 'empresa' | string;
  entidad: string;
  documentoCargo?: string;
  registradoEn?: string;
  // Extended profile fields (captured at registration)
  primerApellido?: string;
  segundoApellido?: string;
  tipoDocumento?: string;
  numDocumento?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  telefono?: string;
  cargo?: string;
  perfilNombre?: string;
  perfilCodigo?: string;
  razonSocial?: string;
  entidadUuid?: string;
  usuarioUuid?: string;
  banco?: string;
  cci?: string;
}

export interface RegistroVehicular {
  id: number;
  fila: number;
  placa: string;
  categoria: 'M2' | 'M3' | 'N1' | 'N2' | 'N3' | string;
  tuc: string;
  fecha_inicio_tuc: string;
  fecha_fin_tuc: string;
  estado_tuc: string;
  transportista: string;
  ruc: string;
  partida_registral: string;
  tipo_servicio: string;
  acto_administrativo: string;
  fecha_inicio_aut: string;
  fecha_fin_aut: string;
  estado_aut: string;
  valido: boolean;
  elegible: boolean;
  errores: string[];
}

export interface EnvioATU {
  id: number;
  entidad: string;
  oficio: string;
  documento: string;
  fecha: string;
  total: number;
  elegibles: number;
  estado: string;
}

export interface RegistroRaw {
  placa: string;
  categoria: string;
  tuc: string;
  fecha_inicio_tuc: string;
  fecha_fin_tuc: string;
  estado_tuc: string;
  transportista: string;
  ruc: string;
  partida_registral: string;
  tipo_servicio: string;
  acto_administrativo: string;
  fecha_inicio_aut: string;
  fecha_fin_aut: string;
  estado_aut: string;
}

export interface DatosEmpresa {
  razonSocial: string;
  ruc: string;
  estadoCondicion: string;
  tipoEntidad: string;
  autoridad: string;
  autorizacionVigente: boolean;
}

export interface RepresentanteLegal {
  nombresApellidos: string;
  tipoDocumento: string;
  numeroDocumento: string;
}

export interface ContactoTransportista {
  nombresApellidos: string;
  tipoDocumento: string;
  numeroDocumento: string;
  correoElectronico: string;
  telefono: string;
}

export interface PerfilTransportista {
  datosEmpresa: DatosEmpresa;
  representanteLegal: RepresentanteLegal;
  contacto: ContactoTransportista;
}

export interface PerfilTransportistaResponse {
  data: {
    lista: PerfilTransportista;
    respuesta: string;
    mensaje: string;
  };
}

export interface ActualizarContactoRequest {
  nombresApellidos: string;
  tipoDocumento?: string;
  numeroDocumento?: string;
  telefono: string;
}

export interface ActualizarContactoResponse {
  data: {
    lista: ContactoTransportista;
    respuesta: string;
    mensaje: string;
  };
}

export interface CuentaAbono {
  banco: string;
  codigoCuentaInterbancario: string;
}

export interface CuentaAbonoResponse {
  data: {
    lista: CuentaAbono | null;
    respuesta: string;
    mensaje: string;
  };
}

export interface GuardarCuentaAbonoRequest {
  banco: string;
  codigoCuentaInterbancario: string;
}

export interface GuardarCuentaAbonoResponse {
  data: {
    lista: CuentaAbono;
    respuesta: string;
    mensaje: string;
  };
}

// ── API Real Cuenta Bancaria y Catálogos ───────────────────

export interface BancoItemResponse {
  uuidBanco: string;
  codigo: string;
  nombre: string;
  abreviatura: string;
  permiteOpe: boolean;
}

export interface BancosResponse {
  data: {
    lista: BancoItemResponse[];
    respuesta: string;
    mensaje: string;
  };
}

export interface CuentaBancariaTransportistaRequest {
  bancoId: number;
  tipoAbonoId: number; // 1 = CCI, 2 = OPE
  cci?: string | null;
  dniBeneficiario?: string | null;
  nombreBeneficiario?: string | null;
}

export interface CuentaBancariaTransportistaResponseData {
  uuidCuentaBancaria?: string;
  transportistaId?: number;
  uuidBanco?: string;
  tipoAbono?: string;
  cci?: string | null;
  dniBeneficiario?: string | null;
  nombreBeneficiario?: string | null;
  estado?: boolean;
}

export interface CuentaBancariaTransportistaResponse {
  data: {
    lista: CuentaBancariaTransportistaResponseData | null;
    respuesta: string;
    mensaje: string;
  };
}

export type EstadoValidacionVehiculo = 'VALIDADO' | 'EN_REVISION' | 'RECHAZADO';

export interface PropietarioVehiculo {
  tipoDocumento: string;
  numeroDocumento: string;
  nombre: string;
}

export interface ValidacionVehiculo {
  campo: string;
  estado: EstadoValidacionVehiculo;
  entidadValidadora: string;
}

export interface VehiculoTransportista {
  id?: number | string;
  cargaUuid?: string;
  cargaVehiculoUuid?: string;
  vehiculoUuid?: string;
  placa: string;
  categoria: string;
  topeGalones?: number;
  numeroAutorizacion: string;
  entidadAutorizadora?: string | null;
  tuc: string;
  tucVencida?: boolean;
  estadoValidacion?: EstadoValidacionVehiculo;
  propietario?: PropietarioVehiculo;
  validaciones?: ValidacionVehiculo[];
  tipoDocumento?: string;
  numeroDocumento?: string;
  razonSocial?: string;
  estadoRegistro?: string;
  estadoCarga?: string;
  fechaRegistro?: string;
}

export interface VehiculosFiltros {
  busqueda?: string;
  categoria?: string;
  estado?: EstadoValidacionVehiculo | '';
}

export interface VehiculosResponse {
  data: {
    lista: VehiculoTransportista[];
    respuesta: string;
    mensaje: string;
  };
}

export interface VehiculoDetalleResponse {
  data: {
    lista: VehiculoTransportista;
    respuesta: string;
    mensaje: string;
  };
}

export interface VehiculoNoEncontrado {
  data: {
    lista: {
      code: 'VEH_004';
      message: string;
      descripcion: string;
    };
    respuesta: 'ERROR';
    mensaje: string;
  };
}

export interface RegistrarVehiculoRequest {
  placa: string;
  categoria: string;
  topeGalones: number;
  numeroAutorizacion: string;
  tuc: string;
  propietarioTipoDocumento?: string;
  propietarioNumeroDocumento: string;
  propietarioNombre?: string;
}

export interface RegistrarVehiculoResponse {
  data: {
    lista: VehiculoTransportista;
    respuesta: string;
    mensaje: string;
  };
}

export type ActualizarVehiculoRequest = RegistrarVehiculoRequest;
export type ActualizarVehiculoResponse = RegistrarVehiculoResponse;

export interface EliminarVehiculoResponse {
  data: {
    lista: null;
    respuesta: 'OK';
    mensaje: string;
  };
}

// ── API Comprobantes de Combustible ───────────────────────────

export interface ComprobanteListResponse {
  comprobanteUuid: string;
  tipoComprobanteCodigo: string;
  estadoComprobanteCodigo: string;
  estadoComprobanteNombre: string;
  colorSemaforo: string;
  colorHex: string;
  serie: string;
  numero: string;
  fechaEmision: string;
  placa?: string;
  nombreComercialDistribuidor: string;
  distritoDistribuidor: string;
  provinciaDistribuidor: string;
  tipoCombustibleCodigo: string;
  azufrePpm: number;
  galones: number;
  tieneNotaCreditoActiva: boolean;
}

export interface ComprobanteArchivoResponse {
  archivoUuid: string;
  nombreOriginal: string;
  tipoContenidoMime: string;
  tamanioBytes: number;
  tipoArchivo: string;
  principal: boolean;
}

export interface ComprobanteDetalleResponse {
  comprobanteDetalleUuid: string;
  placa: string;
  categoriaCodigo: string;
  esSubsidiable: boolean;
  galonesAsignados: number;
  observacion?: string;
}

export interface ComprobanteResponse extends ComprobanteListResponse {
  tipoComprobanteNombre: string;
  rucTransportista: string;
  razonSocialTransportista: string;
  mes: string;
  anio: number;
  rucDistribuidor: string;
  razonSocialDistribuidor: string;
  tipoCombustibleNombre: string;
  categoriaVehiculo?: string;
  validaSunat: boolean;
  validaOsinergmin: boolean;
  observacion?: string;
  archivos: ComprobanteArchivoResponse[];
  detalle: ComprobanteDetalleResponse[];
}

export interface ComprobantePlacaRequest {
  vehiculoUuid: string;
  galonesAsignados?: number;
}

export interface ComprobanteRequest {
  serie: string;
  numero: string;
  fechaEmision: string;
  mes: string;
  anio: number;
  rucDistribuidor: string;
  distribuidorRazonSocial?: string;
  distribuidorDireccion?: string;
  distribuidorDepartamento?: string;
  distribuidorProvincia?: string;
  distribuidorDistrito?: string;
  tipoCombustibleCodigo: string;
  azufrePpm?: number;
  galones: number;
  costo: number;
  placas: ComprobantePlacaRequest[];
}

export interface ComprobanteDetalleRequest {
  vehiculoUuid: string;
  galonesAsignados: number;
  esSubsidiable?: boolean;
}

export interface ComprobanteBRequest {
  serie: string;
  numero: string;
  fechaEmision: string;
  mes: string;
  anio: number;
  rucDistribuidor: string;
  distribuidorRazonSocial?: string;
  distribuidorDireccion?: string;
  distribuidorDepartamento?: string;
  distribuidorProvincia?: string;
  distribuidorDistrito?: string;
  tipoCombustibleCodigo: string;
  azufrePpm?: number;
  galones: number;
  costo: number;
  detalle?: ComprobanteDetalleRequest[];
}

export interface ActualizarComprobanteRequest {
  serie?: string;
  numero?: string;
  fechaEmision?: string;
  mes?: string;
  anio?: number;
  rucDistribuidor?: string;
  tipoCombustibleCodigo?: string;
  azufrePpm?: number;
  galones?: number;
  costo?: number;
  placas?: ComprobantePlacaRequest[];
  detalle?: ComprobanteDetalleRequest[];
}

export interface NotaCreditoRequest {
  comprobanteUuid: string;
  serieNc: string;
  numeroNc: string;
  fechaEmisionNc: string;
  motivo: string;
  alcance: 'TOTAL' | 'PARCIAL' | string;
  galonesAfectados?: number;
  mes?: string;
}

export interface DistribuidorResponse {
  distribuidorUuid: string;
  ruc: string;
  razonSocial: string;
  nombreComercial: string;
  direccion: string;
  departamento: string;
  provincia: string;
  distrito: string;
  inscritoOsinergmin: boolean;
}

export interface VehiculoAsociadoResponse {
  vehiculoUuid: string;
  placa: string;
  categoriaCodigo: string;
  categoriaNombre: string;
  topeGalones: number;
  esSubsidiable: boolean;
  entidadNombre: string;
}

export interface TipoCombustibleResponse {
  codigo: string;
  nombre: string;
  ppmMaximo: number;
}

export interface EstadoComprobanteResponse {
  codigo: string;
  nombre: string;
}

// Responses wrappers
export interface ApiResponse<T> {
  data: {
    lista: T;
    respuesta: string;
    mensaje: string;
  };
}
