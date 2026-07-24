import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  VehiculoDetalleResponse,
  RegistrarVehiculoRequest,
  RegistrarVehiculoResponse,
  ActualizarVehiculoRequest,
  ActualizarVehiculoResponse,
  EliminarVehiculoResponse,
  VehiculosFiltros,
  VehiculosResponse,
} from '../models/models';

@Injectable({ providedIn: 'root' })
export class ApiVehiculoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.API_COMPROBANTE_URL;

  listarVehiculos(filtros: VehiculosFiltros): Observable<VehiculosResponse> {
    let params = new HttpParams();
    if (filtros.busqueda) params = params.set('busqueda', filtros.busqueda);
    if (filtros.categoria) params = params.set('categoria', filtros.categoria);
    if (filtros.estado) params = params.set('estado', filtros.estado);

    return this.http.get<VehiculosResponse>(`${this.apiUrl}/vehiculos`, {
      params,
    });
  }

  /**
   * Obtiene el detalle y las validaciones de un vehículo.
   * GET /api_comprobante/vehiculos/{cargaVehiculoUuid}
   */
  obtenerVehiculoPorId(id: string | number): Observable<VehiculoDetalleResponse> {
    return this.http.get<VehiculoDetalleResponse>(`${this.apiUrl}/vehiculos/${id}`);
  }

  /**
   * Registra un vehículo y sus datos de propietario.
   * POST /api_comprobante/vehiculos
   */
  registrarVehiculo(
    payload: RegistrarVehiculoRequest,
  ): Observable<RegistrarVehiculoResponse> {
    return this.http.post<RegistrarVehiculoResponse>(
      `${this.apiUrl}/vehiculos`,
      payload,
    );
  }

  /**
   * Actualiza un vehículo existente y reinicia su validación.
   * PUT /api_comprobante/vehiculos/{cargaVehiculoUuid}
   */
  actualizarVehiculo(
    id: string | number,
    payload: ActualizarVehiculoRequest,
  ): Observable<ActualizarVehiculoResponse> {
    return this.http.put<ActualizarVehiculoResponse>(
      `${this.apiUrl}/vehiculos/${id}`,
      payload,
    );
  }

  /**
   * Elimina un vehículo registrado.
   * DELETE /api_comprobante/vehiculos/{cargaVehiculoUuid}
   */
  eliminarVehiculo(id: string | number): Observable<EliminarVehiculoResponse> {
    return this.http.delete<EliminarVehiculoResponse>(
      `${this.apiUrl}/vehiculos/${id}`,
    );
  }

  /**
   * Obtiene la lista de categorías vehiculares disponibles.
   * GET /api_comprobante/vehiculos/categorias
   */
  obtenerCategorias(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/vehiculos/categorias`);
  }
  /**
   * Carga masiva de vehículos vía Excel.
   * POST /api_comprobante/vehiculos/excel
   */
  cargarMasivoExcel(archivo: File): Observable<any> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return this.http.post<any>(`${this.apiUrl}/vehiculos/excel`, formData);
  }

  /**
   * Consulta el Padrón Nacional ATU.
   * GET /api_comprobante/vehiculos/padron
   */
  consultarPadron(ruc: string, buscar?: string): Observable<any> {
    let params = new HttpParams().set('ruc', ruc);
    if (buscar) params = params.set('buscar', buscar);
    return this.http.get<any>(`${this.apiUrl}/vehiculos/padron`, { params });
  }
}
