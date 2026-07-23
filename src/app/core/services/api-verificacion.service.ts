import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, delay, map, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '@env/environment';
import {
  DatosTransportista,
  DatosTransportistaResponse,
  VerificacionErrorResponse,
  VerificacionServiceError,
  AutorizacionTransportista,
  AutorizacionesResponse,
  SemaforoCondicion,
  SemaforoResponse,
} from '../models/verificacion.models';

const MOCK_DATOS_TRANSPORTISTA: DatosTransportistaResponse = {
  data: {
    lista: {
      id: 1,
      razonSocial: 'Transportes Lima Sur S.A.C.',
      ruc: '20512345678',
      tipoEntidad: 'Persona jurídica',
      estado: 'Habilitado',
      totalAutorizaciones: 3,
    },
    respuesta: 'OK',
    mensaje: 'Detalle de transportista obtenido correctamente',
  },
};

const MOCK_AUTORIZACIONES: AutorizacionesResponse = {
  data: {
    lista: [
      {
        id: 1,
        tipoTransporte: 'Transporte regular de personas',
        estado: 'Vigente',
        numeroResolucion: 'R.D. 0452-2024-ATU',
        autoridad: 'ATU',
        ambito: 'Lima Metropolitana',
        fechaInicioVigencia: '2024-03-15',
        fechaFinVigencia: '2029-03-14',
      },
      {
        id: 2,
        tipoTransporte: 'Transporte de trabajadores',
        estado: 'Vigente',
        numeroResolucion: 'R.D. 0871-2023-MPC',
        autoridad: 'Municipalidad Provincial del Callao',
        ambito: 'Callao',
        fechaInicioVigencia: '2023-08-01',
        fechaFinVigencia: '2027-07-31',
      },
      {
        id: 3,
        tipoTransporte: 'Transporte turístico',
        estado: 'Vencida',
        numeroResolucion: 'R.D. 1290-2022-MTC',
        autoridad: 'MTC',
        ambito: 'Nacional',
        fechaInicioVigencia: '2022-01-10',
        fechaFinVigencia: '2026-01-09',
      },
    ],
    respuesta: 'OK',
    mensaje: 'Se encontraron 3 autorizaciones',
  },
};

const MOCK_SEMAFORO: SemaforoResponse = {
  data: {
    lista: [
      {
        codigo: 'RUC_ACTIVO',
        nombre: 'RUC activo y habido',
        estado: 'CUMPLE',
        descripcion: 'Tu RUC figura en estado ACTIVO y con condición de domicilio HABIDO en SUNAT.',
        icono: 'CHECK',
        colorNombre: 'verde',
        colorHex: '#16A34A',
      },
      {
        codigo: 'AUTORIZACION_VIGENTE',
        nombre: 'Autorización de transporte vigente',
        estado: 'CUMPLE',
        descripcion: 'La ATU registra tu autorización como vigente a la fecha de la solicitud.',
        icono: 'CHECK',
        colorNombre: 'verde',
        colorHex: '#16A34A',
      },
      {
        codigo: 'VEHICULOS_HABILITADOS',
        nombre: 'Vehículos habilitados',
        estado: 'REVISAR',
        descripcion: 'Tienes 2 vehículo(s) observado(s): C4T-119, C4T-220.',
        icono: 'WARNING',
        colorNombre: 'amarillo',
        colorHex: '#EAB308',
      },
    ],
    respuesta: 'OK',
    mensaje: 'Se encontraron 3 condiciones',
  },
};

@Injectable({ providedIn: 'root' })
export class ApiVerificacionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.API_COMPROBANTE_URL.replace(/\/$/, '');

  readonly usandoMocks = environment.API_COMPROBANTE_MOCK;

  obtenerDatosTransportista(ruc: string): Observable<DatosTransportista> {
    if (this.usandoMocks) {
      return of(MOCK_DATOS_TRANSPORTISTA).pipe(
        delay(350),
        map(response => response.data.lista),
      );
    }

    if (!/^\d{11}$/.test(ruc)) {
      return throwError((): VerificacionServiceError => ({
        code: 'VER_RUC_INVALIDO',
        message: 'RUC inválido',
        descripcion: 'El RUC del transportista debe contener 11 dígitos.',
      }));
    }

    return this.http.get<DatosTransportistaResponse>(
      `${this.baseUrl}/verificacion/datos`,
      { params: { ruc } },
    ).pipe(
      map(response => response.data.lista),
      catchError(error => throwError(() => this.normalizarError(error))),
    );
  }

  obtenerAutorizaciones(ruc: string): Observable<AutorizacionTransportista[]> {
    if (this.usandoMocks) {
      return of(MOCK_AUTORIZACIONES).pipe(
        delay(350),
        map(response => response.data.lista),
      );
    }

    if (!/^\d{11}$/.test(ruc)) {
      return throwError((): VerificacionServiceError => ({
        code: 'VER_RUC_INVALIDO',
        message: 'RUC inválido',
        descripcion: 'El RUC del transportista debe contener 11 dígitos.',
      }));
    }

    return this.http.get<AutorizacionesResponse>(
      `${this.baseUrl}/verificacion/autorizaciones`,
      { params: { ruc } },
    ).pipe(
      map(response => response.data.lista),
      catchError(error => throwError(() => this.normalizarError(error))),
    );
  }

  obtenerSemaforo(ruc: string): Observable<SemaforoCondicion[]> {
    if (this.usandoMocks) {
      return of(MOCK_SEMAFORO).pipe(
        delay(350),
        map(response => response.data.lista),
      );
    }

    if (!/^\d{11}$/.test(ruc)) {
      return throwError((): VerificacionServiceError => ({
        code: 'VER_RUC_INVALIDO',
        message: 'RUC inválido',
        descripcion: 'El RUC del transportista debe contener 11 dígitos.',
      }));
    }

    return this.http.get<SemaforoResponse>(
      `${this.baseUrl}/verificacion/semaforo`,
      { params: { ruc } },
    ).pipe(
      map(response => response.data.lista),
      catchError(error => throwError(() => this.normalizarError(error))),
    );
  }

  private normalizarError(error: HttpErrorResponse): VerificacionServiceError {
    const response = error.error as VerificacionErrorResponse | undefined;
    const detalle = response?.data?.lista;

    if (detalle?.code) {
      return { ...detalle, status: error.status };
    }

    return {
      code: error.status === 0 ? 'NETWORK_ERROR' : `HTTP_${error.status || 500}`,
      message: error.status === 0 ? 'No se pudo conectar al servicio' : 'Error al procesar la solicitud',
      descripcion: error.status === 0
        ? 'Verifica que api_comprobante esté disponible y que la URL del entorno sea correcta.'
        : error.message || 'Ocurrió un error inesperado al procesar la solicitud.',
      status: error.status,
    };
  }
}
