import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { FormsModule } from '@angular/forms';
import { ApiVehiculoService } from '@core/services/api-vehiculo.service';
import { ApiAuthService } from '@core/services/api-auth.service';
import { AuthService } from '@core/services/auth.service';
import {
  EstadoValidacionVehiculo,
  RegistrarVehiculoRequest,
  VehiculoTransportista,
} from '@core/models/models';

export interface Vehiculo {
  id: number;
  placa: string;
  categoria: string;
  topeFmt: string;
  nHab: string;
  autEntidad: string;
  tuc: string;
  tucVencida?: boolean;
  estadoBg: string;
  estadoColor: string;
  estadoGlyph: string;
  estadoLabel: string;
  expanded?: boolean;
  propNom?: string;
  propTipo?: string;
  propDoc?: string;
  valChips?: any[];
  observed?: boolean;
  motivo?: string;
  detailLoaded?: boolean;
  detailLoading?: boolean;
  detailError?: string;
}

interface VehicleFormModel extends Omit<RegistrarVehiculoRequest, 'topeGalones'> {
  topeGalones: number | null;
}

@Component({
  selector: 'app-vehiculo-carga',
  standalone: true,
  imports: [CommonModule, TableModule, TagModule, FormsModule],
  templateUrl: './vehiculo-carga.component.html',
  styleUrl: './vehiculo-carga.component.scss'
})
export class VehiculoCargaComponent implements OnInit, OnDestroy {
  vehCount = 0;
  vehQ = '';
  vehCatF = '';
  vehValF: EstadoValidacionVehiculo | '' = '';
  isLoading = false;
  loadError = '';
  actionMessage = '';
  showVehicleModal = false;
  showValidationInfoModal = false;
  isCreatingVehicle = false;
  editingVehicleId: number | null = null;
  vehicleFormSubmitted = false;
  vehicleFormError = '';
  vehiclePendingDelete: Vehiculo | null = null;
  isDeletingVehicle = false;
  deleteVehicleError = '';
  private filterTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly apiVehiculoService = inject(ApiVehiculoService);
  private readonly apiAuthService = inject(ApiAuthService);
  private readonly authService = inject(AuthService);

  vehCatOpts = [
    { value: '', label: 'Todas las categorías' },
    { value: 'M2', label: 'M2' },
    { value: 'M3', label: 'M3' },
    { value: 'N2', label: 'N2' },
  ];

  vehValOpts = [
    { value: '', label: 'Todos los estados' },
    { value: 'VALIDADO', label: 'Validado' },
    { value: 'EN_REVISION', label: 'En revisión' },
    { value: 'RECHAZADO', label: 'Rechazado' },
  ];

  vehCreateCatOpts = [
    { value: 'M1', label: 'M1 · Auto/particular' },
    { value: 'M2', label: 'M2 · Minibús' },
    { value: 'M3', label: 'M3 · Bus' },
    { value: 'N1', label: 'N1 · Camioneta' },
    { value: 'N2', label: 'N2 · Camión mediano' },
    { value: 'N3', label: 'N3 · Camión pesado' },
  ];

  newVehicle: VehicleFormModel = this.emptyVehicleForm();

  vehiclesView: Vehiculo[] = [];

  ngOnInit(): void {
    this.cargarVehiculos();
  }

  ngOnDestroy(): void {
    if (this.filterTimer) clearTimeout(this.filterTimer);
  }

  onFiltersChange(): void {
    if (this.filterTimer) clearTimeout(this.filterTimer);
    this.filterTimer = setTimeout(() => this.cargarVehiculos(), 300);
  }

  limpiarFiltros(): void {
    this.vehQ = '';
    this.vehCatF = '';
    this.vehValF = '';
    this.cargarVehiculos();
  }

  cargarVehiculos(): void {
    const ruc =
      this.apiAuthService.getUserFromSession()?.numDocumento ||
      this.authService.getSession()?.numDocumento ||
      '20512345678';

    this.isLoading = true;
    this.loadError = '';
    this.apiVehiculoService.listarVehiculos({
      ruc,
      busqueda: this.vehQ.trim() || undefined,
      categoria: this.vehCatF || undefined,
      estado: this.vehValF,
    }).subscribe({
      next: (response) => {
        this.vehiclesView = response.data.lista.map((vehiculo) =>
          this.toViewModel(vehiculo),
        );
        this.vehCount = this.vehiclesView.length;
        this.isLoading = false;
      },
      error: (error) => {
        this.vehiclesView = [];
        this.vehCount = 0;
        this.isLoading = false;
        this.loadError =
          error?.error?.data?.mensaje ||
          error?.error?.mensaje ||
          error?.message ||
          'No fue posible cargar los vehículos.';
      },
    });
  }

  private toViewModel(vehiculo: VehiculoTransportista): Vehiculo {
    const state = this.validationStyle(vehiculo.estadoValidacion);
    return {
      id: vehiculo.id,
      placa: vehiculo.placa,
      categoria: vehiculo.categoria,
      topeFmt: vehiculo.topeGalones.toFixed(2),
      nHab: vehiculo.numeroAutorizacion,
      autEntidad: vehiculo.entidadAutorizadora ?? 'Pendiente',
      tuc: vehiculo.tuc,
      tucVencida: vehiculo.tucVencida,
      estadoBg: state.bg,
      estadoColor: state.fg,
      estadoGlyph: state.glyph,
      estadoLabel: state.label,
      propNom: vehiculo.propietario.nombre,
      propTipo: vehiculo.propietario.tipoDocumento,
      propDoc: vehiculo.propietario.numeroDocumento,
      observed: vehiculo.estadoValidacion !== 'VALIDADO',
      motivo: vehiculo.tucVencida
        ? 'La TUC se encuentra vencida y requiere regularización.'
        : vehiculo.estadoValidacion === 'RECHAZADO'
          ? 'El vehículo presenta validaciones rechazadas.'
          : 'El vehículo continúa en proceso de validación.',
      valChips: vehiculo.validaciones.map((validacion) => {
        const validationState = this.validationStyle(validacion.estado);
        return {
          label: this.validationFieldLabel(validacion.campo),
          bg: validationState.bg,
          fg: validationState.fg,
          glyph: validationState.glyph,
          statusLabel: validationState.label,
          entidad: validacion.entidadValidadora,
        };
      }),
    };
  }

  private validationStyle(estado: EstadoValidacionVehiculo) {
    if (estado === 'VALIDADO') {
      return { bg: 'var(--ok-bg)', fg: 'var(--ok)', glyph: '✓', label: 'Validado' };
    }
    if (estado === 'RECHAZADO') {
      return { bg: 'var(--bad-bg)', fg: 'var(--bad)', glyph: '×', label: 'Rechazado' };
    }
    return { bg: 'var(--warn-bg)', fg: 'var(--warn)', glyph: '!', label: 'En revisión' };
  }

  private validationFieldLabel(campo: string): string {
    const labels: Record<string, string> = {
      PLACA: 'Placa',
      CARROCERIA: 'Carrocería',
      TUC: 'TUC',
      AUTORIZACION: 'Autorización',
      PROPIETARIO: 'Propietario',
    };
    return labels[campo] ?? campo;
  }

  openBulk() {}
  openVadd(): void {
    this.newVehicle = this.emptyVehicleForm();
    this.vehicleFormSubmitted = false;
    this.vehicleFormError = '';
    this.editingVehicleId = null;
    this.showVehicleModal = true;
  }

  openVedit(vehicle: Vehiculo): void {
    this.editingVehicleId = vehicle.id;
    this.newVehicle = {
      placa: vehicle.placa,
      categoria: vehicle.categoria,
      topeGalones: Number(vehicle.topeFmt),
      numeroAutorizacion: vehicle.nHab,
      tuc: vehicle.tuc,
      propietarioTipoDocumento: vehicle.propTipo || 'RUC',
      propietarioNumeroDocumento: vehicle.propDoc || '',
      propietarioNombre: vehicle.propNom || '',
    };
    this.vehicleFormSubmitted = false;
    this.vehicleFormError = '';
    this.showVehicleModal = true;
  }

  closeVehicleModal(): void {
    if (this.isCreatingVehicle) return;
    this.showVehicleModal = false;
    this.editingVehicleId = null;
    this.vehicleFormError = '';
  }

  onVehicleCodeInput(
    field: 'placa' | 'numeroAutorizacion' | 'tuc',
    event: Event,
  ): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    input.value = value;
    this.newVehicle[field] = value;
  }

  onOwnerDocumentInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const documentType = this.newVehicle.propietarioTipoDocumento;
    const value = documentType === 'CE'
      ? input.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)
      : input.value.replace(/\D/g, '').slice(0, documentType === 'DNI' ? 8 : 11);
    input.value = value;
    this.newVehicle.propietarioNumeroDocumento = value;
  }

  onOwnerDocumentTypeChange(): void {
    this.newVehicle.propietarioNumeroDocumento = '';
  }

  guardarVehiculo(): void {
    this.vehicleFormSubmitted = true;
    this.vehicleFormError = '';
    if (!this.isVehicleFormValid) return;

    const payload: RegistrarVehiculoRequest = {
      placa: this.newVehicle.placa.trim().toUpperCase(),
      categoria: this.newVehicle.categoria,
      topeGalones: Number(this.newVehicle.topeGalones),
      numeroAutorizacion: this.newVehicle.numeroAutorizacion.trim().toUpperCase(),
      tuc: this.newVehicle.tuc.trim().toUpperCase(),
      propietarioTipoDocumento: this.newVehicle.propietarioTipoDocumento,
      propietarioNumeroDocumento: this.newVehicle.propietarioNumeroDocumento.trim(),
      propietarioNombre: this.newVehicle.propietarioNombre?.trim() || undefined,
    };

    this.isCreatingVehicle = true;
    const request$ = this.editingVehicleId === null
      ? this.apiVehiculoService.registrarVehiculo(payload)
      : this.apiVehiculoService.actualizarVehiculo(this.editingVehicleId, payload);

    request$.subscribe({
      next: (response) => {
        this.isCreatingVehicle = false;
        this.showVehicleModal = false;
        this.editingVehicleId = null;
        this.actionMessage = response.data.mensaje;
        this.limpiarFiltros();
        setTimeout(() => (this.actionMessage = ''), 4500);
      },
      error: (error) => {
        this.isCreatingVehicle = false;
        this.vehicleFormError =
          error?.error?.data?.lista?.descripcion ||
          error?.error?.data?.mensaje ||
          error?.error?.mensaje ||
          error?.message ||
          'No fue posible registrar el vehículo.';
      },
    });
  }

  get isVehicleFormValid(): boolean {
    return Boolean(
      this.isValidPlate &&
      this.newVehicle.categoria &&
      this.isValidGallons &&
      this.isValidAuthorization &&
      this.isValidTuc &&
      this.isValidOwnerDocument,
    );
  }

  get isEditingVehicle(): boolean {
    return this.editingVehicleId !== null;
  }

  get isValidGallons(): boolean {
    return this.newVehicle.topeGalones !== null &&
      Number(this.newVehicle.topeGalones) > 0;
  }

  openDeleteConfirmation(vehicle: Vehiculo): void {
    this.vehiclePendingDelete = vehicle;
    this.deleteVehicleError = '';
  }

  closeDeleteConfirmation(): void {
    if (this.isDeletingVehicle) return;
    this.vehiclePendingDelete = null;
    this.deleteVehicleError = '';
  }

  eliminarVehiculo(): void {
    if (!this.vehiclePendingDelete) return;

    this.isDeletingVehicle = true;
    this.deleteVehicleError = '';
    this.apiVehiculoService.eliminarVehiculo(this.vehiclePendingDelete.id).subscribe({
      next: (response) => {
        this.isDeletingVehicle = false;
        this.vehiclePendingDelete = null;
        this.actionMessage = response.data.mensaje;
        this.cargarVehiculos();
        setTimeout(() => (this.actionMessage = ''), 4500);
      },
      error: (error) => {
        this.isDeletingVehicle = false;
        this.deleteVehicleError =
          error?.error?.data?.lista?.descripcion ||
          error?.error?.data?.mensaje ||
          error?.error?.mensaje ||
          error?.message ||
          'No fue posible eliminar el vehículo.';
      },
    });
  }

  get isValidPlate(): boolean {
    return /^[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(this.newVehicle.placa);
  }

  get isValidAuthorization(): boolean {
    return /^AUT-\d{4}-\d{5}$/.test(this.newVehicle.numeroAutorizacion);
  }

  get isValidTuc(): boolean {
    return /^T-\d{6}$/.test(this.newVehicle.tuc);
  }

  get isValidOwnerDocument(): boolean {
    const value = this.newVehicle.propietarioNumeroDocumento;
    if (this.newVehicle.propietarioTipoDocumento === 'DNI') return /^\d{8}$/.test(value);
    if (this.newVehicle.propietarioTipoDocumento === 'CE') return /^[A-Z0-9]{9,12}$/.test(value);
    return /^\d{11}$/.test(value);
  }

  private emptyVehicleForm(): VehicleFormModel {
    return {
      placa: '',
      categoria: 'M1',
      topeGalones: null,
      numeroAutorizacion: '',
      tuc: '',
      propietarioTipoDocumento: 'RUC',
      propietarioNumeroDocumento: '',
      propietarioNombre: '',
    };
  }
  openValInfo(): void {
    this.showValidationInfoModal = true;
  }

  closeValidationInfo(): void {
    this.showValidationInfoModal = false;
  }
  
  toggleRow(veh: Vehiculo): void {
    if (veh.expanded) {
      veh.expanded = false;
      return;
    }

    veh.expanded = true;
    if (veh.detailLoaded) return;

    veh.detailLoading = true;
    veh.detailError = '';
    this.apiVehiculoService.obtenerVehiculoPorId(veh.id).subscribe({
      next: (response) => {
        const detail = this.toViewModel(response.data.lista);
        Object.assign(veh, detail, {
          expanded: true,
          detailLoaded: true,
          detailLoading: false,
          detailError: '',
        });
      },
      error: (error) => {
        veh.detailLoading = false;
        veh.detailError =
          error?.error?.data?.lista?.descripcion ||
          error?.error?.data?.mensaje ||
          error?.message ||
          'No fue posible obtener el detalle del vehículo.';
      },
    });
  }

  reintentarDetalle(veh: Vehiculo): void {
    veh.expanded = false;
    veh.detailLoaded = false;
    this.toggleRow(veh);
  }
}
