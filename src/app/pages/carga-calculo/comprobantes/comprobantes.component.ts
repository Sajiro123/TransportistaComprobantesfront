import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { isValidRuc } from '../../../core/utils/validators';
import { ApiComprobanteService } from '../../../core/services/api-comprobante.service';
import { ApiAuthService } from '../../../core/services/api-auth.service';
import {
  ComprobanteListResponse,
  ComprobanteRequest,
  ComprobanteBRequest,
  DistribuidorResponse,
  VehiculoAsociadoResponse,
  TipoCombustibleResponse,
  EstadoComprobanteResponse,
  ComprobantePlacaRequest,
  ComprobanteDetalleRequest,
} from '../../../core/models/models';
import Swal from 'sweetalert2';
type EstadoFiltro = 'todos' | 'val' | 'pend' | 'obs';

type Forma = 'A' | 'B';

interface Comprobante {
  id: number;
  numero: string;
  fecha: string;
  placa: string;
  conductor: string;
  grifo: string;
  ubicacion: string;
  combustible: string;
  ppm: number;
  galones: number;
  estado: Exclude<EstadoFiltro, 'todos'>;
  estadoLabel: string;
  estadoIcon: string;
  tipoDocumento?: 'DNI' | 'CE';
  numeroDocumento?: string;
  licencia?: string;
  mes?: string;
  rucGrifo?: string;
  direccion?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
}

interface AcumuladoVehiculo {
  placa: string;
  consumido: number;
  tope: number;
}

interface CompraMayorista {
  id: number;
  numero: string;
  distribuidor: string;
  ruc: string;
  combustible: string;
  ppm: number;
  galones: number;
}

interface VehiculoAbastecido {
  placa: string;
  subsidiable: boolean;
}

interface ComprobanteEditor {
  id: number;
  placa: string;
  conductor: string;
  tipoDocumento: 'DNI' | 'CE';
  numeroDocumento: string;
  licencia: string;
  serie: string;
  numero: string;
  emision: string;
  mes: string;
  rucGrifo: string;
  razonSocial: string;
  direccion: string;
  departamento: string;
  provincia: string;
  distrito: string;
  combustible: string;
  ppm: number;
  galones: number;
}

@Component({
  selector: 'app-comprobantes',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule],
  templateUrl: './comprobantes.component.html',
  styleUrl: './comprobantes.component.scss',
})
export class ComprobantesComponent implements OnInit {
  private readonly apiComprobante = inject(ApiComprobanteService);
  private readonly apiAuth = inject(ApiAuthService);

  rucTransportista = '';

  forma: Forma = 'A';
  busqueda = '';
  estadoFiltro = 'todos';

  // Data from backend
  comprobantes: ComprobanteListResponse[] = [];
  distribuidores: DistribuidorResponse[] = [];
  vehiculos: VehiculoAsociadoResponse[] = [];
  tiposCombustible: TipoCombustibleResponse[] = [];
  estados: EstadoComprobanteResponse[] = [];
  comprasMayorista: any[] = []; // Not covered in the 11 endpoints yet, keeping empty

  // Editor models
  editorModo: 'crear' | 'editar' = 'editar';
  editorError = '';
  editorSubmitted = false;
  readonly todayDate = this.formatLocalDate(new Date());
  editor: any = null;
  archivoSeleccionado: File | null = null;
  archivoError = '';
  isFileDragging = false;
  placaBusqueda = '';

  comprobantePendienteEliminar: ComprobanteListResponse | null = null;

  // Dummy arrays para Forma B (UI original los usaba)
  acumulados: any[] = [];
  vehiculosAbastecidos: any[] = [];

  ngOnInit() {
    const user = this.apiAuth.getUserFromSession();
    if (user && user.numDocumento) {
      this.rucTransportista = user.numDocumento;
      this.cargarCatalogos();
      this.listarComprobantes();
    } else {
      Swal.fire(
        'Error',
        'No se pudo obtener el RUC del transportista. Inicie sesión nuevamente.',
        'error',
      );
    }
  }

  cargarCatalogos() {
    this.apiComprobante.listarTiposCombustible().subscribe((res) => {
      if (res.data?.lista) this.tiposCombustible = res.data.lista;
    });
    this.apiComprobante.listarEstados().subscribe((res) => {
      if (res.data?.lista) this.estados = res.data.lista;
    });
    this.apiComprobante
      .listarVehiculosAsociados(this.rucTransportista)
      .subscribe((res) => {
        if (res.data?.lista) {
          this.vehiculos = res.data.lista;
          this.calcularAcumuladosYAbastecidos();
        }
      });
    this.apiComprobante.listarDistribuidores().subscribe((res) => {
      if (res.data?.lista) this.distribuidores = res.data.lista;
    });
  }

  listarComprobantes() {
    this.apiComprobante
      .listarComprobantes(
        this.rucTransportista,
        undefined,
        this.estadoFiltro === 'todos' ? undefined : this.estadoFiltro,
        this.busqueda ? this.busqueda : undefined,
      )
      .subscribe({
        next: (res) => {
          if (res.data?.lista) {
            this.comprobantes = res.data.lista;
          } else {
            this.comprobantes = [];
          }
        },
        error: () => {
          Swal.fire(
            'Error',
            'No se pudieron cargar los comprobantes.',
            'error',
          );
          this.comprobantes = [];
        },
      });
  }

  get comprobantesFiltrados(): ComprobanteListResponse[] {
    const termino = this.busqueda.trim().toLocaleLowerCase('es');

    return this.comprobantes.filter((c) => {
      const coincideEstado =
        this.estadoFiltro === 'todos' ||
        c.estadoComprobanteCodigo === this.estadoFiltro;
      if (!coincideEstado) return false;
      if (!termino) return true;

      const contenido = [
        c.numero,
        c.placa,
        c.nombreComercialDistribuidor,
        c.distritoDistribuidor,
        c.tipoCombustibleCodigo,
      ]
        .join(' ')
        .toLocaleLowerCase('es');

      return contenido.includes(termino);
    });
  }

  // --- Helpers UI Form B ---
  calcularAcumuladosYAbastecidos() {
    this.acumulados = this.vehiculos.map((v) => ({
      placa: v.placa,
      consumido: 0,
      tope: v.topeGalones,
    }));
    this.vehiculosAbastecidos = this.vehiculos.map((v) => ({
      placa: v.placa,
      subsidiable: v.esSubsidiable,
    }));
  }

  porcentaje(item: any): number {
    if (!item.tope) return 0;
    return Math.min((item.consumido / item.tope) * 100, 100);
  }

  get totalGalonesMayorista(): number {
    return this.comprasMayorista.reduce(
      (total, compra) => total + compra.galones,
      0,
    );
  }

  get cantidadSubsidiables(): number {
    return this.vehiculosAbastecidos.filter((v) => v.subsidiable).length;
  }

  get factorProrrateo(): number {
    return this.vehiculosAbastecidos.length
      ? this.cantidadSubsidiables / this.vehiculosAbastecidos.length
      : 0;
  }

  get galonesSubsidiados(): number {
    return this.totalGalonesMayorista * this.factorProrrateo;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.validarArchivo(file);
    input.value = '';
  }

  onFileDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isFileDragging = true;
  }

  onFileDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isFileDragging = false;
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.isFileDragging = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) this.validarArchivo(file);
  }

  quitarArchivo(): void {
    this.archivoSeleccionado = null;
    this.archivoError = '';
  }

  private validarArchivo(file: File): void {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    const maxSize = 5 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      this.archivoSeleccionado = null;
      this.archivoError = 'Selecciona un archivo PDF o una imagen JPG/PNG.';
      return;
    }

    if (file.size > maxSize) {
      this.archivoSeleccionado = null;
      this.archivoError = 'El comprobante no puede superar los 5 MB.';
      return;
    }

    this.archivoSeleccionado = file;
    this.archivoError = '';
  }

  // --- Editor ---

  abrirRegistro(): void {
    this.editorModo = 'crear';
    this.placaBusqueda = '';
    this.archivoSeleccionado = null;
    this.archivoError = '';
    this.editor = {
      uuid: '',
      placa: '',
      conductor: '',
      tipoDocumento: 'DNI',
      numeroDocumento: '',
      licencia: '',
      serie: 'F001',
      numero: '',
      emision: '',
      mes: '',
      anio: new Date().getFullYear(),
      rucGrifo: '',
      razonSocial: '',
      direccion: '',
      departamento: '',
      provincia: '',
      distrito: '',
      combustible: 'B5',
      ppm: 45,
      costo: 0,
      galones: 0,
    };
    this.editorError = '';
  }

  abrirConfirmacionEliminar(comprobante: ComprobanteListResponse): void {
    this.comprobantePendienteEliminar = comprobante;
  }

  cerrarConfirmacionEliminar(): void {
    this.comprobantePendienteEliminar = null;
  }

  confirmarEliminarComprobante(): void {
    if (!this.comprobantePendienteEliminar) return;
    const uuid = this.comprobantePendienteEliminar.comprobanteUuid;
    this.comprobantes = this.comprobantes.filter(
      (comprobante) => comprobante.comprobanteUuid !== uuid,
    );
    this.comprobantePendienteEliminar = null;
  }

  abrirEditor(item: ComprobanteListResponse): void {
    this.apiComprobante.obtenerComprobante(item.comprobanteUuid).subscribe({
      next: (res) => {
        if (res.data?.lista) {
          const c = res.data.lista;
          this.editorModo = 'editar';
          this.placaBusqueda = '';
          this.archivoSeleccionado = null;
          this.archivoError = '';

          let p = '';
          if (c.tipoComprobanteCodigo === 'FORMA_A') {
            p =
              c.placa ||
              (c.detalle && c.detalle.length > 0 ? c.detalle[0].placa : '');
          }

          this.editor = {
            uuid: c.comprobanteUuid,
            placa: p,
            conductor: '', // No viene en el DTO
            tipoDocumento: 'DNI',
            numeroDocumento: '',
            licencia: '',
            serie: c.serie,
            numero: c.numero,
            emision: c.fechaEmision,
            mes: c.mes,
            anio: c.anio,
            rucGrifo: c.rucDistribuidor,
            razonSocial: c.razonSocialDistribuidor,
            direccion: '',
            departamento: '',
            provincia: '',
            distrito: c.distritoDistribuidor,
            combustible: c.tipoCombustibleCodigo,
            ppm: c.azufrePpm,
            costo: 0, // Ajustar segun DTO si viene
            galones: c.galones,
          };
          this.editorError = '';
        }
      },
      error: () =>
        Swal.fire(
          'Error',
          'No se pudo cargar el detalle del comprobante.',
          'error',
        ),
    });
  }

  cerrarEditor(): void {
    this.editor = null;
    this.placaBusqueda = '';
    this.editorError = '';
    this.editorSubmitted = false;
    this.archivoSeleccionado = null;
    this.archivoError = '';
  }

  get vehiculosFiltradosPorPlaca(): VehiculoAsociadoResponse[] {
    const search = this.placaBusqueda.trim().toLocaleUpperCase('es');
    if (search.length < 3) return this.vehiculos;

    return this.vehiculos.filter((vehiculo) =>
      vehiculo.placa.toLocaleUpperCase('es').includes(search),
    );
  }

  get editorDocumentoMaxLength(): number {
    return this.editor?.tipoDocumento === 'DNI' ? 8 : 12;
  }

  get editorDocumentoInputMode(): 'numeric' | 'text' {
    return this.editor?.tipoDocumento === 'DNI' ? 'numeric' : 'text';
  }

  get editorDocumentoHint(): string {
    return this.editor?.tipoDocumento === 'DNI'
      ? 'El DNI debe contener exactamente 8 dígitos.'
      : 'El carné debe contener entre 9 y 12 letras o números.';
  }

  get isEditorDocumentoValid(): boolean {
    if (!this.editor) return false;
    const value = this.editor.numeroDocumento.trim();
    return this.editor.tipoDocumento === 'DNI'
      ? /^\d{8}$/.test(value)
      : /^[A-Z0-9]{9,12}$/.test(value);
  }

  onEditorTipoDocumentoChange(): void {
    if (!this.editor) return;
    this.editor.numeroDocumento = '';
  }

  onEditorNumeroDocumentoInput(event: Event): void {
    if (!this.editor) return;
    const input = event.target as HTMLInputElement;
    const value =
      this.editor.tipoDocumento === 'DNI'
        ? input.value.replace(/\D/g, '').slice(0, 8)
        : input.value
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .slice(0, 12);
    input.value = value;
    this.editor.numeroDocumento = value;
  }

  get isEditorLicenseValid(): boolean {
    return !!this.editor && /^[A-Z]\d{8}$/.test(this.editor.licencia.trim());
  }

  get isEditorInvoiceSeriesValid(): boolean {
    return !!this.editor && /^F\d{3}$/.test(this.editor.serie.trim());
  }

  get isEditorInvoiceNumberValid(): boolean {
    return !!this.editor && /^\d{1,8}$/.test(this.editor.numero.trim());
  }

  get isEditorEmissionValid(): boolean {
    if (!this.editor || !/^\d{4}-\d{2}-\d{2}$/.test(this.editor.emision))
      return false;
    const [year, month, day] = this.editor.emision.split('-').map(Number);
    const selectedDate = new Date(`${this.editor.emision}T00:00:00`);
    const isRealDate =
      !Number.isNaN(selectedDate.getTime()) &&
      selectedDate.getFullYear() === year &&
      selectedDate.getMonth() + 1 === month &&
      selectedDate.getDate() === day;
    return isRealDate && this.editor.emision <= this.todayDate;
  }

  get isEditorMonthValid(): boolean {
    return (
      !!this.editor &&
      !!this.editor.mes &&
      this.editor.mes === this.mesDesdeFecha(this.editor.emision)
    );
  }

  get isEditorStationRucValid(): boolean {
    return !!this.editor && isValidRuc(this.editor.rucGrifo.trim());
  }

  onEditorLicenseInput(event: Event): void {
    if (!this.editor) return;
    const input = event.target as HTMLInputElement;
    const upperValue = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const firstCharacter = upperValue.charAt(0).replace(/[^A-Z]/g, '');
    const value = `${firstCharacter}${upperValue.slice(1).replace(/\D/g, '').slice(0, 8)}`;
    input.value = value;
    this.editor.licencia = value;
  }
  onEditorInvoiceSeriesInput(event: Event): void {
    if (!this.editor) return;
    const input = event.target as HTMLInputElement;
    const digits = input.value
      .toUpperCase()
      .replace(/^F/, '')
      .replace(/\D/g, '')
      .slice(0, 3);
    const value = input.value ? `F${digits}` : '';
    input.value = value;
    this.editor.serie = value;
  }

  onEditorInvoiceNumberInput(event: Event): void {
    if (!this.editor) return;
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '').slice(0, 8);
    input.value = value;
    this.editor.numero = value;
  }

  onEditorEmissionChange(): void {
    if (!this.editor) return;
    if (this.editor.emision > this.todayDate)
      this.editor.emision = this.todayDate;
    this.editor.mes = this.mesDesdeFecha(this.editor.emision);
  }

  onEditorStationRucInput(event: Event): void {
    if (!this.editor) return;
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '').slice(0, 11);
    input.value = value;
    this.editor.rucGrifo = value;
  }

  guardarEditor(): void {
    if (!this.editor) return;
    this.editorSubmitted = true;

    const modelo = this.editor;
    if (
      !modelo.placa ||
      !modelo.numero.trim() ||
      !modelo.galones ||
      modelo.galones <= 0
    ) {
      this.editorError =
        'Completa la placa, el número de factura y una cantidad válida de galones.';
      return;
    }

    const datosComprobante = {
      numero: `${modelo.serie.trim() || 'F001'}-${modelo.numero.trim()}`,
      fecha: modelo.emision,
      placa: modelo.placa,
      conductor: modelo.conductor.trim(),
      grifo: modelo.razonSocial.trim() || 'Estación pendiente de validación',
      ubicacion:
        [modelo.distrito, modelo.departamento].filter(Boolean).join(', ') ||
        'Ubicación pendiente',
      combustible: modelo.combustible,
      ppm: Number(modelo.ppm),
      galones: Number(modelo.galones),
      tipoDocumento: modelo.tipoDocumento,
      numeroDocumento: modelo.numeroDocumento.trim(),
      licencia: modelo.licencia.trim(),
      mes: modelo.mes,
      rucGrifo: modelo.rucGrifo.trim(),
      direccion: modelo.direccion.trim(),
      departamento: modelo.departamento,
      provincia: modelo.provincia,
      distrito: modelo.distrito,
    };

    if (this.editorModo === 'crear') {
      if (!this.archivoSeleccionado) {
        this.editorError = 'Debes adjuntar el archivo del comprobante.';
        return;
      }

      const req: ComprobanteRequest = {
        serie: modelo.serie,
        numero: modelo.numero,
        fechaEmision: modelo.emision,
        mes: modelo.mes,
        anio: Number(modelo.anio),
        rucDistribuidor: modelo.rucGrifo,
        distribuidorRazonSocial: modelo.razonSocial,
        distribuidorDireccion: modelo.direccion,
        distribuidorDepartamento: modelo.departamento,
        distribuidorProvincia: modelo.provincia,
        distribuidorDistrito: modelo.distrito,
        tipoCombustibleCodigo: modelo.combustible,
        azufrePpm: Number(modelo.ppm),
        galones: Number(modelo.galones),
        costo: Number(modelo.costo || 0),
        placas: [],
      };

      if (this.forma === 'A') {
        const v = this.vehiculos.find((x) => x.placa === modelo.placa);
        if (v)
          req.placas.push({
            vehiculoUuid: v.vehiculoUuid,
            galonesAsignados: req.galones,
          });

        this.apiComprobante
          .registrarComprobante(
            this.rucTransportista,
            req,
            this.archivoSeleccionado!,
          )
          .subscribe({
            next: () => {
              Swal.fire('Éxito', 'Comprobante Forma A registrado.', 'success');
              this.cerrarEditor();
              this.listarComprobantes();
            },
            error: (err) => {
              this.editorError =
                err.error?.data?.lista?.message ||
                'Error al registrar el comprobante.';
            },
          });
      } else {
        // Para Forma B (Granel)
        const reqB: ComprobanteBRequest = { ...req };
        this.apiComprobante
          .registrarComprobanteB(
            this.rucTransportista,
            reqB,
            this.archivoSeleccionado!,
          )
          .subscribe({
            next: () => {
              Swal.fire('Éxito', 'Comprobante Forma B registrado.', 'success');
              this.cerrarEditor();
              this.listarComprobantes();
            },
            error: (err) => {
              this.editorError =
                err.error?.data?.lista?.message ||
                'Error al registrar el comprobante.';
            },
          });
      }
    } else {
      // Actualizar
      const reqActualizar: any = {
        serie: modelo.serie,
        numero: modelo.numero,
        fechaEmision: modelo.emision,
        mes: modelo.mes,
        anio: Number(modelo.anio),
        rucDistribuidor: modelo.rucGrifo,
        tipoCombustibleCodigo: modelo.combustible,
        azufrePpm: Number(modelo.ppm),
        galones: Number(modelo.galones),
        costo: Number(modelo.costo || 0),
      };

      this.apiComprobante
        .actualizarComprobante(modelo.uuid, reqActualizar)
        .subscribe({
          next: () => {
            Swal.fire('Éxito', 'Comprobante actualizado.', 'success');
            this.cerrarEditor();
            this.listarComprobantes();
          },
          error: (err) => {
            this.editorError =
              err.error?.data?.lista?.message ||
              'Error al actualizar el comprobante.';
          },
        });
    }
  }

  retirar(uuid: string): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Se eliminará el comprobante.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        this.apiComprobante.eliminarComprobante(uuid).subscribe({
          next: () => {
            Swal.fire(
              'Eliminado',
              'El comprobante ha sido eliminado.',
              'success',
            );
            this.listarComprobantes();
          },
          error: (err) => {
            Swal.fire(
              'Error',
              err.error?.data?.lista?.message || 'Error al eliminar.',
              'error',
            );
          },
        });
      }
    });
  }

  @HostListener('document:keydown.escape')
  cerrarConEscape(): void {
    if (this.editor) {
      this.cerrarEditor();
    }
  }

  private mesDesdeFecha(fecha: string): string {
    const monthNames = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];
    const monthValue = /^\d{4}-\d{2}-\d{2}$/.test(fecha)
      ? Number(fecha.slice(5, 7))
      : Number(fecha.split('/')[1]);
    return monthNames[monthValue - 1] || '';
  }

  private fechaParaInput(fecha: string): string {
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fecha;
    const [day, month, year] = fecha.split('/');
    return day && month && year ? `${year}-${month}-${day}` : '';
  }

  private fechaParaMostrar(fecha: string): string {
    const [year, month, day] = fecha.split('-');
    return year && month && day ? `${day}/${month}/${year}` : fecha;
  }

  private formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
