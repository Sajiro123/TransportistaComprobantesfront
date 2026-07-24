import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { FormsModule } from '@angular/forms';
import { isValidRuc } from '../../../../core/utils/validators';
import { ApiVehiculoService } from '@core/services/api-vehiculo.service';
import { ApiAuthService } from '@core/services/api-auth.service';
import { AuthService } from '@core/services/auth.service';
import {
  EstadoValidacionVehiculo,
  RegistrarVehiculoRequest,
  VehiculoTransportista,
} from '@core/models/models';

export interface Vehiculo {
  id: string | number;
  cargaVehiculoUuid?: string;
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

interface VehicleFormModel extends Omit<
  RegistrarVehiculoRequest,
  'topeGalones'
> {
  topeGalones: number | null;
}

@Component({
  selector: 'app-vehiculo-carga',
  standalone: true,
  imports: [CommonModule, TableModule, TagModule, FormsModule],
  templateUrl: './vehiculo-carga.component.html',
  styleUrl: './vehiculo-carga.component.scss',
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
  isFetchingVehicleDetail = false;
  editingVehicleId: string | number | null = null;
  vehicleFormSubmitted = false;
  vehicleFormError = '';
  vehiclePendingDelete: Vehiculo | null = null;
  isDeletingVehicle = false;
  deleteVehicleError = '';
  private filterTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly apiVehiculoService = inject(ApiVehiculoService);
  private readonly apiAuthService = inject(ApiAuthService);
  private readonly authService = inject(AuthService);

  vehCatOpts = [{ value: '', label: 'Todas las categorías' }];

  vehValOpts = [{ value: '', label: 'Todos los estados' }];

  vehCreateCatOpts = [{ value: '', label: 'Seleccionar categoría...' }];

  newVehicle: VehicleFormModel = this.emptyVehicleForm();

  vehiclesView: Vehiculo[] = [];

  ngOnInit(): void {
    this.cargarCategorias();
    this.cargarVehiculos();
  }

  private cargarCategorias(): void {
    const cached = localStorage.getItem('sigt_vehiculo_categorias');
    if (cached) {
      try {
        const list = JSON.parse(cached);
        if (Array.isArray(list) && list.length > 0) {
          this.actualizarOpcionesCategorias(list);
          return;
        }
      } catch (e) {
        console.error('Error al parsear categorías guardadas:', e);
      }
    }

    this.apiVehiculoService.obtenerCategorias().subscribe({
      next: (res) => {
        const list = res?.data?.lista || res?.data || [];
        if (Array.isArray(list) && list.length > 0) {
          localStorage.setItem(
            'sigt_vehiculo_categorias',
            JSON.stringify(list),
          );
          this.actualizarOpcionesCategorias(list);
        }
      },
      error: (err) =>
        console.error('Error al cargar categorías vehiculares:', err),
    });
  }

  private actualizarOpcionesCategorias(list: any[]): void {
    this.vehCatOpts = [
      { value: '', label: 'Todas las categorías' },
      ...list.map((c) => ({
        value: c.codigo,
        label: `${c.codigo} · ${c.nombre}`,
      })),
    ];

    this.vehCreateCatOpts = [
      { value: '', label: 'Seleccionar categoría...' },
      ...list.map((c) => ({
        value: c.codigo,
        label: `${c.codigo} · ${c.nombre}${c.topeGalones ? ' (Tope: ' + c.topeGalones + ' gal)' : ''}`,
      })),
    ];
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
    this.isLoading = true;
    this.loadError = '';
    this.apiVehiculoService
      .listarVehiculos({
        busqueda: this.vehQ.trim() || undefined,
        categoria: this.vehCatF || undefined,
        estado: this.vehValF,
      })
      .subscribe({
        next: (response) => {
          this.vehiclesView = response.data.lista.map((vehiculo) =>
            this.toViewModel(vehiculo),
          );
          this.vehCount = this.vehiclesView.length;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('[VehiculoCarga] Error en cargarVehiculos:', error);
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
    const state = this.validationStyle(vehiculo?.estadoValidacion);
    const topeNum = Number(vehiculo?.topeGalones);
    const topeFmt = !isNaN(topeNum) ? topeNum.toFixed(2) : '0.00';
    const uuid = vehiculo?.cargaVehiculoUuid || (vehiculo as any)?.vehiculoUuid || vehiculo?.id;

    return {
      id: uuid,
      cargaVehiculoUuid: uuid ? String(uuid) : '',
      placa: vehiculo?.placa ?? '',
      categoria: vehiculo?.categoria ?? '',
      topeFmt: topeFmt,
      nHab: vehiculo?.numeroAutorizacion ?? '',
      autEntidad: vehiculo?.entidadAutorizadora ?? 'Pendiente',
      tuc: vehiculo?.tuc ?? '',
      tucVencida: vehiculo?.tucVencida,
      estadoBg: state.bg,
      estadoColor: state.fg,
      estadoGlyph: state.glyph,
      estadoLabel: state.label,
      propNom: vehiculo?.propietario?.nombre ?? vehiculo?.razonSocial ?? '',
      propTipo: vehiculo?.propietario?.tipoDocumento ?? vehiculo?.tipoDocumento ?? '',
      propDoc: vehiculo?.propietario?.numeroDocumento ?? vehiculo?.numeroDocumento ?? '',
      observed: vehiculo?.estadoValidacion !== 'VALIDADO',
      motivo: vehiculo?.tucVencida
        ? 'La TUC se encuentra vencida y requiere regularización.'
        : vehiculo?.estadoValidacion === 'RECHAZADO'
          ? 'El vehículo presenta validaciones rechazadas.'
          : 'El vehículo continúa en proceso de validación.',
      valChips: (vehiculo?.validaciones ?? []).map((validacion) => {
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

  private validationStyle(estado?: EstadoValidacionVehiculo) {
    if (estado === 'VALIDADO') {
      return {
        bg: 'var(--ok-bg)',
        fg: 'var(--ok)',
        glyph: '✓',
        label: 'Validado',
      };
    }
    if (estado === 'RECHAZADO') {
      return {
        bg: 'var(--bad-bg)',
        fg: 'var(--bad)',
        glyph: '×',
        label: 'Rechazado',
      };
    }
    return {
      bg: 'var(--warn-bg)',
      fg: 'var(--warn)',
      glyph: '!',
      label: 'En revisión',
    };
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
    this.isFetchingVehicleDetail = false;
    this.showVehicleModal = true;
  }

  openVedit(vehicle: Vehiculo): void {
    const uuid = vehicle.cargaVehiculoUuid || vehicle.id;
    this.editingVehicleId = uuid;
    this.newVehicle = this.emptyVehicleForm();
    this.vehicleFormSubmitted = false;
    this.vehicleFormError = '';
    this.showVehicleModal = true;

    if (uuid) {
      this.isFetchingVehicleDetail = true;
      this.apiVehiculoService.obtenerVehiculoPorId(uuid).subscribe({
        next: (response) => {
          this.isFetchingVehicleDetail = false;
          const detail = response?.data?.lista;
          if (detail) {
            const topeNum = Number(detail.topeGalones);
            this.newVehicle = {
              placa: this.formatPlate(detail.placa || ''),
              categoria: detail.categoria || '',
              topeGalones: !isNaN(topeNum) && topeNum > 0 ? topeNum : (Number(vehicle.topeFmt) || null),
              numeroAutorizacion: detail.numeroAutorizacion || '',
              tuc: detail.tuc || '',
              propietarioTipoDocumento: detail.tipoDocumento || detail.propietario?.tipoDocumento || 'RUC',
              propietarioNumeroDocumento: detail.numeroDocumento || detail.propietario?.numeroDocumento || '',
              propietarioNombre: detail.razonSocial || detail.propietario?.nombre || '',
            };
          }
        },
        error: (error) => {
          this.isFetchingVehicleDetail = false;
          console.error('[VehiculoCarga] Error al obtener detalle del vehículo para editar:', error);
          this.vehicleFormError = 'No fue posible cargar los datos del vehículo desde el servidor.';
        },
      });
    }
  }

  closeVehicleModal(): void {
    if (this.isCreatingVehicle) return;
    this.showVehicleModal = false;
    this.editingVehicleId = null;
    this.vehicleFormError = '';
  }

  onVehicleCodeInput(field: 'numeroAutorizacion' | 'tuc', event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    input.value = value;
    this.newVehicle[field] = value;
  }

  onVehiclePlateInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = this.formatPlate(input.value);
    input.value = value;
    this.newVehicle.placa = value;
  }

  onVehiclePlateKeydown(event: KeyboardEvent): void {
    const input = event.target as HTMLInputElement;
    const cursorAtMask = input.selectionStart === 4 && input.selectionEnd === 4;
    if (
      event.key !== 'Backspace' ||
      !cursorAtMask ||
      !/^[A-Z0-9]{3}-/.test(input.value)
    )
      return;

    event.preventDefault();
    const value = input.value.slice(0, 2);
    input.value = value;
    this.newVehicle.placa = value;
  }

  private formatPlate(value: string): string {
    const rawValue = String(value ?? '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6);
    return rawValue.length >= 3
      ? `${rawValue.slice(0, 3)}-${rawValue.slice(3)}`
      : rawValue;
  }

  onOwnerDocumentInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const documentType = this.newVehicle.propietarioTipoDocumento;
    const value =
      documentType === 'CE'
        ? input.value
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .slice(0, 12)
        : input.value
            .replace(/\D/g, '')
            .slice(0, documentType === 'DNI' ? 8 : 11);
    input.value = value;
    this.newVehicle.propietarioNumeroDocumento = value;
  }

  get ownerDocumentMaxLength(): number {
    if (this.newVehicle.propietarioTipoDocumento === 'DNI') return 8;
    if (this.newVehicle.propietarioTipoDocumento === 'CE') return 12;
    return 11;
  }

  get ownerDocumentInputMode(): 'numeric' | 'text' {
    return this.newVehicle.propietarioTipoDocumento === 'CE'
      ? 'text'
      : 'numeric';
  }

  get ownerDocumentPlaceholder(): string {
    if (this.newVehicle.propietarioTipoDocumento === 'DNI') return '12345678';
    if (this.newVehicle.propietarioTipoDocumento === 'CE') return 'ABC123456';
    return '20512345678';
  }

  get ownerDocumentHint(): string {
    if (this.newVehicle.propietarioTipoDocumento === 'DNI')
      return 'El DNI debe contener exactamente 8 dígitos.';
    if (this.newVehicle.propietarioTipoDocumento === 'CE')
      return 'El carné debe contener entre 9 y 12 letras o números.';
    return 'El RUC debe contener 11 dígitos e iniciar con 10, 15, 17 o 20.';
  }

  onOwnerDocumentTypeChange(): void {
    this.newVehicle.propietarioNumeroDocumento = '';
  }

  guardarVehiculo(): void {
    this.vehicleFormSubmitted = true;
    this.vehicleFormError = '';
    if (!this.isVehicleFormValid) return;

    const payload: RegistrarVehiculoRequest = {
      placa: this.formatPlate(this.newVehicle.placa),
      categoria: this.newVehicle.categoria,
      topeGalones: Number(this.newVehicle.topeGalones),
      numeroAutorizacion: this.newVehicle.numeroAutorizacion
        .trim()
        .toUpperCase(),
      tuc: this.newVehicle.tuc.trim().toUpperCase(),
      propietarioTipoDocumento: this.newVehicle.propietarioTipoDocumento,
      propietarioNumeroDocumento:
        this.newVehicle.propietarioNumeroDocumento.trim(),
      propietarioNombre: this.newVehicle.propietarioNombre?.trim() || undefined,
    };

    this.isCreatingVehicle = true;
    const request$ =
      this.editingVehicleId === null
        ? this.apiVehiculoService.registrarVehiculo(payload)
        : this.apiVehiculoService.actualizarVehiculo(
            this.editingVehicleId,
            payload,
          );

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
        console.error('[VehiculoCarga] Error en guardarVehiculo:', error);
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
    return (
      this.newVehicle.topeGalones !== null &&
      Number(this.newVehicle.topeGalones) > 0
    );
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
    this.apiVehiculoService
      .eliminarVehiculo(this.vehiclePendingDelete.id)
      .subscribe({
        next: (response) => {
          this.isDeletingVehicle = false;
          this.vehiclePendingDelete = null;
          this.actionMessage = response.data.mensaje;
          this.cargarVehiculos();
          setTimeout(() => (this.actionMessage = ''), 4500);
        },
        error: (error) => {
          console.error('[VehiculoCarga] Error en eliminarVehiculo:', error);
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
    if (this.newVehicle.propietarioTipoDocumento === 'DNI')
      return /^\d{8}$/.test(value);
    if (this.newVehicle.propietarioTipoDocumento === 'CE')
      return /^[A-Z0-9]{9,12}$/.test(value);
    return isValidRuc(value);
  }

  private emptyVehicleForm(): VehicleFormModel {
    return {
      placa: '',
      categoria: '',
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

    // El detalle ya viene completo de listarVehiculos (valChips, propietario, etc.)
    veh.expanded = true;
    veh.detailLoaded = true;
    veh.detailLoading = false;
    veh.detailError = '';
  }

  reintentarDetalle(veh: Vehiculo): void {
    veh.expanded = false;
    veh.detailLoaded = false;
    this.toggleRow(veh);
  }
}
