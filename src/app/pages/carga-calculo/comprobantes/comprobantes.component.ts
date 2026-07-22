import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { isValidRuc } from '../../../core/utils/validators';

type Forma = 'A' | 'B';
type EstadoFiltro = 'todos' | 'val' | 'pend' | 'obs';

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
export class ComprobantesComponent {
  forma: Forma = 'A';
  busqueda = '';
  estadoFiltro: EstadoFiltro = 'todos';
  editor: ComprobanteEditor | null = null;
  editorModo: 'crear' | 'editar' = 'editar';
  editorError = '';
  editorSubmitted = false;
  comprobantePendienteEliminar: Comprobante | null = null;
  readonly todayDate = this.formatLocalDate(new Date());

  comprobantes: Comprobante[] = [
    {
      id: 1,
      numero: 'F001-0001234',
      fecha: '12/06/2026',
      placa: 'AXG-712',
      conductor: 'Juan Pérez Quispe',
      grifo: 'Grifo Repsol Villa El Salvador',
      ubicacion: 'Villa El Salvador, Lima',
      combustible: 'B5',
      ppm: 45,
      galones: 320.5,
      estado: 'val',
      estadoLabel: 'Conforme',
      estadoIcon: 'fa-check',
    },
    {
      id: 2,
      numero: 'F001-0001450',
      fecha: '25/06/2026',
      placa: 'AXG-712',
      conductor: 'María López Torres',
      grifo: 'Grifo Repsol Villa El Salvador',
      ubicacion: 'Villa El Salvador, Lima',
      combustible: 'B5',
      ppm: 45,
      galones: 210,
      estado: 'obs',
      estadoLabel: 'Inhabilitado por N/C',
      estadoIcon: 'fa-ban',
    },
    {
      id: 3,
      numero: 'F002-0000087',
      fecha: '03/07/2026',
      placa: 'B2W-458',
      conductor: 'Pedro Ríos Vega',
      grifo: 'Grifo El Sol S.A.C.',
      ubicacion: 'San Juan de Miraflores, Lima',
      combustible: 'B20',
      ppm: 62,
      galones: 180,
      estado: 'obs',
      estadoLabel: 'Observado',
      estadoIcon: 'fa-exclamation',
    },
    {
      id: 4,
      numero: 'F001-0001600',
      fecha: '08/07/2026',
      placa: 'AXG-712',
      conductor: 'Juan Pérez Quispe',
      grifo: 'Estación no identificada',
      ubicacion: 'Ate, Lima',
      combustible: 'B5',
      ppm: 40,
      galones: 150,
      estado: 'pend',
      estadoLabel: 'En validación',
      estadoIcon: 'fa-clock',
    },
  ];

  acumulados: AcumuladoVehiculo[] = [
    { placa: 'AXG-712', consumido: 320.5, tope: 1915.41 },
    { placa: 'B2W-458', consumido: 0, tope: 888.45 },
  ];

  comprasMayorista: CompraMayorista[] = [
    {
      id: 1,
      numero: 'F050-0000210',
      distribuidor: 'Distribuidora de Combustibles Andina S.A.',
      ruc: '20600500400',
      combustible: 'B5',
      ppm: 38,
      galones: 1800,
    },
    {
      id: 2,
      numero: 'F050-0000355',
      distribuidor: 'Distribuidora de Combustibles Andina S.A.',
      ruc: '20600500400',
      combustible: 'B5',
      ppm: 38,
      galones: 1200,
    },
  ];

  vehiculosAbastecidos: VehiculoAbastecido[] = [
    { placa: 'AXG-712', subsidiable: true },
    { placa: 'B2W-458', subsidiable: true },
    { placa: 'C4T-119', subsidiable: false },
    { placa: 'D9K-201', subsidiable: false },
  ];

  get totalGalonesMayorista(): number {
    return this.comprasMayorista.reduce((total, compra) => total + compra.galones, 0);
  }

  get cantidadSubsidiables(): number {
    return this.vehiculosAbastecidos.filter(vehiculo => vehiculo.subsidiable).length;
  }

  get factorProrrateo(): number {
    return this.vehiculosAbastecidos.length
      ? this.cantidadSubsidiables / this.vehiculosAbastecidos.length
      : 0;
  }

  get galonesSubsidiados(): number {
    return this.totalGalonesMayorista * this.factorProrrateo;
  }

  get comprobantesFiltrados(): Comprobante[] {
    const termino = this.busqueda.trim().toLocaleLowerCase('es');

    return this.comprobantes.filter(comprobante => {
      const coincideEstado = this.estadoFiltro === 'todos' || comprobante.estado === this.estadoFiltro;
      const contenido = [
        comprobante.numero,
        comprobante.placa,
        comprobante.conductor,
        comprobante.grifo,
        comprobante.ubicacion,
        comprobante.combustible,
      ].join(' ').toLocaleLowerCase('es');

      return coincideEstado && (!termino || contenido.includes(termino));
    });
  }

  porcentaje(item: AcumuladoVehiculo): number {
    return Math.min((item.consumido / item.tope) * 100, 100);
  }

  abrirConfirmacionEliminar(comprobante: Comprobante): void {
    this.comprobantePendienteEliminar = comprobante;
  }

  cerrarConfirmacionEliminar(): void {
    this.comprobantePendienteEliminar = null;
  }

  confirmarEliminarComprobante(): void {
    if (!this.comprobantePendienteEliminar) return;
    const id = this.comprobantePendienteEliminar.id;
    this.comprobantes = this.comprobantes.filter(comprobante => comprobante.id !== id);
    this.comprobantePendienteEliminar = null;
  }

  abrirEditor(comprobante: Comprobante): void {
    const [serie, ...numeroPartes] = comprobante.numero.split('-');
    const distrito = comprobante.ubicacion.split(',')[0]?.trim() || '';

    this.editorModo = 'editar';
    this.editor = {
      id: comprobante.id,
      placa: comprobante.placa,
      conductor: comprobante.conductor,
      tipoDocumento: comprobante.tipoDocumento || 'DNI',
      numeroDocumento: comprobante.numeroDocumento || (comprobante.placa === 'B2W-458' ? '45879621' : '41258963'),
      licencia: comprobante.licencia || (comprobante.placa === 'B2W-458' ? 'Q45879621' : 'Q41258963'),
      serie,
      numero: numeroPartes.join('-'),
      emision: this.fechaParaInput(comprobante.fecha),
      mes: this.mesDesdeFecha(comprobante.fecha),
      rucGrifo: comprobante.rucGrifo || (comprobante.grifo === 'Grifo El Sol S.A.C.' ? '20598765432' : '20487654321'),
      razonSocial: comprobante.grifo,
      direccion: comprobante.direccion || (distrito === 'Ate' ? 'Av. Nicolás Ayllón 2840' : 'Av. Separadora Industrial 1450'),
      departamento: comprobante.departamento || 'Lima',
      provincia: comprobante.provincia || 'Lima',
      distrito: comprobante.distrito || distrito,
      combustible: comprobante.combustible,
      ppm: comprobante.ppm,
      galones: comprobante.galones,
    };
    this.editorError = '';
    this.editorSubmitted = false;
  }

  abrirRegistro(): void {
    this.editorModo = 'crear';
    this.editor = {
      id: 0,
      placa: '',
      conductor: '',
      tipoDocumento: 'DNI',
      numeroDocumento: '',
      licencia: '',
      serie: 'F001',
      numero: '',
      emision: '',
      mes: '',
      rucGrifo: '',
      razonSocial: '',
      direccion: '',
      departamento: '',
      provincia: '',
      distrito: '',
      combustible: 'B5',
      ppm: 0,
      galones: 0,
    };
    this.editorError = '';
    this.editorSubmitted = false;
  }

  cerrarEditor(): void {
    this.editor = null;
    this.editorError = '';
    this.editorSubmitted = false;
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
    const value = this.editor.tipoDocumento === 'DNI'
      ? input.value.replace(/\D/g, '').slice(0, 8)
      : input.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
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
    if (!this.editor || !/^\d{4}-\d{2}-\d{2}$/.test(this.editor.emision)) return false;
    const [year, month, day] = this.editor.emision.split('-').map(Number);
    const selectedDate = new Date(`${this.editor.emision}T00:00:00`);
    const isRealDate = !Number.isNaN(selectedDate.getTime()) &&
      selectedDate.getFullYear() === year &&
      selectedDate.getMonth() + 1 === month &&
      selectedDate.getDate() === day;
    return isRealDate && this.editor.emision <= this.todayDate;
  }

  get isEditorMonthValid(): boolean {
    return !!this.editor && !!this.editor.mes && this.editor.mes === this.mesDesdeFecha(this.editor.emision);
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
    const digits = input.value.toUpperCase().replace(/^F/, '').replace(/\D/g, '').slice(0, 3);
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
    if (this.editor.emision > this.todayDate) this.editor.emision = this.todayDate;
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
    if (!modelo.placa || !modelo.galones || modelo.galones <= 0) {
      this.editorError = 'Completa la placa y una cantidad válida de galones.';
      return;
    }

    if (!this.isEditorDocumentoValid) {
      this.editorError = this.editorDocumentoHint;
      return;
    }

    if (!this.isEditorLicenseValid) {
      this.editorError = 'La licencia debe contener una letra seguida de 8 dígitos.';
      return;
    }

    if (!this.isEditorInvoiceSeriesValid) {
      this.editorError = 'La serie de la factura debe tener el formato F001.';
      return;
    }

    if (!this.isEditorInvoiceNumberValid) {
      this.editorError = 'El número de factura debe contener entre 1 y 8 dígitos.';
      return;
    }

    if (!this.isEditorEmissionValid) {
      this.editorError = 'Selecciona una fecha de emisión válida que no sea posterior al día de hoy.';
      return;
    }

    if (!this.isEditorMonthValid) {
      this.editorError = 'El mes debe corresponder a la fecha de emisión seleccionada.';
      return;
    }

    if (!this.isEditorStationRucValid) {
      this.editorError = 'El RUC del grifo debe tener 11 dígitos y un prefijo válido.';
      return;
    }

    const datosComprobante = {
      numero: `${modelo.serie.trim() || 'F001'}-${modelo.numero.trim()}`,
      fecha: this.fechaParaMostrar(modelo.emision),
      placa: modelo.placa,
      conductor: modelo.conductor.trim(),
      grifo: modelo.razonSocial.trim() || 'Estación pendiente de validación',
      ubicacion: [modelo.distrito, modelo.departamento].filter(Boolean).join(', ') || 'Ubicación pendiente',
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
      const nuevoId = Math.max(0, ...this.comprobantes.map(comprobante => comprobante.id)) + 1;
      this.comprobantes = [
        ...this.comprobantes,
        {
          id: nuevoId,
          ...datosComprobante,
          estado: 'pend',
          estadoLabel: 'En validación',
          estadoIcon: 'fa-clock',
        },
      ];
    } else {
      this.comprobantes = this.comprobantes.map(comprobante => comprobante.id === modelo.id
        ? { ...comprobante, ...datosComprobante }
        : comprobante);
    }

    this.cerrarEditor();
  }

  @HostListener('document:keydown.escape')
  cerrarConEscape(): void {
    if (this.comprobantePendienteEliminar) {
      this.cerrarConfirmacionEliminar();
    } else if (this.editor) {
      this.cerrarEditor();
    }
  }

  private mesDesdeFecha(fecha: string): string {
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
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
