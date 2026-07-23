import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize, forkJoin } from 'rxjs';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { VehiculoCargaComponent } from './vehiculo-carga/vehiculo-carga.component';
import { ApiVerificacionService } from '@core/services/api-verificacion.service';
import { ApiAuthService } from '@core/services/api-auth.service';
import { AuthService } from '@core/services/auth.service';
import {
  DatosTransportista,
  VerificacionServiceError,
  AutorizacionTransportista,
  SemaforoCondicion,
} from '@core/models/verificacion.models';

export interface StepItem {
  label: string;
  subtitle: string;
  icon: string;
}

export interface DatoTransportista {
  k: string;
  v: string;
}

export interface Autorizacion {
  servicio: string;
  estado: string;
  badgeSeverity: 'success' | 'warn' | 'danger' | 'secondary';
  resolucion: string;
  autoridad: string;
  ambito: string;
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
  private readonly auth = inject(AuthService);

  steps: StepItem[] = [
    {
      label: 'Verificación',
      subtitle: 'Paso 1',
      icon: 'fa-solid fa-shield-check',
    },
    { label: 'Vehículos', subtitle: 'Paso 2', icon: 'fa-solid fa-truck' },
  ];
  activeIndex = 0;

  // ── Datos del transportista ─────────────────────────────────
  datosTransportista: DatoTransportista[] = [];
  cargandoDatos = false;
  errorDatos = '';
  rucConsulta = '';
  actualizacionesDatosRestantes = 5;
  actualizacionesAutorizacionesRestantes = 5;
  actualizacionesVehiculosRestantes = 5;
  readonly usandoMocks = this.apiVerificacion.usandoMocks;
  private transportista: DatosTransportista | null = null;

  // ── Autorizaciones ──────────────────────────────────────────
  autorizaciones: Autorizacion[] = [];

  get autCount(): number {
    return (
      this.transportista?.totalAutorizaciones ?? this.autorizaciones.length
    );
  }

  // ── Semáforo de condiciones ─────────────────────────────────
  condiciones: Condicion[] = [];

  sinAutVigente = false; // true mostraría el banner de error

  ngOnInit() {
    this.cargarDatosTransportista();
  }

  cargarDatosTransportista(): void {
    const usuarioSesion =
      this.apiAuth.getUserFromSession() ?? this.auth.getSession();
    const rucSesion = usuarioSesion?.numDocumento || '';
    this.rucConsulta = this.usandoMocks ? '20512345678' : rucSesion;

    if (!this.rucConsulta) {
      this.errorDatos =
        'No se encontró el RUC del transportista en la sesión actual.';
      return;
    }

    this.cargandoDatos = true;
    this.errorDatos = '';

    forkJoin({
      datos: this.apiVerificacion.obtenerDatosTransportista(this.rucConsulta),
      autorizaciones: this.apiVerificacion.obtenerAutorizaciones(
        this.rucConsulta,
      ),
      semaforo: this.apiVerificacion.obtenerSemaforo(this.rucConsulta),
    })
      .pipe(finalize(() => (this.cargandoDatos = false)))
      .subscribe({
        next: ({ datos, autorizaciones, semaforo }) => {
          this.aplicarDatosTransportista(datos);
          this.aplicarAutorizaciones(autorizaciones);
          this.aplicarSemaforo(semaforo);
        },
        error: (error: VerificacionServiceError) => {
          this.errorDatos = error.descripcion || error.message;
        },
      });
  }

  actualizarSeccion(seccion: 'datos' | 'autorizaciones' | 'vehiculos'): void {
    if (this.actualizacionesDisponibles(seccion) === 0 || this.cargandoDatos)
      return;

    const usuarioSesion =
      this.apiAuth.getUserFromSession() ?? this.auth.getSession();
    const rucSesion = usuarioSesion?.numDocumento || '';
    this.rucConsulta = this.usandoMocks ? '20512345678' : rucSesion;

    if (!this.rucConsulta) {
      this.errorDatos =
        'No se encontró el RUC del transportista en la sesión actual.';
      return;
    }

    this.cargandoDatos = true;
    this.errorDatos = '';
    this.apiVerificacion
      .obtenerDatosTransportista(this.rucConsulta)
      .pipe(finalize(() => (this.cargandoDatos = false)))
      .subscribe({
        next: (datos) => {
          this.aplicarDatosTransportista(datos);
          this.descontarActualizacion(seccion);
        },
        error: (error: VerificacionServiceError) => {
          this.errorDatos = error.descripcion || error.message;
        },
      });
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
      { k: 'Razón social', v: datos.razonSocial },
      { k: 'RUC', v: datos.ruc },
      { k: 'Tipo', v: datos.tipoEntidad },
      { k: 'Estado del RUC', v: datos.estado },
      { k: 'Estado de habilitación', v: datos.estado },
    ];
  }

  private aplicarAutorizaciones(lista: AutorizacionTransportista[]): void {
    this.autorizaciones = lista.map((item) => {
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
    this.condiciones = lista.map((item) => {
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
