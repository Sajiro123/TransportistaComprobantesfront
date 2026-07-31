import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import * as XLSX from 'xlsx';
import { isValidRuc } from '../../../core/utils/validators';
import { ApiComprobanteService } from '../../../core/services/api-comprobante.service';
import { ApiAuthService } from '../../../core/services/api-auth.service';
import { ApiExternaService } from '../../../core/services/api-externa.service';
import {
  ComprobanteListResponse,
  ComprobanteRequest,
  ComprobanteBRequest,
  ActualizarComprobanteRequest,
  DistribuidorResponse,
  VehiculoAsociadoResponse,
  TipoCombustibleResponse,
  EstadoComprobanteResponse,
  ComprobantePlacaRequest,
} from '../../../core/models/models';
import Swal from 'sweetalert2';
type EstadoFiltro = 'todos' | 'val' | 'pend' | 'obs';

type Forma = 'A' | 'B';
type FechaComprobanteModo = 'EMISION' | 'PERIODO';
type SeleccionPlacasModo = 'UNA' | 'CONJUNTO';

interface FilaPlacaEditor {
  id: number;
  placa: string;
  combustible: string;
  volumen: number | null;
}

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
  volumenM3: number;
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
  volumenM3: number;
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
  volumenM3: number;
}

@Component({
  selector: 'app-comprobantes',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, DatePickerModule, SelectModule],
  templateUrl: './comprobantes.component.html',
  styleUrl: './comprobantes.component.scss',
})
export class ComprobantesComponent implements OnInit {
  private readonly apiComprobante = inject(ApiComprobanteService);
  private readonly apiAuth = inject(ApiAuthService);
  private readonly apiExterna = inject(ApiExternaService);

  maxDateObj: Date = new Date();

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

  // Ubigeo data from ApiExternaService
  departamentosUbigeo: any[] = [];
  provinciasUbigeo: any[] = [];
  distritosUbigeo: any[] = [];

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
  readonly detallesAbiertos = new Set<string>();
  readonly legacyEditorTemplateEnabled = false;
  tieneNotaCredito = false;
  archivoNotaCredito: File | null = null;
  archivoNotaCreditoError = '';
  fechaComprobanteModo: FechaComprobanteModo = 'EMISION';
  periodoComprobante = '';
  periodoDesde = '';
  periodoHasta = '';
  seleccionPlacasModo: SeleccionPlacasModo = 'UNA';
  placasConjunto: string[] = [];
  volumenPorPlaca: Record<string, number> = {};
  filasPlacas: FilaPlacaEditor[] = [];
  excelPlacasError = '';
  private siguienteFilaPlacaId = 1;

  comprobantePendienteEliminar: ComprobanteListResponse | null = null;

  // Dummy arrays para Forma B (UI original los usaba)
  acumulados: any[] = [];
  vehiculosAbastecidos: any[] = [];

  busquedaAcumulado = '';
  busquedaVehiculoAbastecido = '';

  get acumuladosFiltrados(): any[] {
    const term = (this.busquedaAcumulado || '').trim().toLowerCase();
    if (!term) return this.acumulados;
    return this.acumulados.filter(item =>
      (item.placa || '').toLowerCase().includes(term)
    );
  }

  get vehiculosAbastecidosFiltrados(): any[] {
    const term = (this.busquedaVehiculoAbastecido || '').trim().toLowerCase();
    if (!term) return this.vehiculosAbastecidos;
    return this.vehiculosAbastecidos.filter(item =>
      (item.placa || '').toLowerCase().includes(term)
    );
  }

  ngOnInit() {
    const user = this.apiAuth.getUserFromSession();
    if (user?.ruc) {
      this.rucTransportista = user.ruc;
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
          this.calcularVehiculosAbastecidos();
        }
      });
    this.apiComprobante.listarDistribuidores().subscribe((res) => {
      if (res.data?.lista) this.distribuidores = res.data.lista;
    });
    this.cargarDepartamentosUbigeo();
    this.apiComprobante
      .listarAcumuladoVehiculos(this.rucTransportista)
      .subscribe({
        next: (res) => {
          const raw = res.data?.lista || res.data || [];
          const list = Array.isArray(raw) ? raw : [];
          if (list.length > 0) {
            this.acumulados = list.map((item: any) => ({
              placa: item.placa || '',
              consumido: Number(item.volumenAcumuladoM3 ?? item.consumido ?? 0),
              tope: Number(item.topeVolumenM3 ?? item.tope ?? 0),
            }));
          } else {
            this.calcularAcumuladosFallback();
          }
        },
        error: () => {
          this.calcularAcumuladosFallback();
        },
      });
  }

  cargandoComprobantes = false;

  listarComprobantes() {
    this.cargandoComprobantes = true;
    this.apiComprobante
      .listarComprobantes(
        this.rucTransportista,
        undefined,
        this.estadoFiltro === 'todos' ? undefined : this.estadoFiltro,
        this.busqueda ? this.busqueda : undefined,
      )
      .subscribe({
        next: (res) => {
          this.cargandoComprobantes = false;
          if (res.data?.lista) {
            this.comprobantes = res.data.lista;
          } else {
            this.comprobantes = [];
          }
        },
        error: () => {
          this.cargandoComprobantes = false;
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
      const coincideFlujo =
        this.forma === 'A'
          ? ['FORMA_A', 'A', 'SURTIDO_DIRECTO'].includes(
              c.tipoComprobanteCodigo,
            )
          : ['FORMA_B', 'B', 'CONSUMIDOR_DIRECTO'].includes(
              c.tipoComprobanteCodigo,
            );
      if (!coincideFlujo) return false;
      const coincideEstado =
        this.estadoFiltro === 'todos' ||
        c.estadoComprobanteCodigo === this.estadoFiltro;
      if (!coincideEstado) return false;
      if (!termino) return true;

      const contenido = [
        c.serie,
        c.numero,
        c.placa,
        c.rucDistribuidor,
        c.razonSocialDistribuidor,
        c.nombreComercialDistribuidor,
        c.distritoDistribuidor,
        c.provinciaDistribuidor,
        c.departamentoDistribuidor,
        c.combustibles?.map((combustible) => combustible.tipoCombustibleCodigo).join(' ') || '',
      ]
        .join(' ')
        .toLocaleLowerCase('es');

      return contenido.includes(termino);
    });
  }

  get cantidadPlacasAsociadas(): number {
    const placas = this.comprobantesFiltrados.flatMap((item) =>
      (item.placa || '')
        .split(',')
        .map((placa) => placa.trim().toLocaleUpperCase('es'))
        .filter(Boolean),
    );
    return new Set(placas).size;
  }

  etiquetaPlacas(placas?: string): string {
    const cantidad = (placas || '')
      .split(',')
      .map((placa) => placa.trim())
      .filter(Boolean).length;
    return `${cantidad} ${cantidad === 1 ? 'placa' : 'placas'}`;
  }

  ubicacionDistribuidor(item: ComprobanteListResponse): string {
    return [
      item.distritoDistribuidor,
      item.provinciaDistribuidor,
      item.departamentoDistribuidor,
    ]
      .filter(Boolean)
      .join(' · ') || 'Ubicación no disponible';
  }

  fechaVisible(fecha: string): string {
    if (!fecha) return '—';
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      const [anio, mes, dia] = fecha.split('-');
      return `${dia}/${mes}/${anio}`;
    }
    return fecha;
  }

  detalleAbierto(comprobanteUuid: string): boolean {
    return this.detallesAbiertos.has(comprobanteUuid);
  }

  alternarDetalle(comprobanteUuid: string): void {
    if (this.detallesAbiertos.has(comprobanteUuid)) {
      this.detallesAbiertos.delete(comprobanteUuid);
      return;
    }
    this.detallesAbiertos.add(comprobanteUuid);
  }

  mensajeValidacion(item: ComprobanteListResponse): string {
    if (item.tieneNotaCreditoActiva) {
      return 'Esta factura tiene una nota de crédito activa que la corrige o anula. Mientras la nota de crédito esté vigente, la factura queda inhabilitada y sus galones no se consideran.';
    }

    switch (item.estadoComprobanteCodigo) {
      case 'CONFORME':
        return 'El comprobante existe en SUNAT y el grifo está inscrito en Osinergmin. Sus galones se reconocen para el subsidio.';
      case 'PENDIENTE':
        return 'El comprobante está en proceso de validación con SUNAT y Osinergmin.';
      case 'OBSERVADO':
        return Number(item.azufrePpm) > 50
          ? `El combustible declarado supera 50 ppm de azufre (${item.azufrePpm} ppm). Solo se subsidia diésel B5/B20 con azufre ≤50 ppm.`
          : 'El comprobante presenta observaciones. Revisa sus datos y la información del establecimiento emisor.';
      case 'INHABILITADO':
        return 'El comprobante está inhabilitado y sus galones no se consideran para el subsidio.';
      default:
        return 'Consulta el estado del comprobante y sus validaciones antes de continuar.';
    }
  }

  // --- Helpers UI Form B ---
  calcularVehiculosAbastecidos() {
    this.vehiculosAbastecidos = this.vehiculos.map((v: any) => ({
      placa: v.placa,
      subsidiable: v.esSubsidiable,
    }));
    if (this.acumulados.length === 0) {
      this.calcularAcumuladosFallback();
    }
  }

  private calcularAcumuladosFallback() {
    this.acumulados = this.vehiculos.map((v: any) => ({
      placa: v.placa,
      consumido: 0,
      tope: v.topeVolumenM3 ?? v.topeGalones ?? 0,
    }));
  }

  porcentaje(item: any): number {
    if (!item.tope) return 0;
    return Math.min((item.consumido / item.tope) * 100, 100);
  }

  get totalGalonesMayorista(): number {
    return this.comprasMayorista.reduce(
      (total, compra) => total + (compra.volumenM3 ?? compra.galones ?? 0),
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

  get volumenSubsidiado(): number {
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

  cambiarTieneNotaCredito(valor: boolean): void {
    this.tieneNotaCredito = valor;
    if (!valor) {
      this.archivoNotaCredito = null;
      this.archivoNotaCreditoError = '';
    }
  }

  onNotaCreditoFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0] || null;
    input.value = '';
    if (!archivo) return;

    const error = this.validarTipoYTamanioArchivo(archivo);
    if (error) {
      this.archivoNotaCredito = null;
      this.archivoNotaCreditoError = error;
      return;
    }

    this.archivoNotaCredito = archivo;
    this.archivoNotaCreditoError = '';
  }

  quitarArchivoNotaCredito(): void {
    this.archivoNotaCredito = null;
    this.archivoNotaCreditoError = '';
  }

  private validarArchivo(file: File): void {
    const error = this.validarTipoYTamanioArchivo(file);
    if (error) {
      this.archivoSeleccionado = null;
      this.archivoError = error;
      return;
    }

    this.archivoSeleccionado = file;
    this.archivoError = '';
  }

  private validarTipoYTamanioArchivo(file: File): string {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      return 'Selecciona un archivo PDF o una imagen JPG/PNG.';
    }
    if (file.size > 5 * 1024 * 1024) {
      return 'El archivo no puede superar los 5 MB.';
    }
    return '';
  }

  // --- Editor ---

  abrirRegistro(): void {
    this.editorModo = 'crear';
    this.placaBusqueda = '';
    this.archivoSeleccionado = null;
    this.archivoError = '';
    this.tieneNotaCredito = false;
    this.archivoNotaCredito = null;
    this.archivoNotaCreditoError = '';
    this.fechaComprobanteModo = 'EMISION';
    this.periodoComprobante = '';
    this.periodoDesde = '';
    this.periodoHasta = '';
    this.seleccionPlacasModo = 'UNA';
    this.placasConjunto = [];
    this.volumenPorPlaca = {};
    this.filasPlacas = [];
    this.excelPlacasError = '';
    const hoy = this.todayDate;
    this.editor = {
      uuid: '',
      placa: '',
      conductor: '',
      tipoDocumento: 'DNI',
      numeroDocumento: '',
      licencia: '',
      serie: 'F001',
      numero: '',
      emision: hoy,
      mes: this.mesDesdeFecha(hoy),
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
      volumenM3: 0,
    };
    this.editorError = '';
    this.provinciasUbigeo = [];
    this.distritosUbigeo = [];
    this.cargarDepartamentosUbigeo();
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
    this.apiComprobante.eliminarComprobante(uuid).subscribe({
      next: () => {
        Swal.fire('Eliminado', 'El comprobante ha sido eliminado.', 'success');
        this.comprobantePendienteEliminar = null;
        this.listarComprobantes();
      },
      error: (err) => {
        Swal.fire(
          'Error',
          err?.error?.data?.lista?.message || 'Error al eliminar el comprobante.',
          'error',
        );
        this.comprobantePendienteEliminar = null;
      },
    });
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
          this.tieneNotaCredito = !!c.tieneNotaCreditoActiva;
          this.archivoNotaCredito = null;
          this.archivoNotaCreditoError = '';
          this.fechaComprobanteModo = c.tienePeriodo ? 'PERIODO' : 'EMISION';
          this.periodoComprobante = c.fechaEmision?.slice(0, 7) || c.fechaDesde?.slice(0, 7) || '';
          this.periodoDesde = c.fechaDesde || '';
          this.periodoHasta = c.fechaHasta || '';
          
          if (c.placas && c.placas.length > 1) {
            this.seleccionPlacasModo = 'CONJUNTO';
            this.placasConjunto = c.placas.map((p: any) => p.placa);
            this.filasPlacas = c.placas.map((p: any, idx: number) => ({
              id: idx + 1,
              placa: p.placa,
              combustible: p.tipoCombustibleCodigo,
              volumen: p.volumenAsignadoM3
            }));
            this.siguienteFilaPlacaId = c.placas.length + 1;
            this.placaBusqueda = '';
          } else {
            this.seleccionPlacasModo = 'UNA';
            this.placasConjunto = [];
            this.filasPlacas = [];
            let p = '';
            if (c.placas && c.placas.length === 1) {
              p = c.placas[0].placa;
            } else if (c.tipoComprobanteCodigo === 'FORMA_A') {
              p = c.placa || (c.detalle && c.detalle.length > 0 ? c.detalle[0].placa : '');
            }
            this.placaBusqueda = p;
          }

          this.editor = {
            uuid: c.comprobanteUuid,
            placa: this.placaBusqueda,
            conductor: '', 
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
            direccion: c.direccionDistribuidor || '',
            departamento: String(c.ubigeoDepartamento || c.departamentoDistribuidor || ''),
            provincia: String(c.ubigeoProvincia || c.provinciaDistribuidor || ''),
            distrito: String(c.ubigeoDistrito || c.distritoDistribuidor || ''),
            combustible: (c as any).tipoCombustibleCodigo || (c.placas?.[0]?.tipoCombustibleCodigo) || (c.combustibles?.[0]?.tipoCombustibleCodigo) || '',
            ppm: c.azufrePpm,
            costo: c.costo || 0,
            volumenM3: c.volumenM3,
          };
          
          this.editorError = '';
          this.cargarDepartamentosUbigeo(() => {
            if (this.editor?.departamento) {
              this.cargarProvinciasUbigeo(this.editor.departamento, this.editor.provincia, this.editor.distrito);
            }
          });
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
    this.placasConjunto = [];
    this.volumenPorPlaca = {};
    this.archivoNotaCredito = null;
    this.archivoNotaCreditoError = '';
    this.filasPlacas = [];
    this.excelPlacasError = '';
  }

  get vehiculosFiltradosPorPlaca(): VehiculoAsociadoResponse[] {
    const search = this.placaBusqueda.trim().toLocaleUpperCase('es');
    if (search.length < 3) return [];

    return this.vehiculos.filter((vehiculo) =>
      vehiculo.placa.toLocaleUpperCase('es').includes(search),
    );
  }

  onPlacaBusquedaChange(valor: string): void {
    this.placaBusqueda = (valor || '').toLocaleUpperCase('es').slice(0, 10);
    if (!this.editor) return;
    const coincidenciaExacta = this.vehiculos.find(
      (vehiculo) =>
        vehiculo.placa.toLocaleUpperCase('es') === this.placaBusqueda.trim(),
    );
    this.editor.placa = coincidenciaExacta?.placa || '';
  }

  onPlacaSeleccionada(placa: string): void {
    if (placa) this.placaBusqueda = placa;
  }

  reiniciarFiltroPlaca(): void {
    this.placaBusqueda = '';
  }

  onFiltroPlacaSelect(evento: { filter: string }): void {
    this.placaBusqueda = (evento.filter || '')
      .toLocaleUpperCase('es')
      .slice(0, 10);
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

    const distribuidor = this.distribuidores.find((item) => item.ruc === value);
    if (distribuidor) {
      this.editor.razonSocial = distribuidor.razonSocial;
      this.editor.departamento = distribuidor.departamento;
      this.editor.provincia = distribuidor.provincia;
      this.editor.distrito = distribuidor.distrito;
      this.editor.direccion = distribuidor.direccion;
      if (distribuidor.departamento) {
        this.cargarProvinciasUbigeo(distribuidor.departamento, distribuidor.provincia, distribuidor.distrito);
      }
    }
  }

  // --- 🗺️ Ubigeo logic using ApiExternaService ---

  private extractArrayFromResponse(res: any): any[] {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.data)) return res.data;
    if (res.data && Array.isArray(res.data.lista)) return res.data.lista;
    if (res.data && Array.isArray(res.data.data)) return res.data.data;
    return [];
  }

  private getItemNombre(item: any): string {
    if (!item) return '';
    if (typeof item === 'string') return item;
    return item.nombre || item.descripcion || item.departamento || item.provincia || item.distrito || item.id || '';
  }

  private getItemId(item: any): string {
    if (!item) return '';
    if (typeof item === 'number' || typeof item === 'string') return String(item);
    const id = item.ubigeoId ?? item.id ?? item.departamentoId ?? item.provinciaId ?? item.distritoId ?? item.codigoUbigeo ?? item.codigo ?? item.nombre ?? '';
    return String(id);
  }

  cargarDepartamentosUbigeo(onLoaded?: () => void): void {
    this.apiExterna.obtenerDepartamentos().subscribe({
      next: (res) => {
        this.departamentosUbigeo = this.extractArrayFromResponse(res);
        if (onLoaded) onLoaded();
      },
      error: (err) => {
        console.warn('No se pudo cargar departamentos de ApiExternaService:', err);
        this.departamentosUbigeo = [];
        if (onLoaded) onLoaded();
      },
    });
  }

  cargarProvinciasUbigeo(depIdOrName: string, selectProvinciaName?: string, selectDistritoName?: string): void {
    if (!depIdOrName) {
      this.provinciasUbigeo = [];
      this.distritosUbigeo = [];
      return;
    }

    let targetId = depIdOrName;
    const matchDep = this.departamentosUbigeo.find(
      (d) =>
        this.getItemId(d).toLowerCase() === depIdOrName.toLowerCase() ||
        this.getItemNombre(d).toLowerCase() === depIdOrName.toLowerCase(),
    );
    if (matchDep) {
      targetId = this.getItemId(matchDep);
    }

    this.apiExterna.obtenerProvincias(targetId).subscribe({
      next: (res) => {
        this.provinciasUbigeo = this.extractArrayFromResponse(res);
        if (selectProvinciaName) {
          this.cargarDistritosUbigeo(selectProvinciaName);
        }
      },
      error: (err) => {
        console.warn('No se pudo cargar provincias de ApiExternaService:', err);
        this.provinciasUbigeo = [];
      },
    });
  }

  cargarDistritosUbigeo(provIdOrName: string): void {
    if (!provIdOrName) {
      this.distritosUbigeo = [];
      return;
    }

    let targetId = provIdOrName;
    const matchProv = this.provinciasUbigeo.find(
      (p) =>
        this.getItemId(p).toLowerCase() === provIdOrName.toLowerCase() ||
        this.getItemNombre(p).toLowerCase() === provIdOrName.toLowerCase(),
    );
    if (matchProv) {
      targetId = this.getItemId(matchProv);
    }

    this.apiExterna.obtenerDistritos(targetId).subscribe({
      next: (res) => {
        this.distritosUbigeo = this.extractArrayFromResponse(res);
      },
      error: (err) => {
        console.warn('No se pudo cargar distritos de ApiExternaService:', err);
        this.distritosUbigeo = [];
      },
    });
  }

  private unicosPorId(lista: { id: string; nombre: string }[]): { id: string; nombre: string }[] {
    const mapa = new Map<string, { id: string; nombre: string }>();
    for (const item of lista) {
      if (item.id && !mapa.has(String(item.id))) {
        mapa.set(String(item.id), item);
      }
    }
    return Array.from(mapa.values());
  }

  get departamentosDisponibles(): { id: string; nombre: string }[] {
    if (this.departamentosUbigeo.length > 0) {
      const items = this.departamentosUbigeo.map((d) => ({
        id: this.getItemId(d),
        nombre: this.getItemNombre(d),
      }));
      return this.unicosPorId(items);
    }
    const fallback = this.distribuidores.map((item) => ({
      id: String(item.ubigeoDepartamento || item.departamento || ''),
      nombre: item.departamento || '',
    })).filter((x) => !!x.nombre);
    return this.unicosPorId(fallback);
  }

  get provinciasDisponibles(): { id: string; nombre: string }[] {
    if (this.provinciasUbigeo.length > 0) {
      const items = this.provinciasUbigeo.map((p) => ({
        id: this.getItemId(p),
        nombre: this.getItemNombre(p),
      }));
      return this.unicosPorId(items);
    }
    if (!this.editor?.departamento) return [];
    const fallback = this.distribuidores
      .filter((item) => String(item.ubigeoDepartamento || item.departamento) === String(this.editor.departamento))
      .map((item) => ({
        id: String(item.ubigeoProvincia || item.provincia || ''),
        nombre: item.provincia || '',
      })).filter((x) => !!x.nombre);
    return this.unicosPorId(fallback);
  }

  get distritosDisponibles(): { id: string; nombre: string }[] {
    if (this.distritosUbigeo.length > 0) {
      const items = this.distritosUbigeo.map((d) => ({
        id: this.getItemId(d),
        nombre: this.getItemNombre(d),
      }));
      return this.unicosPorId(items);
    }
    if (!this.editor?.departamento || !this.editor?.provincia) return [];
    const fallback = this.distribuidores
      .filter(
        (item) =>
          String(item.ubigeoDepartamento || item.departamento) === String(this.editor.departamento) &&
          String(item.ubigeoProvincia || item.provincia) === String(this.editor.provincia),
      )
      .map((item) => ({
        id: String(item.ubigeoDistrito || item.distrito || ''),
        nombre: item.distrito || '',
      })).filter((x) => !!x.nombre);
    return this.unicosPorId(fallback);
  }

  get direccionesDisponibles(): DistribuidorResponse[] {
    if (!this.editor?.departamento || !this.editor?.provincia || !this.editor?.distrito) {
      return [];
    }
    return this.distribuidores.filter(
      (item) =>
        item.departamento === this.editor.departamento &&
        item.provincia === this.editor.provincia &&
        item.distrito === this.editor.distrito &&
        (!this.editor.rucGrifo || item.ruc === this.editor.rucGrifo),
    );
  }

  onEditorDepartamentoChange(): void {
    if (!this.editor) return;
    this.editor.provincia = '';
    this.editor.distrito = '';
    this.editor.direccion = '';
    this.provinciasUbigeo = [];
    this.distritosUbigeo = [];
    if (this.editor.departamento) {
      this.cargarProvinciasUbigeo(this.editor.departamento);
    }
  }

  onEditorProvinciaChange(): void {
    if (!this.editor) return;
    this.editor.distrito = '';
    this.editor.direccion = '';
    this.distritosUbigeo = [];
    if (this.editor.provincia) {
      this.cargarDistritosUbigeo(this.editor.provincia);
    }
  }

  onEditorDistritoChange(): void {
    if (!this.editor) return;
    this.editor.direccion = '';
  }

  onEditorDireccionChange(): void {
    if (!this.editor) return;
    const distribuidor = this.direccionesDisponibles.find(
      (item) => item.direccion === this.editor.direccion,
    );
    if (distribuidor) {
      this.editor.rucGrifo = distribuidor.ruc;
      this.editor.razonSocial = distribuidor.razonSocial;
    }
  }

  cambiarModoFecha(modo: FechaComprobanteModo): void {
    this.fechaComprobanteModo = modo;
    if (!this.editor) return;
    if (modo === 'PERIODO') {
      const fechaBase = this.editor.emision || this.todayDate;
      this.periodoDesde ||= fechaBase;
      this.periodoHasta ||= fechaBase;
      this.onPeriodoRangoChange();
    }
  }

  onPeriodoRangoChange(): void {
    if (!this.editor || !this.esFechaIsoValida(this.periodoDesde)) return;
    this.editor.emision = this.periodoDesde;
    this.editor.mes = this.mesDesdeFecha(this.editor.emision);
    this.editor.anio = Number(this.periodoDesde.slice(0, 4));
  }

  cambiarModoPlacas(modo: SeleccionPlacasModo): void {
    if (!this.editor) return;
    this.seleccionPlacasModo = modo;
    this.editor.placa = '';
    this.placasConjunto = [];
    this.volumenPorPlaca = {};
    this.filasPlacas = [];
    this.excelPlacasError = '';
    if (modo === 'CONJUNTO') {
      this.agregarFilaPlaca();
    }
  }

  agregarFilaPlaca(): void {
    this.filasPlacas = [
      ...this.filasPlacas,
      {
        id: this.siguienteFilaPlacaId++,
        placa: '',
        combustible: this.editor?.combustible || this.tiposCombustible[0]?.codigo || '',
        volumen: null,
      },
    ];
  }

  quitarFilaPlaca(id: number): void {
    this.filasPlacas = this.filasPlacas.filter((fila) => fila.id !== id);
    this.excelPlacasError = '';
  }

  categoriaFila(fila: FilaPlacaEditor): string {
    if (!fila.placa) return '—';
    return (
      this.vehiculos.find((vehiculo) => vehiculo.placa === fila.placa)
        ?.categoriaCodigo || '—'
    );
  }

  placaUsadaEnOtraFila(placa: string, filaId: number): boolean {
    return this.filasPlacas.some(
      (fila) => fila.id !== filaId && fila.placa === placa,
    );
  }

  async onExcelPlacasSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0] || null;
    input.value = '';
    this.excelPlacasError = '';
    if (!archivo) return;

    if (!/\.(xlsx|xls)$/i.test(archivo.name)) {
      this.excelPlacasError = 'Selecciona un archivo Excel con extensión .xlsx o .xls.';
      return;
    }
    if (archivo.size > 5 * 1024 * 1024) {
      this.excelPlacasError = 'El archivo Excel no puede superar los 5 MB.';
      return;
    }

    try {
      const libro = XLSX.read(await archivo.arrayBuffer(), { type: 'array' });
      const hoja = libro.Sheets[libro.SheetNames[0]];
      const registros = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, {
        defval: '',
      });
      if (!registros.length) {
        this.excelPlacasError = 'El Excel no contiene filas para importar.';
        return;
      }

      const filas: FilaPlacaEditor[] = registros.map((registro, indice) => {
        const normalizado = Object.entries(registro).reduce<Record<string, unknown>>(
          (resultado, [clave, valor]) => {
            resultado[this.normalizarEncabezadoExcel(clave)] = valor;
            return resultado;
          },
          {},
        );
        const placa = String(normalizado['placa'] || '').trim().toUpperCase();
        const combustibleTexto = String(
          normalizado['combustible'] || normalizado['comb'] || '',
        ).trim();
        const volumenTexto =
          normalizado['volumenm3'] ?? normalizado['volumen'] ?? '';
        const volumen = Number(String(volumenTexto).replace(',', '.'));
        const combustible =
          this.tiposCombustible.find(
            (tipo) =>
              tipo.codigo.toLowerCase() === combustibleTexto.toLowerCase() ||
              tipo.nombre.toLowerCase() === combustibleTexto.toLowerCase(),
          )?.codigo || '';
        if (!placa || !this.vehiculos.some((vehiculo) => vehiculo.placa === placa)) {
          throw new Error(`Fila ${indice + 2}: la placa no está asociada al transportista.`);
        }
        if (!combustible) {
          throw new Error(`Fila ${indice + 2}: el combustible no es válido.`);
        }
        if (!Number.isFinite(volumen) || volumen <= 0) {
          throw new Error(`Fila ${indice + 2}: el volumen debe ser mayor a cero.`);
        }
        return {
          id: this.siguienteFilaPlacaId++,
          placa,
          combustible,
          volumen,
        };
      });

      if (new Set(filas.map((fila) => fila.placa)).size !== filas.length) {
        this.excelPlacasError = 'El Excel contiene placas duplicadas.';
        return;
      }
      this.filasPlacas = filas;
    } catch (error) {
      this.excelPlacasError =
        error instanceof Error
          ? error.message
          : 'No se pudo leer el archivo Excel.';
    }
  }

  private normalizarEncabezadoExcel(valor: string): string {
    return valor
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  get categoriaVehiculoSeleccionado(): string {
    if (!this.editor?.placa) return '—';
    return (
      this.vehiculos.find((vehiculo) => vehiculo.placa === this.editor.placa)
        ?.categoriaCodigo || '—'
    );
  }

  get cantidadPlacasEditor(): number {
    return this.seleccionPlacasModo === 'UNA'
      ? Number(!!this.editor?.placa)
      : this.filasPlacas.filter((fila) => !!fila.placa).length;
  }

  get volumenTotalEditor(): number {
    if (this.seleccionPlacasModo === 'UNA') {
      return Number(this.editor?.volumenM3 || 0);
    }
    return this.filasPlacas.reduce(
      (total, fila) => total + Number(fila.volumen || 0),
      0,
    );
  }

  get isEditorPeriodValid(): boolean {
    if (this.fechaComprobanteModo !== 'PERIODO') return true;
    return (
      this.esFechaIsoValida(this.periodoDesde) &&
      this.esFechaIsoValida(this.periodoHasta) &&
      this.periodoDesde <= this.periodoHasta &&
      this.periodoHasta <= this.todayDate
    );
  }

  private esFechaIsoValida(fecha: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
    const [anio, mes, dia] = fecha.split('-').map(Number);
    const fechaUtc = new Date(Date.UTC(anio, mes - 1, dia));
    return (
      fechaUtc.getUTCFullYear() === anio &&
      fechaUtc.getUTCMonth() === mes - 1 &&
      fechaUtc.getUTCDate() === dia
    );
  }

  get isEditorFuelValid(): boolean {
    if (!this.editor) return false;
    return this.tiposCombustible.some(
      (item) => item.codigo === this.editor.combustible,
    );
  }

  guardarEditor(): void {
    if (!this.editor) return;
    this.editorSubmitted = true;

    const modelo = this.editor;
    if (this.editorModo === 'crear' && !this.archivoSeleccionado) {
      this.editorError = 'Debes adjuntar el archivo del comprobante en PDF, JPG o PNG.';
      return;
    }
    if (
      this.editorModo === 'crear' &&
      this.tieneNotaCredito &&
      !this.archivoNotaCredito
    ) {
      this.editorError =
        'Debes cargar el PDF o imagen de respaldo que contiene la Nota de Crédito y la factura.';
      return;
    }
    if (!this.isEditorInvoiceSeriesValid) {
      this.editorError = 'La serie debe tener el formato F001.';
      return;
    }
    if (!this.isEditorInvoiceNumberValid) {
      this.editorError = 'El número de factura debe contener entre 1 y 8 dígitos.';
      return;
    }
    if (!this.isEditorEmissionValid || !this.isEditorPeriodValid) {
      this.editorError =
        this.fechaComprobanteModo === 'PERIODO'
          ? 'Ingresa un periodo válido: ambas fechas son obligatorias, Desde no puede superar Hasta y el rango no puede terminar después de hoy.'
          : 'Ingresa una fecha válida que no sea posterior al actual.';
      return;
    }
    if (!this.isEditorStationRucValid) {
      this.editorError = 'El RUC del grifo debe ser válido y contener 11 dígitos.';
      return;
    }

    const ubicacion = [
      modelo.departamento,
      modelo.provincia,
      modelo.distrito,
      modelo.direccion,
    ];
    if (ubicacion.some(Boolean) && !ubicacion.every(Boolean)) {
      this.editorError =
        'Completa departamento, provincia, distrito y dirección del grifo.';
      return;
    }
    if (this.seleccionPlacasModo === 'UNA' && !modelo.placa) {
      this.editorError = 'Selecciona la placa del vehículo.';
      return;
    }
    if (this.seleccionPlacasModo === 'UNA' && Number(modelo.volumenM3) <= 0) {
      this.editorError = 'El volumen debe ser mayor a cero.';
      return;
    }
    if (this.seleccionPlacasModo === 'CONJUNTO') {
      if (!this.filasPlacas.length || this.filasPlacas.some((fila) => !fila.placa)) {
        this.editorError = 'Selecciona una placa en cada fila del conjunto.';
        return;
      }
      const placas = this.filasPlacas.map((fila) => fila.placa);
      if (new Set(placas).size !== placas.length) {
        this.editorError = 'No puedes agregar la misma placa más de una vez.';
        return;
      }
      if (
        this.filasPlacas.some(
          (fila) =>
            !this.vehiculos.some((vehiculo) => vehiculo.placa === fila.placa),
        )
      ) {
        this.editorError =
          'Una o más placas no están asociadas al transportista.';
        return;
      }
      if (
        this.filasPlacas.some(
          (fila) => !fila.combustible || Number(fila.volumen) <= 0,
        )
      ) {
        this.editorError =
          'Selecciona el combustible y asigna un volumen mayor a cero en cada placa.';
        return;
      }
      const combustibles = new Set(
        this.filasPlacas.map((fila) => fila.combustible),
      );
      if (combustibles.size > 1) {
        this.editorError =
          'El servicio actual registra un solo combustible por comprobante. Todas las placas deben usar el mismo combustible.';
        return;
      }
      modelo.combustible = this.filasPlacas[0].combustible;
    }
    if (!this.isEditorFuelValid) {
      this.editorError = 'Selecciona un combustible válido.';
      return;
    }

    const placasRequest: ComprobantePlacaRequest[] =
      this.seleccionPlacasModo === 'UNA'
        ? this.vehiculos
            .filter((vehiculo) => vehiculo.placa === modelo.placa)
            .map((vehiculo) => ({
              vehiculoUuid: vehiculo.vehiculoUuid,
              volumenAsignadoM3: Number(modelo.volumenM3),
            }))
        : this.filasPlacas.reduce<ComprobantePlacaRequest[]>(
            (resultado, fila) => {
              const vehiculo = this.vehiculos.find(
                (item) => item.placa === fila.placa,
              );
              if (vehiculo) {
                resultado.push({
                  vehiculoUuid: vehiculo.vehiculoUuid,
                  volumenAsignadoM3: Number(fila.volumen),
                });
              }
              return resultado;
            },
            [],
          );

    if (placasRequest.length !== this.cantidadPlacasEditor) {
      this.editorError = 'Una o más placas seleccionadas no están asociadas al transportista.';
      return;
    }
    modelo.placa =
      this.seleccionPlacasModo === 'UNA'
        ? modelo.placa
        : this.filasPlacas[0].placa;
    modelo.volumenM3 = this.volumenTotalEditor;

    if (
      !modelo.placa ||
      !modelo.numero.trim() ||
      !modelo.volumenM3 ||
      modelo.volumenM3 <= 0
    ) {
      this.editorError =
        'Completa la placa, el número de factura y una cantidad válida de volumen.';
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
      volumenM3: Number(modelo.volumenM3),
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
      const archivoRespaldo =
        this.tieneNotaCredito && this.archivoNotaCredito
          ? this.archivoNotaCredito
          : this.archivoSeleccionado;

      const req: ComprobanteRequest = {
        serie: modelo.serie,
        numero: modelo.numero,
        tienePeriodo: this.fechaComprobanteModo === 'PERIODO',
        fechaEmision: this.fechaComprobanteModo === 'EMISION' ? modelo.emision : null,
        fechaDesde: this.fechaComprobanteModo === 'PERIODO' ? this.periodoDesde : null,
        fechaHasta: this.fechaComprobanteModo === 'PERIODO' ? this.periodoHasta : null,
        mes: modelo.mes,
        anio: Number(modelo.anio),
        rucDistribuidor: modelo.rucGrifo,
        distribuidorRazonSocial: modelo.razonSocial,
        distribuidorDireccion: modelo.direccion,
        distribuidorDepartamento: modelo.departamento,
        distribuidorProvincia: modelo.provincia,
        distribuidorDistrito: modelo.distrito,
        tipoCombustibleCodigo: modelo.combustible,
        azufrePpm: Number(modelo.ppm) || undefined,
        volumenM3: Number(modelo.volumenM3),
        tieneNotaCredito: this.tieneNotaCredito,
        serieNc: this.tieneNotaCredito ? (modelo.serieNc || undefined) : undefined,
        numeroNc: this.tieneNotaCredito ? (modelo.numeroNc || undefined) : undefined,
        placas: placasRequest,
      };

      if (this.forma === 'A') {
        const archivoNcFormaA = this.tieneNotaCredito ? this.archivoNotaCredito : null;
        this.apiComprobante
          .registrarComprobante(
            this.rucTransportista,
            req,
            archivoRespaldo,
            archivoNcFormaA,
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
        // Para Forma B (Granel) - uses combustibles array
        const reqB: ComprobanteBRequest = {
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
          azufrePpm: Number(modelo.ppm) || undefined,
          combustibles: [{ codigo: modelo.combustible, volumenM3: Number(modelo.volumenM3) }],
          tieneNotaCredito: this.tieneNotaCredito,
          serieNc: this.tieneNotaCredito ? (modelo.serieNc || undefined) : undefined,
          numeroNc: this.tieneNotaCredito ? (modelo.numeroNc || undefined) : undefined,
        };
        const archivoNcFormaB = this.tieneNotaCredito ? this.archivoNotaCredito : null;
        this.apiComprobante
          .registrarComprobanteB(
            this.rucTransportista,
            reqB,
            archivoRespaldo,
            archivoNcFormaB,
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
      const reqActualizar: ActualizarComprobanteRequest = {
        serie: modelo.serie,
        numero: modelo.numero,
        fechaEmision: this.fechaComprobanteModo === 'EMISION' ? modelo.emision : undefined,
        fechaDesde: this.fechaComprobanteModo === 'PERIODO' ? this.periodoDesde : undefined,
        fechaHasta: this.fechaComprobanteModo === 'PERIODO' ? this.periodoHasta : undefined,
        mes: modelo.mes,
        anio: Number(modelo.anio),
        rucDistribuidor: modelo.rucGrifo,
        tipoCombustibleCodigo: modelo.combustible,
        volumenM3: Number(modelo.volumenM3),
        placas: placasRequest,
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
      buttonsStyling: false,
      customClass: {
        actions: 'atu-delete-confirmation-actions',
        confirmButton: 'atu-delete-confirmation-submit',
        cancelButton: 'atu-delete-confirmation-cancel',
      },
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

  private valoresUnicos(valores: Array<string | null | undefined>): string[] {
    return [...new Set(valores.map((valor) => valor?.trim()).filter((valor): valor is string => !!valor))].sort(
      (a, b) => a.localeCompare(b, 'es'),
    );
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
