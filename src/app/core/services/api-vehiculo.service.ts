import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError, timer } from 'rxjs';
import { delay, mergeMap } from 'rxjs/operators';

import { environment } from '@env/environment';
import {
  VehiculoTransportista,
  VehiculoDetalleResponse,
  VehiculoNoEncontrado,
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
  private readonly useMock = environment.API_COMPROBANTE_MOCK;

  private readonly mockVehiculos: VehiculoTransportista[] = [
    {
      id: 1,
      placa: 'AXG-712',
      categoria: 'M3',
      topeGalones: 1915.41,
      numeroAutorizacion: 'AUT-2024-01123',
      entidadAutorizadora: 'Municipalidad Metropolitana de Lima',
      tuc: 'T-084512',
      tucVencida: false,
      estadoValidacion: 'VALIDADO',
      propietario: {
        tipoDocumento: 'RUC',
        numeroDocumento: '20512345678',
        nombre: 'Transportes Lima Sur S.A.C.',
      },
      validaciones: [
        { campo: 'PLACA', estado: 'VALIDADO', entidadValidadora: 'MTC' },
        { campo: 'CARROCERIA', estado: 'VALIDADO', entidadValidadora: 'MTC' },
        { campo: 'TUC', estado: 'VALIDADO', entidadValidadora: 'MTC' },
        { campo: 'AUTORIZACION', estado: 'VALIDADO', entidadValidadora: 'Municipalidad Metropolitana de Lima' },
        { campo: 'PROPIETARIO', estado: 'VALIDADO', entidadValidadora: 'SUNAT / RENIEC' },
      ],
    },
    {
      id: 2,
      placa: 'B2W-458',
      categoria: 'N2',
      topeGalones: 888.45,
      numeroAutorizacion: 'AUT-2024-01124',
      entidadAutorizadora: 'Gobierno Regional de Lima',
      tuc: 'T-084513',
      tucVencida: false,
      estadoValidacion: 'EN_REVISION',
      propietario: {
        tipoDocumento: 'RUC',
        numeroDocumento: '20987654321',
        nombre: 'Transportes Callao Express S.A.C.',
      },
      validaciones: [
        { campo: 'PLACA', estado: 'EN_REVISION', entidadValidadora: 'MTC' },
        { campo: 'CARROCERIA', estado: 'EN_REVISION', entidadValidadora: 'MTC' },
        { campo: 'TUC', estado: 'VALIDADO', entidadValidadora: 'MTC' },
        { campo: 'AUTORIZACION', estado: 'EN_REVISION', entidadValidadora: 'Gobierno Regional de Lima' },
        { campo: 'PROPIETARIO', estado: 'EN_REVISION', entidadValidadora: 'SUNAT / RENIEC' },
      ],
    },
    {
      id: 3,
      placa: 'C4T-119',
      categoria: 'M2',
      topeGalones: 674.65,
      numeroAutorizacion: 'AUT-2023-00987',
      entidadAutorizadora: 'MTC',
      tuc: 'T-084514',
      tucVencida: true,
      estadoValidacion: 'RECHAZADO',
      propietario: {
        tipoDocumento: 'RUC',
        numeroDocumento: '20512345678',
        nombre: 'Transportes Lima Sur S.A.C.',
      },
      validaciones: [
        { campo: 'PLACA', estado: 'RECHAZADO', entidadValidadora: 'MTC' },
        { campo: 'CARROCERIA', estado: 'VALIDADO', entidadValidadora: 'MTC' },
        { campo: 'TUC', estado: 'RECHAZADO', entidadValidadora: 'MTC' },
        { campo: 'AUTORIZACION', estado: 'VALIDADO', entidadValidadora: 'MTC' },
        { campo: 'PROPIETARIO', estado: 'VALIDADO', entidadValidadora: 'SUNAT / RENIEC' },
      ],
    },
  ];

  listarVehiculos(filtros: VehiculosFiltros): Observable<VehiculosResponse> {
    if (!this.useMock) {
      let params = new HttpParams().set('ruc', filtros.ruc);
      if (filtros.busqueda) params = params.set('busqueda', filtros.busqueda);
      if (filtros.categoria) params = params.set('categoria', filtros.categoria);
      if (filtros.estado) params = params.set('estado', filtros.estado);

      return this.http.get<VehiculosResponse>(`${this.apiUrl}/vehiculos`, {
        params,
      });
    }

    const query = filtros.busqueda?.trim().toLowerCase() ?? '';
    const lista = this.mockVehiculos.filter((vehiculo) => {
      const matchesQuery =
        !query ||
        vehiculo.placa.toLowerCase().includes(query) ||
        vehiculo.tuc.toLowerCase().includes(query) ||
        vehiculo.numeroAutorizacion.toLowerCase().includes(query);
      const matchesCategory =
        !filtros.categoria || vehiculo.categoria === filtros.categoria;
      const matchesState =
        !filtros.estado || vehiculo.estadoValidacion === filtros.estado;

      return matchesQuery && matchesCategory && matchesState;
    });

    return of({
      data: {
        lista: lista.map((vehiculo) => ({
          ...vehiculo,
          propietario: { ...vehiculo.propietario },
          validaciones: vehiculo.validaciones.map((validacion) => ({ ...validacion })),
        })),
        respuesta: 'OK',
        mensaje: `Se encontraron ${lista.length} vehículos`,
      },
    }).pipe(delay(450));
  }

  /**
   * Obtiene el detalle y las validaciones de un vehículo.
   * GET /api_comprobante/vehiculos/{id}
   */
  obtenerVehiculoPorId(id: number): Observable<VehiculoDetalleResponse> {
    if (!this.useMock) {
      return this.http.get<VehiculoDetalleResponse>(`${this.apiUrl}/vehiculos/${id}`);
    }

    const vehiculo = this.mockVehiculos.find((item) => item.id === id);
    if (!vehiculo) {
      const errorBody: VehiculoNoEncontrado = {
        data: {
          lista: {
            code: 'VEH_004',
            message: 'Vehículo no encontrado',
            descripcion: `No existe vehículo con el ID: ${id}`,
          },
          respuesta: 'ERROR',
          mensaje: 'Vehículo no encontrado',
        },
      };

      return timer(350).pipe(
        mergeMap(() =>
          throwError(() => ({ status: 404, error: errorBody })),
        ),
      );
    }

    return of({
      data: {
        lista: {
          ...vehiculo,
          propietario: { ...vehiculo.propietario },
          validaciones: vehiculo.validaciones.map((validacion) => ({ ...validacion })),
        },
        respuesta: 'OK',
        mensaje: 'Detalle de vehículo obtenido correctamente',
      },
    }).pipe(delay(350));
  }

  /**
   * Registra un vehículo y sus datos de propietario.
   * POST /api_comprobante/vehiculos
   */
  registrarVehiculo(
    payload: RegistrarVehiculoRequest,
  ): Observable<RegistrarVehiculoResponse> {
    if (!this.useMock) {
      return this.http.post<RegistrarVehiculoResponse>(
        `${this.apiUrl}/vehiculos`,
        payload,
      );
    }

    const nuevoVehiculo: VehiculoTransportista = {
      id: Math.max(0, ...this.mockVehiculos.map((vehiculo) => vehiculo.id)) + 1,
      placa: payload.placa,
      categoria: payload.categoria,
      topeGalones: payload.topeGalones,
      numeroAutorizacion: payload.numeroAutorizacion,
      entidadAutorizadora: null,
      tuc: payload.tuc,
      tucVencida: false,
      estadoValidacion: 'EN_REVISION',
      propietario: {
        tipoDocumento: payload.propietarioTipoDocumento || 'RUC',
        numeroDocumento: payload.propietarioNumeroDocumento,
        nombre: payload.propietarioNombre || '',
      },
      validaciones: [
        { campo: 'PLACA', estado: 'EN_REVISION', entidadValidadora: 'MTC' },
        { campo: 'CARROCERIA', estado: 'EN_REVISION', entidadValidadora: 'MTC' },
        { campo: 'TUC', estado: 'EN_REVISION', entidadValidadora: 'MTC' },
        { campo: 'AUTORIZACION', estado: 'EN_REVISION', entidadValidadora: 'Pendiente' },
        { campo: 'PROPIETARIO', estado: 'EN_REVISION', entidadValidadora: 'SUNAT / RENIEC' },
      ],
    };

    this.mockVehiculos.unshift(nuevoVehiculo);

    return of({
      data: {
        lista: {
          ...nuevoVehiculo,
          propietario: { ...nuevoVehiculo.propietario },
          validaciones: nuevoVehiculo.validaciones.map((validacion) => ({ ...validacion })),
        },
        respuesta: 'OK',
        mensaje: 'Vehículo registrado correctamente',
      },
    }).pipe(delay(700));
  }

  /**
   * Actualiza un vehículo existente y reinicia su validación.
   * PUT /api_comprobante/vehiculos/{id}
   */
  actualizarVehiculo(
    id: number,
    payload: ActualizarVehiculoRequest,
  ): Observable<ActualizarVehiculoResponse> {
    if (!this.useMock) {
      return this.http.put<ActualizarVehiculoResponse>(
        `${this.apiUrl}/vehiculos/${id}`,
        payload,
      );
    }

    const index = this.mockVehiculos.findIndex((vehiculo) => vehiculo.id === id);
    if (index < 0) {
      const errorBody: VehiculoNoEncontrado = {
        data: {
          lista: {
            code: 'VEH_004',
            message: 'Vehículo no encontrado',
            descripcion: `No existe vehículo con el ID: ${id}`,
          },
          respuesta: 'ERROR',
          mensaje: 'Vehículo no encontrado',
        },
      };
      return timer(350).pipe(
        mergeMap(() => throwError(() => ({ status: 404, error: errorBody }))),
      );
    }

    const actual = this.mockVehiculos[index];
    const actualizado: VehiculoTransportista = {
      ...actual,
      placa: payload.placa,
      categoria: payload.categoria,
      topeGalones: payload.topeGalones,
      numeroAutorizacion: payload.numeroAutorizacion,
      tuc: payload.tuc,
      tucVencida: false,
      estadoValidacion: 'EN_REVISION',
      propietario: {
        tipoDocumento: payload.propietarioTipoDocumento || 'RUC',
        numeroDocumento: payload.propietarioNumeroDocumento,
        nombre: payload.propietarioNombre || '',
      },
      validaciones: [
        { campo: 'PLACA', estado: 'EN_REVISION', entidadValidadora: 'MTC' },
        { campo: 'CARROCERIA', estado: 'EN_REVISION', entidadValidadora: 'MTC' },
        { campo: 'TUC', estado: 'EN_REVISION', entidadValidadora: 'MTC' },
        { campo: 'AUTORIZACION', estado: 'EN_REVISION', entidadValidadora: actual.entidadAutorizadora || 'Pendiente' },
        { campo: 'PROPIETARIO', estado: 'EN_REVISION', entidadValidadora: 'SUNAT / RENIEC' },
      ],
    };
    this.mockVehiculos[index] = actualizado;

    return of({
      data: {
        lista: {
          ...actualizado,
          propietario: { ...actualizado.propietario },
          validaciones: actualizado.validaciones.map((validacion) => ({ ...validacion })),
        },
        respuesta: 'OK',
        mensaje: 'Vehículo actualizado correctamente',
      },
    }).pipe(delay(700));
  }

  /**
   * Elimina un vehículo registrado.
   * DELETE /api_comprobante/vehiculos/{id}
   */
  eliminarVehiculo(id: number): Observable<EliminarVehiculoResponse> {
    if (!this.useMock) {
      return this.http.delete<EliminarVehiculoResponse>(
        `${this.apiUrl}/vehiculos/${id}`,
      );
    }

    const index = this.mockVehiculos.findIndex((vehiculo) => vehiculo.id === id);
    if (index < 0) {
      const errorBody: VehiculoNoEncontrado = {
        data: {
          lista: {
            code: 'VEH_004',
            message: 'Vehículo no encontrado',
            descripcion: `No existe vehículo con el ID: ${id}`,
          },
          respuesta: 'ERROR',
          mensaje: 'Vehículo no encontrado',
        },
      };
      return timer(350).pipe(
        mergeMap(() => throwError(() => ({ status: 404, error: errorBody }))),
      );
    }

    this.mockVehiculos.splice(index, 1);
    return of({
      data: {
        lista: null,
        respuesta: 'OK' as const,
        mensaje: 'Vehículo eliminado correctamente',
      },
    }).pipe(delay(600));
  }
}
