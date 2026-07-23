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
  private readonly useMock = environment.API_COMPROBANTE_MOCK;


  private mockPerfil: PerfilTransportista = {
    datosEmpresa: {
      razonSocial: 'Transportes Lima Sur S.A.C.',
      ruc: '20512345678',
      estadoCondicion: 'ACTIVO · HABIDO',
      tipoEntidad: 'Persona jurídica',
      autoridad: 'ATU – Autoridad de Transporte Urbano',
      autorizacionVigente: true,
    },
    representanteLegal: {
      nombresApellidos: 'Rosa María Vílchez Salazar',
      tipoDocumento: 'DNI',
      numeroDocumento: '40218765',
    },
    contacto: {
      nombresApellidos: 'Rosa María Vílchez Salazar',
      tipoDocumento: 'DNI',
      numeroDocumento: '40218765',
      correoElectronico: 'contacto@translimasur.pe',
      telefono: '987654321',
    },
  };

  private mockCuentaAbono: CuentaAbono | null = {
    banco: 'Banco de Crédito del Perú',
    codigoCuentaInterbancario: '00212345678901234567',
  };

  /**
   * Obtiene el perfil completo del transportista (empresa, representante, contacto).
   * @param ruc RUC del transportista
   */
  obtenerPerfil(ruc: string): Observable<PerfilTransportistaResponse> {
    if (!this.useMock) {
      return this.http.get<PerfilTransportistaResponse>(`${this.API_URL}/perfil`, {
        params: { ruc },
      });
    }

    this.mockPerfil.datosEmpresa.ruc = ruc || '20512345678';
    const mockResponse: PerfilTransportistaResponse = {
      data: {
        lista: {
          datosEmpresa: { ...this.mockPerfil.datosEmpresa },
          representanteLegal: { ...this.mockPerfil.representanteLegal },
          contacto: { ...this.mockPerfil.contacto },
        },
        respuesta: 'OK',
        mensaje: 'Detalle de perfil del transportista obtenido correctamente (mockup)',
      },
    };

    return of(mockResponse).pipe(delay(350));
  }

  /**
   * Actualiza los datos de contacto parcialmente editables.
   * @param payload Nuevos datos de contacto
   */
  actualizarContacto(
    ruc: string,
    payload: ActualizarContactoRequest,
  ): Observable<ActualizarContactoResponse> {
    if (!this.useMock) {
      return this.http.put<ActualizarContactoResponse>(
        `${this.API_URL}/perfil/contacto`,
        payload,
        { params: { ruc } },
      );
    }

    this.mockPerfil.datosEmpresa.ruc = ruc;
    this.mockPerfil.contacto = {
      ...this.mockPerfil.contacto,
      nombresApellidos: payload.nombresApellidos,
      tipoDocumento: payload.tipoDocumento ?? this.mockPerfil.contacto.tipoDocumento,
      numeroDocumento: payload.numeroDocumento ?? this.mockPerfil.contacto.numeroDocumento,
      telefono: payload.telefono,
    };

    return of({
      data: {
        lista: { ...this.mockPerfil.contacto },
        respuesta: 'OK',
        mensaje: 'Contacto actualizado correctamente',
      },
    }).pipe(delay(650));
  }

  /**
   * Obtiene la cuenta bancaria donde el transportista recibirá el subsidio.
   * GET /api_comprobante/perfil/cuenta-abono?ruc={ruc}
   */
  obtenerCuentaAbono(ruc: string): Observable<CuentaAbonoResponse> {
    if (!this.useMock) {
      return this.http.get<CuentaAbonoResponse>(
        `${this.API_URL}/perfil/cuenta-abono`,
        { params: { ruc } },
      );
    }

    return of({
      data: {
        lista: this.mockCuentaAbono ? { ...this.mockCuentaAbono } : null,
        respuesta: 'OK',
        mensaje: 'Detalle de cuenta de abono obtenido correctamente',
      },
    }).pipe(delay(450));
  }

  /**
   * Registra o actualiza la cuenta bancaria donde se recibirá el subsidio.
   * PUT /api_comprobante/perfil/cuenta-abono?ruc={ruc}
   */
  guardarCuentaAbono(
    ruc: string,
    payload: GuardarCuentaAbonoRequest,
  ): Observable<GuardarCuentaAbonoResponse> {
    if (!this.useMock) {
      return this.http.put<GuardarCuentaAbonoResponse>(
        `${this.API_URL}/perfil/cuenta-abono`,
        payload,
        { params: { ruc } },
      );
    }

    this.mockPerfil.datosEmpresa.ruc = ruc;
    this.mockCuentaAbono = { ...payload };

    return of({
      data: {
        lista: { ...this.mockCuentaAbono },
        respuesta: 'OK',
        mensaje: 'Cuenta de abono guardada correctamente',
      },
    }).pipe(delay(650));
  }

  // ── Catálogos: Bancos ─────────────────────────────────────
  /**
   * GET /api_comprobante/catalogos/bancos
   */
  obtenerBancos(): Observable<BancosResponse> {
    if (!this.useMock) {
      return this.http.get<BancosResponse>(`${this.API_URL}/catalogos/bancos`);
    }
    return of({
      data: {
        lista: [
          { uuidBanco: 'b1', codigo: '002', nombre: 'Banco de Crédito del Perú', abreviatura: 'BCP', permiteOpe: true },
          { uuidBanco: 'b2', codigo: '011', nombre: 'BBVA Perú', abreviatura: 'BBVA', permiteOpe: true },
          { uuidBanco: 'b3', codigo: '003', nombre: 'Interbank', abreviatura: 'IBK', permiteOpe: true },
          { uuidBanco: 'b4', codigo: '009', nombre: 'Scotiabank Perú', abreviatura: 'SCOTIA', permiteOpe: true },
          { uuidBanco: 'b5', codigo: '018', nombre: 'Banco de la Nación', abreviatura: 'BN', permiteOpe: false },
        ],
        respuesta: 'OK',
        mensaje: 'Bancos obtenidos correctamente (mock)',
      },
    }).pipe(delay(300));
  }

  // ── Cuenta Bancaria Transportista ────────────────────────

  /**
   * GET /api_comprobante/transportistas/{transportistaId}/cuenta-bancaria
   * Desencripta automáticamente los campos sensibles si vienen cifrados.
   */
  obtenerCuentaBancariaTransportista(transportistaId: number): Observable<CuentaBancariaTransportistaResponse> {
    if (!this.useMock) {
      return this.http.get<CuentaBancariaTransportistaResponse>(
        `${this.API_URL}/transportistas/${transportistaId}/cuenta-bancaria`
      ).pipe(
        map((res) => {
          if (res.data?.lista) {
            const item = res.data.lista;
            try {
              if (item.cci) item.cci = this.decryptionService.decrypt(item.cci);
              if (item.dniBeneficiario) item.dniBeneficiario = this.decryptionService.decrypt(item.dniBeneficiario);
              if (item.nombreBeneficiario) item.nombreBeneficiario = this.decryptionService.decrypt(item.nombreBeneficiario);
            } catch (err) {
              console.error('Error al desencriptar datos de cuenta bancaria:', err);
            }
          }
          return res;
        })
      );
    }

    return of({
      data: {
        lista: {
          uuidCuentaBancaria: 'cb-12345',
          transportistaId,
          uuidBanco: 'b1',
          tipoAbono: 'CCI',
          cci: '00212345678912345678',
          dniBeneficiario: null,
          nombreBeneficiario: null,
          estado: true,
        },
        respuesta: 'OK',
        mensaje: 'Cuenta bancaria obtenida correctamente (mock)',
      },
    }).pipe(delay(400));
  }

  /**
   * POST /api_comprobante/transportistas/{transportistaId}/cuenta-bancaria
   */
  registrarCuentaBancariaTransportista(
    transportistaId: number,
    payload: CuentaBancariaTransportistaRequest
  ): Observable<CuentaBancariaTransportistaResponse> {
    if (!this.useMock) {
      return this.http.post<CuentaBancariaTransportistaResponse>(
        `${this.API_URL}/transportistas/${transportistaId}/cuenta-bancaria`,
        payload
      );
    }
    return of({
      data: {
        lista: {
          uuidCuentaBancaria: 'cb-new-999',
          transportistaId,
          tipoAbono: payload.tipoAbonoId === 1 ? 'CCI' : 'OPE',
          cci: payload.cci,
          dniBeneficiario: payload.dniBeneficiario,
          nombreBeneficiario: payload.nombreBeneficiario,
          estado: true,
        },
        respuesta: 'OK',
        mensaje: 'Cuenta bancaria registrada correctamente (mock)',
      },
    }).pipe(delay(600));
  }

  /**
   * PUT /api_comprobante/transportistas/{transportistaId}/cuenta-bancaria
   */
  actualizarCuentaBancariaTransportista(
    transportistaId: number,
    payload: CuentaBancariaTransportistaRequest
  ): Observable<CuentaBancariaTransportistaResponse> {
    if (!this.useMock) {
      return this.http.put<CuentaBancariaTransportistaResponse>(
        `${this.API_URL}/transportistas/${transportistaId}/cuenta-bancaria`,
        payload
      );
    }
    return of({
      data: {
        lista: {
          uuidCuentaBancaria: 'cb-updated-999',
          transportistaId,
          tipoAbono: payload.tipoAbonoId === 1 ? 'CCI' : 'OPE',
          cci: payload.cci,
          dniBeneficiario: payload.dniBeneficiario,
          nombreBeneficiario: payload.nombreBeneficiario,
          estado: true,
        },
        respuesta: 'OK',
        mensaje: 'Cuenta bancaria actualizada correctamente (mock)',
      },
    }).pipe(delay(600));
  }

  /**
   * DELETE /api_comprobante/transportistas/{transportistaId}/cuenta-bancaria
   */
  eliminarCuentaBancariaTransportista(transportistaId: number): Observable<{ data: { respuesta: string; mensaje: string } }> {
    if (!this.useMock) {
      return this.http.delete<{ data: { respuesta: string; mensaje: string } }>(
        `${this.API_URL}/transportistas/${transportistaId}/cuenta-bancaria`
      );
    }
    return of({
      data: {
        respuesta: 'OK',
        mensaje: 'Cuenta bancaria eliminada correctamente (mock)',
      },
    }).pipe(delay(400));
  }

  // ── Módulo de Comprobantes de Combustible ─────────────────

  listarComprobantes(ruc: string, placa?: string, estado?: string, busqueda?: string): Observable<ApiResponse<ComprobanteListResponse[]>> {
    let params: any = { ruc };
    if (placa) params.placa = placa;
    if (estado && estado !== 'todos') params.estado = estado;
    if (busqueda) params.busqueda = busqueda;

    return this.http.get<ApiResponse<ComprobanteListResponse[]>>(`${this.API_URL}/comprobantes`, { params });
  }

  obtenerComprobante(comprobanteUuid: string): Observable<ApiResponse<ComprobanteResponse>> {
    return this.http.get<ApiResponse<ComprobanteResponse>>(`${this.API_URL}/comprobantes/${comprobanteUuid}`);
  }

  listarDistribuidores(ruc?: string): Observable<ApiResponse<DistribuidorResponse[]>> {
    let params: any = {};
    if (ruc) params.ruc = ruc;
    return this.http.get<ApiResponse<DistribuidorResponse[]>>(`${this.API_URL}/comprobantes/distribuidores`, { params });
  }

  listarVehiculosAsociados(ruc: string): Observable<ApiResponse<VehiculoAsociadoResponse[]>> {
    return this.http.get<ApiResponse<VehiculoAsociadoResponse[]>>(`${this.API_URL}/comprobantes/vehiculos-asociados`, { params: { ruc } });
  }

  listarTiposCombustible(): Observable<ApiResponse<TipoCombustibleResponse[]>> {
    return this.http.get<ApiResponse<TipoCombustibleResponse[]>>(`${this.API_URL}/comprobantes/tipos-combustible`);
  }

  listarEstados(): Observable<ApiResponse<EstadoComprobanteResponse[]>> {
    return this.http.get<ApiResponse<EstadoComprobanteResponse[]>>(`${this.API_URL}/comprobantes/estados`);
  }

  registrarComprobante(ruc: string, request: ComprobanteRequest, archivo: File): Observable<ApiResponse<string>> {
    const formData = new FormData();
    formData.append('request', JSON.stringify(request));
    formData.append('archivo', archivo);
    
    return this.http.post<ApiResponse<string>>(`${this.API_URL}/comprobantes`, formData, { params: { ruc } });
  }

  registrarComprobanteB(ruc: string, request: ComprobanteBRequest, archivo: File): Observable<ApiResponse<string>> {
    const formData = new FormData();
    formData.append('request', JSON.stringify(request));
    formData.append('archivo', archivo);
    
    return this.http.post<ApiResponse<string>>(`${this.API_URL}/comprobantes/granel`, formData, { params: { ruc } });
  }

  actualizarComprobante(comprobanteUuid: string, request: ActualizarComprobanteRequest): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.API_URL}/comprobantes/${comprobanteUuid}`, request);
  }

  eliminarComprobante(comprobanteUuid: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.API_URL}/comprobantes/${comprobanteUuid}`);
  }

  registrarNotaCredito(request: NotaCreditoRequest): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.API_URL}/comprobantes/notas-credito`, request);
  }
}
