import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
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
  ApiResponse,
} from '../models/models';
import {
  crearComprobantesMock,
  MOCK_DISTRIBUIDORES,
  MOCK_ESTADOS_COMPROBANTE,
  MOCK_TIPOS_COMBUSTIBLE,
  MOCK_VEHICULOS,
} from '../mocks/comprobantes.mock';

@Injectable({
  providedIn: 'root',
})
export class ApiComprobanteService {
  private readonly http = inject(HttpClient);
  private readonly decryptionService = inject(FieldDecryptionForgeService);
  private readonly encryptionService = inject(FieldEncryptionService);
  private readonly API_URL = environment.API_COMPROBANTE_URL;
  private readonly comprobantesMockActivos = environment.API_COMPROBANTE_MOCK;
  private readonly comprobantesMock = crearComprobantesMock();
  private readonly distribuidoresMock = MOCK_DISTRIBUIDORES.map((item) => ({ ...item }));
  private readonly vehiculosMock = MOCK_VEHICULOS.map((item) => ({ ...item }));
  private readonly combustiblesMock = MOCK_TIPOS_COMBUSTIBLE.map((item) => ({ ...item }));
  private readonly estadosComprobanteMock = MOCK_ESTADOS_COMPROBANTE.map((item) => ({ ...item }));

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
    const encryptedPayload = {
      ...payload,
      cci: payload.cci
        ? this.encryptionService.encryptForRequest(payload.cci)
        : payload.cci,
    };
    return this.http.put<CuentaBancariaTransportistaResponse>(
      `${this.API_URL}/transportistas/cuenta-bancaria`,
      encryptedPayload,
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
    if (this.comprobantesMockActivos) {
      const termino = busqueda?.trim().toLocaleLowerCase('es') || '';
      const lista = this.comprobantesMock.filter((item) => {
        const coincidePlaca = !placa || item.placa === placa;
        const coincideEstado =
          !estado ||
          estado === 'todos' ||
          item.estadoComprobanteCodigo === estado;
        const coincideBusqueda =
          !termino ||
          [
            item.serie,
            item.numero,
            item.placa,
            item.rucDistribuidor,
            item.razonSocialDistribuidor,
          ]
            .filter(Boolean)
            .some((valor) =>
              String(valor).toLocaleLowerCase('es').includes(termino),
            );
        return coincidePlaca && coincideEstado && coincideBusqueda;
      });
      return this.respuestaMock(lista.map((item) => ({ ...item })));
    }

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
    if (this.comprobantesMockActivos) {
      const comprobante =
        this.comprobantesMock.find(
          (item) => item.comprobanteUuid === comprobanteUuid,
        ) || this.comprobantesMock[0];
      return this.respuestaMock({
        ...comprobante,
        archivos: comprobante.archivos.map((item) => ({ ...item })),
        detalle: comprobante.detalle.map((item) => ({ ...item })),
      });
    }
    return this.http.get<ApiResponse<ComprobanteResponse>>(
      `${this.API_URL}/comprobantes/${comprobanteUuid}`,
    );
  }

  listarDistribuidores(
    ruc?: string,
  ): Observable<ApiResponse<DistribuidorResponse[]>> {
    if (this.comprobantesMockActivos) {
      const lista = ruc
        ? this.distribuidoresMock.filter((item) => item.ruc.includes(ruc))
        : this.distribuidoresMock;
      return this.respuestaMock(lista.map((item) => ({ ...item })));
    }
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
    if (this.comprobantesMockActivos) {
      return this.respuestaMock(
        this.vehiculosMock.map((item) => ({ ...item })),
      );
    }
    return this.http.get<ApiResponse<VehiculoAsociadoResponse[]>>(
      `${this.API_URL}/comprobantes/vehiculos-asociados`,
      { params: { ruc } },
    );
  }

  listarTiposCombustible(): Observable<ApiResponse<TipoCombustibleResponse[]>> {
    if (this.comprobantesMockActivos) {
      return this.respuestaMock(
        this.combustiblesMock.map((item) => ({ ...item })),
      );
    }
    return this.http.get<ApiResponse<TipoCombustibleResponse[]>>(
      `${this.API_URL}/comprobantes/tipos-combustible`,
    );
  }

  listarEstados(): Observable<ApiResponse<EstadoComprobanteResponse[]>> {
    if (this.comprobantesMockActivos) {
      return this.respuestaMock(
        this.estadosComprobanteMock.map((item) => ({ ...item })),
      );
    }
    return this.http.get<ApiResponse<EstadoComprobanteResponse[]>>(
      `${this.API_URL}/comprobantes/estados`,
    );
  }

  listarAcumuladoVehiculos(ruc: string): Observable<ApiResponse<any[]>> {
    if (this.comprobantesMockActivos) {
      const lista = this.vehiculosMock.map((vehiculo) => ({
        placa: vehiculo.placa,
        galonesAcumulados: this.comprobantesMock
          .filter((item) => item.tipoComprobanteCodigo === 'FORMA_A')
          .flatMap((item) => item.detalle)
          .filter((detalle) => detalle.placa === vehiculo.placa)
          .reduce(
            (total, detalle) => total + Number(detalle.galonesAsignados || 0),
            0,
          ),
        topeGalones: vehiculo.topeGalones,
      }));
      return this.respuestaMock(lista);
    }
    return this.http.get<ApiResponse<any[]>>(
      `${this.API_URL}/comprobantes/acumulado-vehiculos`,
      { params: { ruc } },
    );
  }

  registrarComprobante(
    ruc: string,
    request: ComprobanteRequest,
    archivo: File,
  ): Observable<ApiResponse<string>> {
    if (this.comprobantesMockActivos) {
      const uuid = this.nuevoUuidMock('comp-a');
      this.comprobantesMock.unshift(
        this.crearComprobanteMock(
          uuid,
          'FORMA_A',
          request,
          archivo,
          request.placas,
        ),
      );
      return this.respuestaMock(uuid, 'Comprobante mock registrado.');
    }
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
    if (this.comprobantesMockActivos) {
      const uuid = this.nuevoUuidMock('comp-b');
      this.comprobantesMock.unshift(
        this.crearComprobanteMock(uuid, 'FORMA_B', request, archivo, []),
      );
      return this.respuestaMock(uuid, 'Compra a granel mock registrada.');
    }
    const formData = new FormData();
    formData.append('request', JSON.stringify(request));
    formData.append('archivo', archivo);

    return this.http.post<ApiResponse<string>>(
      `${this.API_URL}/comprobantes/b`,
      formData,
      { params: { ruc } },
    );
  }

  actualizarComprobante(
    comprobanteUuid: string,
    request: ActualizarComprobanteRequest,
  ): Observable<ApiResponse<any>> {
    if (this.comprobantesMockActivos) {
      const comprobante = this.comprobantesMock.find(
        (item) => item.comprobanteUuid === comprobanteUuid,
      );
      if (comprobante) {
        Object.assign(comprobante, {
          serie: request.serie ?? comprobante.serie,
          numero: request.numero ?? comprobante.numero,
          fechaEmision: request.fechaEmision ?? comprobante.fechaEmision,
          mes: request.mes ?? comprobante.mes,
          anio: request.anio ?? comprobante.anio,
          rucDistribuidor:
            request.rucDistribuidor ?? comprobante.rucDistribuidor,
          tipoCombustibleCodigo:
            request.tipoCombustibleCodigo ??
            comprobante.tipoCombustibleCodigo,
          azufrePpm: request.azufrePpm ?? comprobante.azufrePpm,
          galones: request.galones ?? comprobante.galones,
          costo: request.costo ?? comprobante.costo,
        });
      }
      return this.respuestaMock(
        { comprobanteUuid },
        'Comprobante mock actualizado.',
      );
    }
    return this.http.put<ApiResponse<any>>(
      `${this.API_URL}/comprobantes/${comprobanteUuid}`,
      request,
    );
  }

  eliminarComprobante(comprobanteUuid: string): Observable<ApiResponse<any>> {
    if (this.comprobantesMockActivos) {
      const indice = this.comprobantesMock.findIndex(
        (item) => item.comprobanteUuid === comprobanteUuid,
      );
      if (indice >= 0) this.comprobantesMock.splice(indice, 1);
      return this.respuestaMock(
        { comprobanteUuid },
        'Comprobante mock eliminado.',
      );
    }
    return this.http.delete<ApiResponse<any>>(
      `${this.API_URL}/comprobantes/${comprobanteUuid}`,
    );
  }

  registrarNotaCredito(
    request: NotaCreditoRequest,
  ): Observable<ApiResponse<any>> {
    if (this.comprobantesMockActivos) {
      const comprobante = this.comprobantesMock.find(
        (item) => item.comprobanteUuid === request.comprobanteUuid,
      );
      if (comprobante) {
        comprobante.tieneNotaCreditoActiva = true;
        comprobante.estadoComprobanteCodigo = 'INHABILITADO';
        comprobante.estadoComprobanteNombre = 'Inhabilitado';
        comprobante.colorSemaforo = 'ROJO';
        comprobante.colorHex = '#C53A3A';
      }
      return this.respuestaMock(
        { notaCreditoUuid: this.nuevoUuidMock('nc') },
        'Nota de crédito mock registrada.',
      );
    }
    return this.http.post<ApiResponse<any>>(
      `${this.API_URL}/comprobantes/nota-credito`,
      request,
    );
  }

  private crearComprobanteMock(
    uuid: string,
    tipo: 'FORMA_A' | 'FORMA_B',
    request: ComprobanteRequest | ComprobanteBRequest,
    archivo: File,
    placas: ComprobanteRequest['placas'],
  ): ComprobanteResponse {
    const distribuidor = this.distribuidoresMock.find(
      (item) => item.ruc === request.rucDistribuidor,
    );
    const detalles = placas.flatMap((placa, indice) => {
      const vehiculo = this.vehiculosMock.find(
        (item) => item.vehiculoUuid === placa.vehiculoUuid,
      );
      return vehiculo
        ? [
            {
              comprobanteDetalleUuid: `${uuid}-det-${indice + 1}`,
              placa: vehiculo.placa,
              categoriaCodigo: vehiculo.categoriaCodigo,
              esSubsidiable: vehiculo.esSubsidiable,
              galonesAsignados: Number(placa.galonesAsignados || 0),
            },
          ]
        : [];
    });
    const placaPrincipal = detalles[0]?.placa;
    return {
      comprobanteUuid: uuid,
      tipoComprobanteCodigo: tipo,
      tipoComprobanteNombre:
        tipo === 'FORMA_A' ? 'Surtido directo' : 'Consumidor directo',
      estadoComprobanteCodigo: 'PENDIENTE',
      estadoComprobanteNombre: 'Pendiente',
      colorSemaforo: 'AMARILLO',
      colorHex: '#D97706',
      serie: request.serie,
      numero: request.numero,
      fechaEmision: request.fechaEmision,
      mes: request.mes,
      anio: request.anio,
      placa: placaPrincipal,
      rucTransportista: '20123456789',
      razonSocialTransportista: 'Transportes Demo S.A.C.',
      rucDistribuidor: request.rucDistribuidor,
      razonSocialDistribuidor:
        request.distribuidorRazonSocial ||
        distribuidor?.razonSocial ||
        'Proveedor mayorista mock',
      nombreComercialDistribuidor:
        distribuidor?.nombreComercial || 'Proveedor mock',
      direccionDistribuidor:
        request.distribuidorDireccion || distribuidor?.direccion || '',
      departamentoDistribuidor:
        request.distribuidorDepartamento || distribuidor?.departamento || '',
      provinciaDistribuidor:
        request.distribuidorProvincia || distribuidor?.provincia || '',
      distritoDistribuidor:
        request.distribuidorDistrito || distribuidor?.distrito || '',
      tipoCombustibleCodigo: request.tipoCombustibleCodigo,
      tipoCombustibleNombre: request.tipoCombustibleCodigo,
      azufrePpm: Number(request.azufrePpm || 0),
      galones: Number(request.galones),
      costo: Number(request.costo || 0),
      tieneNotaCreditoActiva: false,
      validaSunat: false,
      validaOsinergmin: false,
      observacion: 'Registro mock pendiente de validación.',
      archivos: [
        {
          archivoUuid: `${uuid}-archivo`,
          nombreOriginal: archivo.name,
          tipoContenidoMime: archivo.type,
          tamanioBytes: archivo.size,
          tipoArchivo: 'COMPROBANTE',
          principal: true,
        },
      ],
      detalle: detalles,
    };
  }

  private nuevoUuidMock(prefijo: string): string {
    return `${prefijo}-mock-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  private respuestaMock<T>(
    lista: T,
    mensaje = 'Datos mock cargados correctamente.',
  ): Observable<ApiResponse<T>> {
    return of({
      data: {
        lista,
        respuesta: '1',
        mensaje,
      },
    }).pipe(delay(180));
  }
}
