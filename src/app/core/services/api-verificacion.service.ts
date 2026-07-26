import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, throwError } from 'rxjs';
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

@Injectable({ providedIn: 'root' })
export class ApiVerificacionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.API_COMPROBANTE_URL.replace(/\/$/, '');

  obtenerDatosTransportista(ruc: string): Observable<DatosTransportista> {
    if (!/^\d{11}$/.test(ruc)) {
      return throwError(
        (): VerificacionServiceError => ({
          code: 'VER_RUC_INVALIDO',
          message: 'RUC inválido',
          descripcion: 'El RUC del transportista debe contener 11 dígitos.',
        }),
      );
    }

    return this.http
      .get<DatosTransportistaResponse>(`${this.baseUrl}/verificacion/datos`, {
        params: { ruc },
      })
      .pipe(
        map((response) => response.data.lista),
        catchError((error) => throwError(() => this.normalizarError(error))),
      );
  }

  obtenerAutorizaciones(ruc: string): Observable<AutorizacionTransportista[]> {
    if (!/^\d{11}$/.test(ruc)) {
      return throwError(
        (): VerificacionServiceError => ({
          code: 'VER_RUC_INVALIDO',
          message: 'RUC inválido',
          descripcion: 'El RUC del transportista debe contener 11 dígitos.',
        }),
      );
    }

    return this.http
      .get<AutorizacionesResponse>(
        `${this.baseUrl}/verificacion/autorizaciones`,
        { params: { ruc } },
      )
      .pipe(
        map((response) => response.data.lista),
        catchError((error) => throwError(() => this.normalizarError(error))),
      );
  }

  obtenerSemaforo(ruc: string): Observable<SemaforoCondicion[]> {
    if (!/^\d{11}$/.test(ruc)) {
      return throwError(
        (): VerificacionServiceError => ({
          code: 'VER_RUC_INVALIDO',
          message: 'RUC inválido',
          descripcion: 'El RUC del transportista debe contener 11 dígitos.',
        }),
      );
    }

    return this.http
      .get<SemaforoResponse>(`${this.baseUrl}/verificacion/semaforo`, {
        params: { ruc },
      })
      .pipe(
        map((response) => response.data.lista),
        catchError((error) => throwError(() => this.normalizarError(error))),
      );
  }

  private normalizarError(error: HttpErrorResponse): VerificacionServiceError {
    const response = error.error as VerificacionErrorResponse | undefined;
    const detalle = response?.data?.lista;

    if (detalle?.code) {
      return { ...detalle, status: error.status };
    }

    return {
      code:
        error.status === 0 ? 'NETWORK_ERROR' : `HTTP_${error.status || 500}`,
      message:
        error.status === 0
          ? 'No se pudo conectar al servicio'
          : 'Error al procesar la solicitud',
      descripcion:
        error.status === 0
          ? 'Verifica que api_comprobante esté disponible y que la URL del entorno sea correcta.'
          : error.message ||
            'Ocurrió un error inesperado al procesar la solicitud.',
      status: error.status,
    };
  }
}
