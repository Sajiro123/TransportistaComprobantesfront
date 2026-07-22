import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  ActualizarContactoRequest,
  ActualizarContactoResponse,
  CuentaAbono,
  CuentaAbonoResponse,
  GuardarCuentaAbonoRequest,
  GuardarCuentaAbonoResponse,
  PerfilTransportista,
  PerfilTransportistaResponse,
} from '../models/models';

@Injectable({
  providedIn: 'root',
})
export class ApiComprobanteService {
  private readonly http = inject(HttpClient);
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
}
