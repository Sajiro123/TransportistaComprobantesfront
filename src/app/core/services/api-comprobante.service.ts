import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { environment } from '@env/environment';
import { FieldDecryptionForgeService } from './field-decryption-forge.service';
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
  ApiResponse,
} from '../models/models';

@Injectable({
  providedIn: 'root',
})
export class ApiComprobanteService {
  private readonly http = inject(HttpClient);
  private readonly decryptionService = inject(FieldDecryptionForgeService);
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

  /**
   * Actualiza los datos de contacto parcialmente editables.
   * @param payload Nuevos datos de contacto
   */
  actualizarContacto(
    payload: ActualizarContactoRequest,
  ): Observable<ActualizarContactoResponse> {
    return this.http.put<ActualizarContactoResponse>(
      `${this.API_URL}/perfil/contacto`,
      payload,
    );
  }

  /**
   * Obtiene la cuenta bancaria donde el transportista recibirá el subsidio.
   * GET /api_comprobante/perfil/cuenta-abono?ruc={ruc}
   */
  obtenerCuentaAbono(ruc: string): Observable<CuentaAbonoResponse> {
    return this.http.get<CuentaAbonoResponse>(
      `${this.API_URL}/perfil/cuenta-abono`,
      { params: { ruc } },
    );
  }

  /**
   * Registra o actualiza la cuenta bancaria donde se recibirá el subsidio.
   * PUT /api_comprobante/perfil/cuenta-abono?ruc={ruc}
   */
  guardarCuentaAbono(
    ruc: string,
    payload: GuardarCuentaAbonoRequest,
  ): Observable<GuardarCuentaAbonoResponse> {
    return this.http.put<GuardarCuentaAbonoResponse>(
      `${this.API_URL}/perfil/cuenta-abono`,
      payload,
      { params: { ruc } },
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
  ): Observable<CuentaBancariaTransportistaResponse> {
    return this.http.post<CuentaBancariaTransportistaResponse>(
      `${this.API_URL}/transportistas/cuenta-bancaria`,
      payload,
    );
  }

  /**
   * PUT /api_comprobante/transportistas/cuenta-bancaria
   */
  actualizarCuentaBancariaTransportista(
    payload: CuentaBancariaTransportistaRequest,
  ): Observable<CuentaBancariaTransportistaResponse> {
    return this.http.put<CuentaBancariaTransportistaResponse>(
      `${this.API_URL}/transportistas/cuenta-bancaria`,
      payload,
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

  // ── Módulo de Comprobantes de Combustible ─────────────────

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

  obtenerComprobante(
    comprobanteUuid: string,
  ): Observable<ApiResponse<ComprobanteResponse>> {
    return this.http.get<ApiResponse<ComprobanteResponse>>(
      `${this.API_URL}/comprobantes/${comprobanteUuid}`,
    );
  }

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

  listarVehiculosAsociados(
    ruc: string,
  ): Observable<ApiResponse<VehiculoAsociadoResponse[]>> {
    return this.http.get<ApiResponse<VehiculoAsociadoResponse[]>>(
      `${this.API_URL}/comprobantes/vehiculos-asociados`,
      { params: { ruc } },
    );
  }

  listarTiposCombustible(): Observable<ApiResponse<TipoCombustibleResponse[]>> {
    return this.http.get<ApiResponse<TipoCombustibleResponse[]>>(
      `${this.API_URL}/comprobantes/tipos-combustible`,
    );
  }

  listarEstados(): Observable<ApiResponse<EstadoComprobanteResponse[]>> {
    return this.http.get<ApiResponse<EstadoComprobanteResponse[]>>(
      `${this.API_URL}/comprobantes/estados`,
    );
  }

  registrarComprobante(
    ruc: string,
    request: ComprobanteRequest,
    archivo: File,
  ): Observable<ApiResponse<string>> {
    const formData = new FormData();
    formData.append('request', JSON.stringify(request));
    formData.append('archivo', archivo);

    return this.http.post<ApiResponse<string>>(
      `${this.API_URL}/comprobantes`,
      formData,
      { params: { ruc } },
    );
  }

  registrarComprobanteB(
    ruc: string,
    request: ComprobanteBRequest,
    archivo: File,
  ): Observable<ApiResponse<string>> {
    const formData = new FormData();
    formData.append('request', JSON.stringify(request));
    formData.append('archivo', archivo);

    return this.http.post<ApiResponse<string>>(
      `${this.API_URL}/comprobantes/granel`,
      formData,
      { params: { ruc } },
    );
  }

  actualizarComprobante(
    comprobanteUuid: string,
    request: ActualizarComprobanteRequest,
  ): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(
      `${this.API_URL}/comprobantes/${comprobanteUuid}`,
      request,
    );
  }

  eliminarComprobante(comprobanteUuid: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(
      `${this.API_URL}/comprobantes/${comprobanteUuid}`,
    );
  }

  registrarNotaCredito(
    request: NotaCreditoRequest,
  ): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.API_URL}/comprobantes/notas-credito`,
      request,
    );
  }
}
