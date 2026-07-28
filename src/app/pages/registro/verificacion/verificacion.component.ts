import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize, forkJoin, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { VehiculoCargaComponent } from './vehiculo-carga/vehiculo-carga.component';
import { ApiVerificacionService } from '@core/services/api-verificacion.service';
import { ApiAuthService } from '@core/services/api-auth.service';
import {
  DatosTransportista,
  VerificacionServiceError,
  AutorizacionTransportista,
  SemaforoCondicion,
  AutorizacionesData,
} from '@core/models/verificacion.models';

export interface DatoTransportista {
  k: string;
  v: string;
}

export interface Autorizacion {
  servicio: string;
  estado: string;
  badgeSeverity: 'success' | 'warn' | 'danger' | 'secondary';
  resolucion: string;
  autoridad: string | null;
  ambito: string | null;
  vigencia: string;
}

export interface Condicion {
  glyph: string;
  label: string;
  estado: string;
  estadoColor: 'success' | 'warn' | 'danger';
  barColor: string;
  why: string;
}

@Component({
  selector: 'app-verificacion',
  standalone: true,
  imports: [CommonModule, TableModule, TagModule],
  templateUrl: './verificacion.component.html',
  styleUrl: './verificacion.component.scss',
})
export class VerificacionComponent implements OnInit {
  private readonly apiVerificacion = inject(ApiVerificacionService);
  private readonly apiAuth = inject(ApiAuthService);

  // ── Datos del transportista ─────────────────────────────────
  datosTransportista: DatoTransportista[] = [];
  cargandoDatos = false;
  cargandoAutorizaciones = false;
  errorDatos = '';
  rucConsulta = '';
  actualizacionesDatosRestantes = 5;
  actualizacionesAutorizacionesRestantes = 5;
  actualizacionesVehiculosRestantes = 5;
  showValidationInfoModal = false;
  transportista: DatosTransportista | null = null;
  private originalSemaforoList: SemaforoCondicion[] = [];

  // ── Autorizaciones ──────────────────────────────────────────
  autorizaciones: Autorizacion[] = [];

  get autCount(): number {
    return (
      this.transportista?.totalAutorizaciones ?? this.autorizaciones.length
    );
  }

  getDatoVal(key: string): string {
    return (
      this.datosTransportista.find(
        (d) => d.k.toLowerCase().trim() === key.toLowerCase().trim(),
      )?.v || '—'
    );
  }

  // ── Semáforo de condiciones ─────────────────────────────────
  condiciones: Condicion[] = [];

  sinAutVigente = false; // true mostraría el banner de error

  ngOnInit() {
    this.cargarDatosTransportista();
  }

  openValidationInfo(): void {
    this.showValidationInfoModal = true;
  }

  closeValidationInfo(): void {
    this.showValidationInfoModal = false;
  }

  cargarDatosTransportista(): void {
    const usuarioSesion = this.apiAuth.getUserFromSession();
    const rucSesion = usuarioSesion?.ruc || '';
    this.rucConsulta = rucSesion;

    if (!this.rucConsulta) {
      this.errorDatos =
        'No se encontró el RUC del transportista en la sesión actual.';
      return;
    }

    this.cargandoDatos = true;
    this.cargandoAutorizaciones = true;
    this.errorDatos = '';

    forkJoin({
      datos: this.apiVerificacion.obtenerDatosTransportista(this.rucConsulta).pipe(
        catchError((error: VerificacionServiceError) => {
          this.errorDatos = error.descripcion || error.message;
          return of(null);
        })
      ),
      autorizaciones: this.apiVerificacion.obtenerAutorizaciones(this.rucConsulta).pipe(
        catchError(() => of({ totalAutorizaciones: 0, totalAtu: 0, totalMtc: 0, autorizaciones: [] } as AutorizacionesData))
      ),
      semaforo: this.apiVerificacion.obtenerSemaforo(this.rucConsulta).pipe(
        catchError(() => of([]))
      ),
    })
      .pipe(
        finalize(() => {
          this.cargandoDatos = false;
          this.cargandoAutorizaciones = false;
        })
      )
      .subscribe({
        next: ({ datos, autorizaciones, semaforo }) => {
          if (datos) this.aplicarDatosTransportista(datos);
          this.aplicarAutorizaciones(autorizaciones.autorizaciones);
          this.aplicarSemaforo(semaforo);
        },
      });
  }

  actualizarSeccion(seccion: 'datos' | 'autorizaciones' | 'vehiculos'): void {
    if (this.actualizacionesDisponibles(seccion) === 0 || this.cargandoDatos || this.cargandoAutorizaciones)
      return;

    const usuarioSesion = this.apiAuth.getUserFromSession();
    const rucSesion = usuarioSesion?.ruc || '';
    this.rucConsulta = rucSesion;

    if (!this.rucConsulta) {
      this.errorDatos =
        'No se encontró el RUC del transportista en la sesión actual.';
      return;
    }

    this.errorDatos = '';
    if (seccion === 'datos') {
      this.cargandoDatos = true;
      this.apiVerificacion
        .obtenerDatosTransportista(this.rucConsulta)
        .pipe(finalize(() => (this.cargandoDatos = false)))
        .subscribe({
          next: (datos) => {
            this.aplicarDatosTransportista(datos);
            this.descontarActualizacion(seccion);
            this.aplicarSemaforo(this.originalSemaforoList);
          },
          error: (error: VerificacionServiceError) => {
            this.errorDatos = error.descripcion || error.message;
          },
        });
    } else if (seccion === 'autorizaciones') {
      this.cargandoAutorizaciones = true;
      this.apiVerificacion
        .obtenerAutorizaciones(this.rucConsulta)
        .pipe(finalize(() => (this.cargandoAutorizaciones = false)))
        .subscribe({
          next: (datos) => {
            this.aplicarAutorizaciones(datos.autorizaciones);
            this.descontarActualizacion(seccion);
            this.aplicarSemaforo(this.originalSemaforoList);
          },
          error: (error: VerificacionServiceError) => {
            this.errorDatos = error.descripcion || error.message;
          },
        });
    } else {
      // Logic for vehicle updating if needed
    }
  }

  private actualizacionesDisponibles(
    seccion: 'datos' | 'autorizaciones' | 'vehiculos',
  ): number {
    if (seccion === 'datos') return this.actualizacionesDatosRestantes;
    if (seccion === 'autorizaciones')
      return this.actualizacionesAutorizacionesRestantes;
    return this.actualizacionesVehiculosRestantes;
  }

  private descontarActualizacion(
    seccion: 'datos' | 'autorizaciones' | 'vehiculos',
  ): void {
    if (seccion === 'datos') {
      this.actualizacionesDatosRestantes = Math.max(
        0,
        this.actualizacionesDatosRestantes - 1,
      );
    } else if (seccion === 'autorizaciones') {
      this.actualizacionesAutorizacionesRestantes = Math.max(
        0,
        this.actualizacionesAutorizacionesRestantes - 1,
      );
    } else {
      this.actualizacionesVehiculosRestantes = Math.max(
        0,
        this.actualizacionesVehiculosRestantes - 1,
      );
    }
  }

  private aplicarDatosTransportista(datos: DatosTransportista): void {
    this.transportista = datos;
    this.datosTransportista = [
      { k: 'RUC', v: datos.ruc },
      { k: 'Razón social', v: datos.razonSocial },
      { k: 'Tipo de entidad', v: datos.tipoEntidad },
      { k: 'Estado', v: datos.estado },
      { k: 'Total de autorizaciones', v: String(datos.totalAutorizaciones) },
    ];
  }

  private aplicarAutorizaciones(lista: AutorizacionTransportista[]): void {
    this.autorizaciones = (lista || []).map((item) => {
      let severity: 'success' | 'warn' | 'danger' | 'secondary' = 'secondary';
      const est = item.estado.toLowerCase().trim();
      if (est === 'vigente') {
        severity = 'success';
      } else if (est === 'vencida') {
        severity = 'danger';
      }

      // Formato fecha: YYYY-MM-DD -> DD/MM/YYYY
      const fmtFecha = (f: string) => {
        if (!f) return '';
        const parts = f.split('-');
        if (parts.length === 3) {
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return f;
      };

      const vigenciaFmt =
        item.fechaInicioVigencia && item.fechaFinVigencia
          ? `${fmtFecha(item.fechaInicioVigencia)} – ${fmtFecha(item.fechaFinVigencia)}`
          : '';

      return {
        servicio: item.tipoTransporte,
        estado: item.estado,
        badgeSeverity: severity,
        resolucion: item.numeroResolucion,
        autoridad: item.autoridad,
        ambito: item.ambito,
        vigencia: vigenciaFmt,
      };
    });

    this.sinAutVigente = !this.autorizaciones.some(
      (a) => a.badgeSeverity === 'success',
    );
  }

  private aplicarSemaforo(lista: SemaforoCondicion[]): void {
    this.originalSemaforoList = lista || [];

    let finalLista = this.originalSemaforoList;
    if (finalLista.length === 0) {
      const rucCumple = this.transportista ? (this.transportista.activoSunat && this.transportista.habidoSunat) : false;
      const autCumple = this.autorizaciones.length > 0 && !this.sinAutVigente;
      const vehiculosCumple = rucCumple && autCumple;

      finalLista = [
        {
          codigo: 'RUC',
          nombre: 'RUC activo y habido',
          estado: rucCumple ? 'CUMPLE' : 'NO_CUMPLE',
          descripcion: rucCumple
            ? 'El RUC del transportista se encuentra activo y habido en los registros de SUNAT.'
            : 'El RUC del transportista debe estar activo y habido para continuar con la solicitud.',
          icono: rucCumple ? 'CHECK' : 'ERROR',
          colorNombre: rucCumple ? 'success' : 'danger',
          colorHex: rucCumple ? '#15803d' : '#e53e3e'
        },
        {
          codigo: 'AUTORIZACION',
          nombre: 'Autorización de transporte vigente',
          estado: autCumple ? 'CUMPLE' : 'NO_CUMPLE',
          descripcion: autCumple
            ? 'El transportista cuenta con al menos una autorización de transporte vigente.'
            : 'El transportista no registra autorizaciones vigentes en las fuentes oficiales.',
          icono: autCumple ? 'CHECK' : 'ERROR',
          colorNombre: autCumple ? 'success' : 'danger',
          colorHex: autCumple ? '#15803d' : '#e53e3e'
        },
        {
          codigo: 'VEHICULOS',
          nombre: 'Vehículos habilitados',
          estado: vehiculosCumple ? 'REVISAR' : 'NO_CUMPLE',
          descripcion: vehiculosCumple
            ? 'Verifique los vehículos asociados en la sección inferior.'
            : 'No es posible verificar los vehículos si el RUC o la autorización de transporte no cumplen.',
          icono: vehiculosCumple ? 'WARNING' : 'ERROR',
          colorNombre: vehiculosCumple ? 'warn' : 'danger',
          colorHex: vehiculosCumple ? '#b45309' : '#e53e3e'
        }
      ];
    }

    this.condiciones = finalLista.map((item) => {
      let glyph = '✓';
      if (item.icono === 'WARNING') {
        glyph = '!';
      } else if (item.icono === 'ERROR') {
        glyph = '✗';
      }

      let color: 'success' | 'warn' | 'danger' = 'success';
      if (item.estado === 'REVISAR') {
        color = 'warn';
      } else if (item.estado === 'NO_CUMPLE') {
        color = 'danger';
      }

      return {
        glyph,
        label: item.nombre,
        estado: item.estado,
        estadoColor: color,
        barColor: item.colorHex || 'var(--secondary)',
        why: item.descripcion,
      };
    });
  }
}
