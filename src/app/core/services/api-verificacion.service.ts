import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '@env/environment';
import { FieldDecryptionForgeService } from './field-decryption-forge.service';
import {
  DatosTransportista,
  DatosTransportistaResponse,
  VerificacionErrorResponse,
  VerificacionServiceError,
  AutorizacionesData,
  AutorizacionesResponse,
  SemaforoCondicion,
  SemaforoResponse,
} from '../models/verificacion.models';

@Injectable({ providedIn: 'root' })
export class ApiVerificacionService {
  private readonly http = inject(HttpClient);
  private readonly decryptionService = inject(FieldDecryptionForgeService);
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
        map((response) => {
          const item = response.data.lista;
          if (item) {
            try {
              if (item.razonSocial) item.razonSocial = this.decryptionService.decrypt(item.razonSocial) || '';
              if (item.ruc) item.ruc = this.decryptionService.decrypt(item.ruc) || '';
              if (item.tipoEntidad) item.tipoEntidad = this.decryptionService.decrypt(item.tipoEntidad) || '';
            } catch (err) {
              console.error('Error al desencriptar datos de transportista:', err);
            }
          }
          return item;
        }),
        catchError((error) => throwError(() => this.normalizarError(error))),
      );
  }

  obtenerAutorizaciones(ruc: string): Observable<AutorizacionesData> {
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
        map((response) => {
          const data = response.data?.lista;
          if (data && data.autorizaciones) {
            data.autorizaciones.forEach(item => {
              try {
                if (item.tipoTransporte) item.tipoTransporte = this.decryptionService.decrypt(item.tipoTransporte) || '';
                if (item.numeroResolucion) item.numeroResolucion = this.decryptionService.decrypt(item.numeroResolucion) || '';
                if (item.autoridad) item.autoridad = this.decryptionService.decrypt(item.autoridad);
                if (item.tipoEntidad) item.tipoEntidad = this.decryptionService.decrypt(item.tipoEntidad);
                if (item.ambito) item.ambito = this.decryptionService.decrypt(item.ambito);
              } catch (err) {
                console.error('Error al desencriptar autorización:', err);
              }
            });
          }
          return data;
        }),
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
