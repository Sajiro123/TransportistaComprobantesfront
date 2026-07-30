import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env/environment';
import { FieldDecryptionForgeService } from './field-decryption-forge.service';
import { FieldEncryptionService } from './field-encryption.service';
import {
  ActualizarContactoRequest,
  ActualizarContactoResponse,
  BancoItemResponse,
  BancosResponse,
  CuentaAbono,
  CuentaAbonoResponse,
  CuentaBancariaTransportistaRequest,
  CuentaBancariaTransportistaResponse,
  GuardarCuentaAbonoRequest,
  GuardarCuentaAbonoResponse,
  PerfilTransportista,
  PerfilTransportistaResponse,
  ComprobanteListResponse,
  ComprobanteResponse,
  ComprobanteRequest,
  ComprobanteBRequest,
  ActualizarComprobanteRequest,
  NotaCreditoRequest,
  DistribuidorResponse,
  VehiculoAsociadoResponse,
  TipoCombustibleResponse,
  EstadoComprobanteResponse,
  AcumuladoVehiculoResponse,
  OsinergminValidacionResponse,
  RelacionPlacaBRequest,
  RelacionPlacaBResponse,
  ProrrateoResponse,
  ApiResponse,
} from '../models/models';

@Injectable({
  providedIn: 'root',
})
export class ApiComprobanteService {
  private readonly http = inject(HttpClient);
  private readonly decryptionService = inject(FieldDecryptionForgeService);
  private readonly encryptionService = inject(FieldEncryptionService);
  private readonly API_URL = environment.API_COMPROBANTE_URL;

  /**
   * Obtiene el perfil completo del transportista (empresa, representante, contacto).
   * @param ruc RUC del transportista
   */
  obtenerPerfil(ruc: string): Observable<PerfilTransportistaResponse> {
    return this.http
      .get<PerfilTransportistaResponse>(`${this.API_URL}/perfil`, {
        params: { ruc },
      })
      .pipe(
        map((res) => {
          const contacto = res.data?.lista?.contacto as
            | (PerfilTransportista['contacto'] & {
              nombres?: string;
              apellidoPaterno?: string;
              apellidoMaterno?: string;
              correo?: string;
            })
            | undefined;

          if (!contacto) return res;

          contacto.numeroDocumento = this.decryptSensitiveField(
            contacto.numeroDocumento,
          );
          contacto.correoElectronico = this.decryptSensitiveField(
            contacto.correoElectronico ?? contacto.correo,
          );
          contacto.telefono = this.decryptSensitiveField(contacto.telefono);

          if (!contacto.nombresApellidos) {
            contacto.nombresApellidos = [
              contacto.nombres,
              contacto.apellidoPaterno,
              contacto.apellidoMaterno,
            ]
              .filter(Boolean)
              .join(' ');
          }

          if (!contacto.tipoDocumento) {
            contacto.tipoDocumento =
              this.tipoDocumentoCodigo(contacto.tipoDocumentoId) ?? '';
          }

          return res;
        }),
      );
  }

  private tipoDocumentoCodigo(tipoDocumentoId?: number): string | undefined {
    return (
      {
        1: 'DNI',
        2: 'CE',
        3: 'PASAPORTE',
      }[tipoDocumentoId ?? 0] ?? undefined
    );
  }

  private decryptSensitiveField(value: string | null | undefined): string {
    if (!value) return '';

    try {
      return this.decryptionService.decrypt(value) ?? '';
    } catch (error) {
      console.error('Error al desencriptar un dato de contacto:', error);
      return value;
    }
  }

  actualizarContacto(
    payload: ActualizarContactoRequest,
  ): Observable<ActualizarContactoResponse> {
    const encryptedPayload = {
      ...payload,
      numeroDocumento: this.encryptionService.encryptForRequest(payload.numeroDocumento) ?? undefined,
      correo: this.encryptionService.encryptForRequest(payload.correo) ?? undefined,
      telefono: this.encryptionService.encryptForRequest(payload.telefono) ?? undefined,
    };
    return this.http.put<ActualizarContactoResponse>(
      `${this.API_URL}/perfil/contacto`,
      encryptedPayload,
    );
  }

  // ── Catálogos: Bancos ─────────────────────────────────────
  /**
   * GET /api_comprobante/catalogos/bancos
   */
  obtenerBancos(): Observable<BancosResponse> {
    return this.http.get<BancosResponse>(`${this.API_URL}/catalogos/bancos`);
  }

  // ── Cuenta Bancaria Transportista ────────────────────────

  /**
   * GET /api_comprobante/transportistas/cuenta-bancaria
   * Desencripta automáticamente los campos sensibles si vienen cifrados.
   */
  obtenerCuentaBancariaTransportista(): Observable<CuentaBancariaTransportistaResponse> {
    return this.http
      .get<CuentaBancariaTransportistaResponse>(
        `${this.API_URL}/transportistas/cuenta-bancaria`,
      )
      .pipe(
        map((res) => {
          if (res.data?.lista) {
            const item = res.data.lista;
            try {
              if (item.cci) item.cci = this.decryptionService.decrypt(item.cci);
              if (item.dniBeneficiario)
                item.dniBeneficiario = this.decryptionService.decrypt(
                  item.dniBeneficiario,
                );
              if (item.nombreBeneficiario)
                item.nombreBeneficiario = this.decryptionService.decrypt(
                  item.nombreBeneficiario,
                );
            } catch (err) {
              console.error(
                'Error al desencriptar datos de cuenta bancaria:',
                err,
              );
            }
          }
          return res;
        }),
      );
  }

  /**
   * POST /api_comprobante/transportistas/cuenta-bancaria
   */
  registrarCuentaBancariaTransportista(
    payload: CuentaBancariaTransportistaRequest,
    archivo: File,
  ): Observable<CuentaBancariaTransportistaResponse> {
    const encryptedPayload = {
      ...payload,
      cci: payload.cci ? this.encryptionService.encryptForRequest(payload.cci) : payload.cci,
      dniBeneficiario: payload.dniBeneficiario ? this.encryptionService.encryptForRequest(payload.dniBeneficiario) : payload.dniBeneficiario,
      nombreBeneficiario: payload.nombreBeneficiario ? this.encryptionService.encryptForRequest(payload.nombreBeneficiario) : payload.nombreBeneficiario,
    };

    const formData = new FormData();
    formData.append('cuentaBancaria', JSON.stringify(encryptedPayload));
    formData.append('archivo', archivo);

    return this.http.post<CuentaBancariaTransportistaResponse>(
      `${this.API_URL}/transportistas/cuenta-bancaria`,
      formData,
    );
  }

  /**
   * PUT /api_comprobante/transportistas/cuenta-bancaria
   */
  actualizarCuentaBancariaTransportista(
    payload: CuentaBancariaTransportistaRequest,
    archivo?: File | null,
  ): Observable<CuentaBancariaTransportistaResponse> {
    const encryptedPayload = {
      ...payload,
      cci: payload.cci ? this.encryptionService.encryptForRequest(payload.cci) : payload.cci,
      dniBeneficiario: payload.dniBeneficiario ? this.encryptionService.encryptForRequest(payload.dniBeneficiario) : payload.dniBeneficiario,
      nombreBeneficiario: payload.nombreBeneficiario ? this.encryptionService.encryptForRequest(payload.nombreBeneficiario) : payload.nombreBeneficiario,
    };

    const formData = new FormData();
    formData.append('cuentaBancaria', JSON.stringify(encryptedPayload));
    if (archivo) {
      formData.append('archivo', archivo);
    }

    return this.http.put<CuentaBancariaTransportistaResponse>(
      `${this.API_URL}/transportistas/cuenta-bancaria`,
      formData,
    );
  }

  /**
   * DELETE /api_comprobante/transportistas/cuenta-bancaria
   */
  eliminarCuentaBancariaTransportista(): Observable<{ data: { respuesta: string; mensaje: string } }> {
    return this.http.delete<{ data: { respuesta: string; mensaje: string } }>(
      `${this.API_URL}/transportistas/cuenta-bancaria`,
    );
  }

  /**
   * GET /api_comprobante/archivos/{archivoUuid}
   */
  descargarArchivo(archivoUuid: string): Observable<Blob> {
    return this.http.get(`${this.API_URL}/archivos/${archivoUuid}`, {
      responseType: 'blob',
    });
  }

  // ── Módulo de Comprobantes de Combustible ─────────────────

  /**
   * GET /api_comprobante/comprobantes
   * Lista comprobantes del transportista con filtros opcionales.
   */
  listarComprobantes(
    ruc: string,
    placa?: string,
    estado?: string,
    busqueda?: string,
  ): Observable<ApiResponse<ComprobanteListResponse[]>> {
    let params: any = { ruc };
    if (placa) params.placa = placa;
    if (estado && estado !== 'todos') params.estado = estado;
    if (busqueda) params.busqueda = busqueda;

    return this.http.get<ApiResponse<ComprobanteListResponse[]>>(
      `${this.API_URL}/comprobantes`,
      { params },
    );
  }

  /**
   * GET /api_comprobante/comprobantes/{comprobanteUuid}
   * Obtiene el detalle completo de un comprobante.
   */
  obtenerComprobante(
    comprobanteUuid: string,
  ): Observable<ApiResponse<ComprobanteResponse>> {
    return this.http.get<ApiResponse<ComprobanteResponse>>(
      `${this.API_URL}/comprobantes/${comprobanteUuid}`,
    );
  }

  /**
   * GET /api_comprobante/comprobantes/distribuidores
   * Lista distribuidores de combustible registrados.
   */
  listarDistribuidores(
    ruc?: string,
  ): Observable<ApiResponse<DistribuidorResponse[]>> {
    let params: any = {};
    if (ruc) params.ruc = ruc;
    return this.http.get<ApiResponse<DistribuidorResponse[]>>(
      `${this.API_URL}/comprobantes/distribuidores`,
      { params },
    );
  }

  /**
   * GET /api_comprobante/comprobantes/vehiculos-asociados
   * Lista vehículos asociados al transportista.
   */
  listarVehiculosAsociados(
    ruc: string,
  ): Observable<ApiResponse<VehiculoAsociadoResponse[]>> {
    return this.http.get<ApiResponse<VehiculoAsociadoResponse[]>>(
      `${this.API_URL}/comprobantes/vehiculos-asociados`,
      { params: { ruc } },
    );
  }

  /**
   * GET /api_comprobante/comprobantes/tipos-combustible
   */
  listarTiposCombustible(): Observable<ApiResponse<TipoCombustibleResponse[]>> {
    return this.http.get<ApiResponse<TipoCombustibleResponse[]>>(
      `${this.API_URL}/comprobantes/tipos-combustible`,
    );
  }

  /**
   * GET /api_comprobante/comprobantes/estados
   */
  listarEstados(): Observable<ApiResponse<EstadoComprobanteResponse[]>> {
    return this.http.get<ApiResponse<EstadoComprobanteResponse[]>>(
      `${this.API_URL}/comprobantes/estados`,
    );
  }

  /**
   * GET /api_comprobante/comprobantes/acumulado-vehiculos
   * Obtiene el acumulado de volumen (m3) por vehículo del mes actual.
   */
  listarAcumuladoVehiculos(ruc: string): Observable<ApiResponse<AcumuladoVehiculoResponse[]>> {
    return this.http.get<ApiResponse<AcumuladoVehiculoResponse[]>>(
      `${this.API_URL}/comprobantes/acumulado-vehiculos`,
      { params: { ruc } },
    );
  }

  /**
   * POST /api_comprobante/comprobantes
   * Registra un comprobante Forma A (Surtido Directo).
   * Content-Type: multipart/form-data
   */
  registrarComprobante(
    ruc: string,
    request: ComprobanteRequest,
    archivo: File,
    archivoNc?: File | null,
  ): Observable<ApiResponse<string>> {
    const formData = new FormData();
    formData.append('comprobante', JSON.stringify(request));
    formData.append('archivo', archivo);
    if (archivoNc) {
      formData.append('archivoNc', archivoNc);
    }

    return this.http.post<ApiResponse<string>>(
      `${this.API_URL}/comprobantes`,
      formData,
      { params: { ruc } },
    );
  }

  /**
   * POST /api_comprobante/comprobantes/granel
   * Registra un comprobante Forma B (Consumidor Directo / Granel).
   * Content-Type: multipart/form-data
   */
  registrarComprobanteB(
    ruc: string,
    request: ComprobanteBRequest,
    archivo: File,
    archivoNc?: File | null,
  ): Observable<ApiResponse<string>> {
    const formData = new FormData();
    formData.append('comprobante', JSON.stringify(request));
    formData.append('archivo', archivo);
    if (archivoNc) {
      formData.append('archivoNc', archivoNc);
    }

    return this.http.post<ApiResponse<string>>(
      `${this.API_URL}/comprobantes/granel`,
      formData,
      { params: { ruc } },
    );
  }

  /**
   * PUT /api_comprobante/comprobantes/{comprobanteUuid}
   * Actualiza parcialmente un comprobante existente.
   */
  actualizarComprobante(
    comprobanteUuid: string,
    request: ActualizarComprobanteRequest,
  ): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(
      `${this.API_URL}/comprobantes/${comprobanteUuid}`,
      request,
    );
  }

  /**
   * DELETE /api_comprobante/comprobantes/{comprobanteUuid}
   * Elimina (soft delete) un comprobante.
   */
  eliminarComprobante(comprobanteUuid: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(
      `${this.API_URL}/comprobantes/${comprobanteUuid}`,
    );
  }

  /**
   * POST /api_comprobante/comprobantes/notas-credito
   * Registra una nota de crédito asociada a un comprobante.
   */
  registrarNotaCredito(
    request: NotaCreditoRequest,
  ): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.API_URL}/comprobantes/notas-credito`,
      request,
    );
  }

  /**
   * GET /api_comprobante/comprobantes/validar-osinergmin
   * Valida si un RUC de distribuidor está inscrito en Osinergmin.
   */
  validarOsinergmin(ruc: string): Observable<ApiResponse<OsinergminValidacionResponse>> {
    return this.http.get<ApiResponse<OsinergminValidacionResponse>>(
      `${this.API_URL}/comprobantes/validar-osinergmin`,
      { params: { ruc } },
    );
  }

  /**
   * POST /api_comprobante/comprobantes/granel/placas
   * Guarda la relación de placas para Forma B.
   */
  guardarRelacionPlacasB(
    ruc: string,
    request: RelacionPlacaBRequest,
  ): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.API_URL}/comprobantes/granel/placas`,
      request,
      { params: { ruc } },
    );
  }

  /**
   * GET /api_comprobante/comprobantes/granel/placas
   * Lista la relación de placas Forma B.
   */
  listarRelacionPlacasB(
    ruc: string,
    mes?: string,
    anio?: number,
  ): Observable<ApiResponse<RelacionPlacaBResponse[]>> {
    let params: any = { ruc };
    if (mes) params.mes = mes;
    if (anio) params.anio = anio;
    return this.http.get<ApiResponse<RelacionPlacaBResponse[]>>(
      `${this.API_URL}/comprobantes/granel/placas`,
      { params },
    );
  }

  /**
   * GET /api_comprobante/comprobantes/granel/prorrateo
   * Calcula el factor de prorrateo Qa/Ta por tipo de combustible.
   */
  calcularProrrateo(
    ruc: string,
    mes: string,
    anio: number,
  ): Observable<ApiResponse<ProrrateoResponse>> {
    return this.http.get<ApiResponse<ProrrateoResponse>>(
      `${this.API_URL}/comprobantes/granel/prorrateo`,
      { params: { ruc, mes, anio } },
    );
  }
}
