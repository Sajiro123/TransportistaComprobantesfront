import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

import {
  ComprobanteBRequest,
  ComprobanteCombustibleRequest,
  ComprobanteListResponse,
  NotaCreditoRequest,
  TipoCombustibleResponse,
  VehiculoAsociadoResponse,
} from '../../../core/models/models';
import { ApiAuthService } from '../../../core/services/api-auth.service';
import { ApiComprobanteService } from '../../../core/services/api-comprobante.service';
import { isValidRuc } from '../../../core/utils/validators';

type VistaFlujoB = 'compras' | 'placas';
type AlcanceNota = 'TOTAL' | 'PARCIAL';

interface CompraForm {
  serie: string;
  numero: string;
  fechaEmision: string;
  rucDistribuidor: string;
  tieneNotaCredito: boolean;
  serieNotaCredito: string;
  numeroNotaCredito: string;
}

interface CombustibleCompraForm {
  codigo: string;
  nombre: string;
  ppmMaximo: number;
  seleccionado: boolean;
  volumen: number | null;
}

interface NotaForm {
  serie: string;
  numero: string;
  fechaEmision: string;
  alcance: AlcanceNota;
  volumenAfectadoM3: number | null;
  motivo: string;
}

interface PlacaFlotaForm {
  vehiculoUuid: string;
  placa: string;
  categoria: string;
  combustible: string;
  volumen: number | null;
  subsidiable: boolean;
}

@Component({
  selector: 'app-notas-credito',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule],
  templateUrl: './flujo-b.component.html',
  styleUrl: './flujo-b.component.scss',
})
export class NotasCreditoComponent implements OnInit {
  private readonly apiComprobante = inject(ApiComprobanteService);
  private readonly apiAuth = inject(ApiAuthService);

  vistaActiva: VistaFlujoB = 'compras';
  rucTransportista = '';
  comprobantes: ComprobanteListResponse[] = [];
  vehiculos: VehiculoAsociadoResponse[] = [];
  tiposCombustible: TipoCombustibleResponse[] = [];
  cargando = false;
  busquedaFlota = '';
  placasFlota: PlacaFlotaForm[] = [];
  excelPlacasError = '';
  nombreExcelPlacas = '';

  mostrarCompra = false;
  compraError = '';
  guardandoCompra = false;
  archivoCompra: File | null = null;
  archivoNotaCompra: File | null = null;
  combustiblesCompra: CombustibleCompraForm[] = [];
  compra: CompraForm = this.nuevaCompra();

  comprobanteNota: ComprobanteListResponse | null = null;
  notaError = '';
  guardandoNota = false;
  nota: NotaForm = this.nuevaNota();

  ngOnInit(): void {
    const usuario = this.apiAuth.getUserFromSession();
    if (!usuario?.ruc) {
      Swal.fire('Error', 'No se pudo obtener el RUC del transportista. Inicie sesión nuevamente.', 'error');
      return;
    }

    this.rucTransportista = usuario.ruc;
    this.cargarDatos();
  }

  get comprasGranel(): ComprobanteListResponse[] {
    return this.comprobantes.filter((item) =>
      ['FORMA_B', 'B', 'CONSUMIDOR_DIRECTO'].includes(item.tipoComprobanteCodigo),
    );
  }

  get cantidadSubsidiables(): number {
    return this.placasFlota.filter((vehiculo) => vehiculo.subsidiable).length;
  }

  get factorProrrateo(): number {
    return this.placasFlota.length
      ? this.cantidadSubsidiables / this.placasFlota.length
      : 0;
  }

  get placasFlotaFiltradas(): PlacaFlotaForm[] {
    const termino = this.busquedaFlota.trim().toLocaleLowerCase('es');
    if (!termino) return this.placasFlota;
    return this.placasFlota.filter(
      (fila) =>
        fila.placa.toLocaleLowerCase('es').includes(termino) ||
        fila.categoria.toLocaleLowerCase('es').includes(termino),
    );
  }

  get volumenConformeFlota(): number {
    return this.placasFlota.reduce(
      (total, fila) =>
        total +
        (fila.combustible && Number(fila.volumen) > 0
          ? Number(fila.volumen)
          : 0),
      0,
    );
  }

  get registroFlotaCompleto(): boolean {
    return (
      this.placasFlota.length > 0 &&
      this.placasFlota.every(
        (fila) => !!fila.combustible && Number(fila.volumen) > 0,
      )
    );
  }

  get volumenTotal(): number {
    return this.comprasGranel
      .filter((item) => !item.tieneNotaCreditoActiva && item.estadoComprobanteCodigo !== 'INHABILITADO')
      .reduce((total, item) => total + Number(item.volumenM3 || 0), 0);
  }

  get volumenTotalCompra(): number {
    return this.combustiblesCompra
      .filter((item) => item.seleccionado)
      .reduce((total, item) => total + Number(item.volumen || 0), 0);
  }

  cargarDatos(): void {
    this.cargando = true;
    this.apiComprobante.listarComprobantes(this.rucTransportista).subscribe({
      next: (res) => {
        this.comprobantes = res.data?.lista || [];
        this.cargando = false;
      },
      error: () => {
        this.comprobantes = [];
        this.cargando = false;
        Swal.fire('Error', 'No se pudieron cargar las compras a granel.', 'error');
      },
    });

    this.apiComprobante.listarVehiculosAsociados(this.rucTransportista).subscribe({
      next: (res) => {
        this.vehiculos = res.data?.lista || [];
        this.inicializarPlacasFlota();
      },
      error: () => {
        this.vehiculos = [];
        this.placasFlota = [];
      },
    });

    this.apiComprobante.listarTiposCombustible().subscribe({
      next: (res) => (this.tiposCombustible = res.data?.lista || []),
      error: () => (this.tiposCombustible = []),
    });
  }

  async seleccionarExcelPlacas(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0] || null;
    input.value = '';
    this.excelPlacasError = '';
    if (!archivo) return;
    if (!/\.(xlsx|xls)$/i.test(archivo.name)) {
      this.excelPlacasError = 'Selecciona un archivo Excel .xlsx o .xls.';
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
      if (!registros.length) throw new Error('El Excel no contiene filas para importar.');

      const placasImportadas = new Set<string>();
      const actualizaciones = registros.map((registro, indice) => {
        const fila = Object.entries(registro).reduce<Record<string, unknown>>(
          (resultado, [clave, valor]) => {
            resultado[this.normalizarEncabezado(clave)] = valor;
            return resultado;
          },
          {},
        );
        const placa = String(fila['placa'] || '').trim().toUpperCase();
        const combustibleTexto = String(
          fila['combustible'] || fila['comb'] || '',
        ).trim();
        const volumen = Number(
          String(fila['volumenm3'] ?? fila['volumen'] ?? '').replace(',', '.'),
        );
        const combustible =
          this.tiposCombustible.find(
            (tipo) =>
              tipo.codigo.toLowerCase() === combustibleTexto.toLowerCase() ||
              tipo.nombre.toLowerCase() === combustibleTexto.toLowerCase(),
          )?.codigo || '';
        const vehiculo = this.vehiculos.find((item) => item.placa === placa);
        if (!vehiculo) {
          throw new Error(`Fila ${indice + 2}: la placa no pertenece a tu flota.`);
        }
        if (placasImportadas.has(placa)) {
          throw new Error(`Fila ${indice + 2}: la placa está duplicada.`);
        }
        if (!combustible) {
          throw new Error(`Fila ${indice + 2}: el combustible no es válido.`);
        }
        if (!Number.isFinite(volumen) || volumen <= 0) {
          throw new Error(`Fila ${indice + 2}: el volumen debe ser mayor a cero.`);
        }
        placasImportadas.add(placa);
        return {
          placa,
          combustible,
          volumen,
          subsidiable: this.valorBooleanoExcel(
            fila['subsidiable'] ?? fila['qa'],
            vehiculo.esSubsidiable,
          ),
        };
      });

      this.placasFlota = this.placasFlota.map((fila) => {
        const importada = actualizaciones.find(
          (actualizacion) => actualizacion.placa === fila.placa,
        );
        return importada ? { ...fila, ...importada } : fila;
      });
      this.nombreExcelPlacas = archivo.name;
    } catch (error) {
      this.excelPlacasError =
        error instanceof Error ? error.message : 'No se pudo leer el archivo Excel.';
    }
  }

  private inicializarPlacasFlota(): void {
    const combustibleInicial = this.tiposCombustible[0]?.codigo || 'B5';
    this.placasFlota = this.vehiculos.map((vehiculo) => ({
      vehiculoUuid: vehiculo.vehiculoUuid,
      placa: vehiculo.placa,
      categoria:
        vehiculo.categoriaCodigo ||
        vehiculo.categoriaNombre ||
        'Sin categoría',
      combustible: combustibleInicial,
      volumen: null,
      subsidiable: vehiculo.esSubsidiable,
    }));
  }

  private normalizarEncabezado(valor: string): string {
    return valor
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  private valorBooleanoExcel(valor: unknown, predeterminado: boolean): boolean {
    if (valor === '' || valor === null || valor === undefined) return predeterminado;
    return ['1', 'si', 'sí', 'true', 'x'].includes(
      String(valor).trim().toLocaleLowerCase('es'),
    );
  }

  abrirRegistroCompra(): void {
    this.compra = this.nuevaCompra();
    this.combustiblesCompra = this.crearCombustiblesCompra();
    this.archivoCompra = null;
    this.archivoNotaCompra = null;
    this.compraError = '';
    this.mostrarCompra = true;
  }

  cerrarRegistroCompra(): void {
    if (!this.guardandoCompra) this.mostrarCompra = false;
  }

  seleccionarArchivo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0] || null;
    input.value = '';
    if (!archivo) return;

    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(archivo.type)) {
      this.archivoCompra = null;
      this.compraError = 'Selecciona un archivo PDF o una imagen JPG/PNG.';
      return;
    }
    if (archivo.size > 5 * 1024 * 1024) {
      this.archivoCompra = null;
      this.compraError = 'El comprobante no puede superar los 5 MB.';
      return;
    }

    this.archivoCompra = archivo;
    this.compraError = '';
  }

  seleccionarArchivoNotaCompra(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0] || null;
    input.value = '';
    if (!archivo) return;
    const error = this.validarArchivoComprobante(archivo);
    if (error) {
      this.archivoNotaCompra = null;
      this.compraError = error;
      return;
    }
    this.archivoNotaCompra = archivo;
    this.compraError = '';
  }

  cambiarNotaCreditoCompra(valor: boolean): void {
    this.compra.tieneNotaCredito = valor;
    if (!valor) {
      this.compra.serieNotaCredito = '';
      this.compra.numeroNotaCredito = '';
      this.archivoNotaCompra = null;
    }
  }

  cambiarCombustibleCompra(
    combustible: CombustibleCompraForm,
    seleccionado: boolean,
  ): void {
    combustible.seleccionado = seleccionado;
    if (!seleccionado) combustible.volumen = null;
  }

  registrarCompra(): void {
    const form = this.compra;
    const combustiblesSeleccionados = this.combustiblesCompra.filter(
      (item) => item.seleccionado,
    );
    if (
      !/^F\d{3}$/.test(form.serie.trim().toUpperCase()) ||
      !/^\d{1,8}$/.test(form.numero.trim()) ||
      !form.fechaEmision ||
      form.fechaEmision > this.fechaLocal() ||
      !isValidRuc(form.rucDistribuidor.trim()) ||
      !combustiblesSeleccionados.length ||
      combustiblesSeleccionados.some((item) => Number(item.volumen) <= 0) ||
      !this.archivoCompra
    ) {
      this.compraError = 'Completa los campos obligatorios y adjunta el comprobante.';
      return;
    }
    if (combustiblesSeleccionados.length > 1) {
      this.compraError =
        'El servicio actual admite un solo combustible por comprobante. Registra cada combustible en una compra independiente.';
      return;
    }
    if (
      form.tieneNotaCredito &&
      (!/^N?C[A-Z0-9]{1,3}$/.test(form.serieNotaCredito.trim().toUpperCase()) ||
        !/^\d{1,8}$/.test(form.numeroNotaCredito.trim()) ||
        !this.archivoNotaCompra)
    ) {
      this.compraError =
        'Completa la serie, el número y el archivo de la Nota de Crédito.';
      return;
    }
    const combustible = combustiblesSeleccionados[0];

    const combustibles: ComprobanteCombustibleRequest[] = combustiblesSeleccionados.map(
      (item) => ({ codigo: item.codigo, volumenM3: Number(item.volumen) }),
    );

    const request: ComprobanteBRequest = {
      serie: form.serie.trim().toUpperCase(),
      numero: form.numero.trim(),
      fechaEmision: form.fechaEmision,
      mes: this.mesDesdeFecha(form.fechaEmision),
      anio: Number(form.fechaEmision.slice(0, 4)),
      rucDistribuidor: form.rucDistribuidor.trim(),
      combustibles,
      tieneNotaCredito: form.tieneNotaCredito,
      serieNc: form.tieneNotaCredito ? form.serieNotaCredito.trim().toUpperCase() : undefined,
      numeroNc: form.tieneNotaCredito ? form.numeroNotaCredito.trim() : undefined,
    };

    this.guardandoCompra = true;
    this.compraError = '';
    this.apiComprobante
      .registrarComprobanteB(
        this.rucTransportista,
        request,
        this.archivoCompra,
        form.tieneNotaCredito ? this.archivoNotaCompra : null,
      )
      .subscribe({
        next: () => {
          this.guardandoCompra = false;
          this.mostrarCompra = false;
          this.cargarDatos();
          Swal.fire('Compra registrada', 'El comprobante se envió para validación.', 'success');
        },
        error: (err) => {
          this.guardandoCompra = false;
          this.compraError =
            err?.error?.data?.lista?.message || 'No se pudo registrar la compra a granel.';
        },
      });
  }

  abrirNotaCredito(comprobante: ComprobanteListResponse): void {
    if (comprobante.tieneNotaCreditoActiva) return;
    this.comprobanteNota = comprobante;
    this.nota = this.nuevaNota();
    this.notaError = '';
  }

  cerrarNotaCredito(): void {
    if (!this.guardandoNota) this.comprobanteNota = null;
  }

  registrarNota(): void {
    if (!this.comprobanteNota) return;
    const form = this.nota;
    if (
      !/^(F|N)[A-Z0-9]{0,3}$/.test(form.serie.trim().toUpperCase()) ||
      !/^\d{1,8}$/.test(form.numero.trim()) ||
      !form.fechaEmision ||
      !form.motivo.trim() ||
      (form.alcance === 'PARCIAL' && Number(form.volumenAfectadoM3) <= 0)
    ) {
      this.notaError = 'Completa los datos obligatorios de la nota de crédito.';
      return;
    }

    const request: NotaCreditoRequest = {
      comprobanteUuid: this.comprobanteNota.comprobanteUuid,
      serieNc: form.serie.trim().toUpperCase(),
      numeroNc: form.numero.trim(),
      fechaEmisionNc: form.fechaEmision,
      motivo: form.motivo.trim(),
      alcance: form.alcance,
      volumenAfectadoM3:
        form.alcance === 'PARCIAL' ? Number(form.volumenAfectadoM3) : undefined,
      mes: this.mesDesdeFecha(form.fechaEmision),
    };

    this.guardandoNota = true;
    this.notaError = '';
    this.apiComprobante.registrarNotaCredito(request).subscribe({
      next: () => {
        this.guardandoNota = false;
        this.comprobanteNota = null;
        this.cargarDatos();
        Swal.fire('Nota registrada', 'La factura quedó actualizada correctamente.', 'success');
      },
      error: (err) => {
        this.guardandoNota = false;
        this.notaError =
          err?.error?.data?.lista?.message || 'No se pudo registrar la nota de crédito.';
      },
    });
  }

  retirar(comprobante: ComprobanteListResponse): void {
    Swal.fire({
      title: '¿Retirar comprobante?',
      text: `${comprobante.serie}-${comprobante.numero}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, retirar',
      cancelButtonText: 'Cancelar',
      buttonsStyling: false,
      customClass: {
        actions: 'atu-delete-confirmation-actions',
        confirmButton: 'atu-delete-confirmation-submit',
        cancelButton: 'atu-delete-confirmation-cancel',
      },
    }).then((resultado) => {
      if (!resultado.isConfirmed) return;
      this.apiComprobante.eliminarComprobante(comprobante.comprobanteUuid).subscribe({
        next: () => {
          this.cargarDatos();
          Swal.fire('Retirado', 'El comprobante fue eliminado.', 'success');
        },
        error: (err) =>
          Swal.fire(
            'Error',
            err?.error?.data?.lista?.message || 'No se pudo retirar el comprobante.',
            'error',
          ),
      });
    });
  }

  fechaVisible(fecha: string): string {
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      const [anio, mes, dia] = fecha.split('-');
      return `${dia}/${mes}/${anio}`;
    }
    return fecha || '—';
  }

  proveedorConforme(item: ComprobanteListResponse): boolean {
    return !['OBSERVADO', 'INHABILITADO'].includes(item.estadoComprobanteCodigo);
  }

  mensajeValidacion(item: ComprobanteListResponse): string {
    if (item.tieneNotaCreditoActiva) {
      return 'Esta factura tiene una nota de crédito activa que la corrige o anula. Mientras la N/C esté vigente, sus galones no se consideran.';
    }
    if (item.estadoComprobanteCodigo === 'CONFORME') {
      return 'El comprobante existe en SUNAT y el proveedor está inscrito y vigente en Osinergmin. Su volumen entra al cálculo con prorrateo.';
    }
    if (item.estadoComprobanteCodigo === 'PENDIENTE') {
      return 'El comprobante está en proceso de validación con SUNAT y Osinergmin.';
    }
    return 'El comprobante presenta observaciones. Revisa el RUC del proveedor, el combustible declarado y su vigencia en Osinergmin.';
  }

  private nuevaCompra(): CompraForm {
    return {
      serie: 'F050',
      numero: '',
      fechaEmision: this.fechaLocal(),
      rucDistribuidor: '',
      tieneNotaCredito: false,
      serieNotaCredito: '',
      numeroNotaCredito: '',
    };
  }

  private crearCombustiblesCompra(): CombustibleCompraForm[] {
    const catalogo = this.tiposCombustible.length
      ? this.tiposCombustible
      : [
          { codigo: 'B5', nombre: 'B5', ppmMaximo: 50 },
          { codigo: 'B20', nombre: 'B20', ppmMaximo: 50 },
        ];
    return catalogo.map((tipo, indice) => ({
      codigo: tipo.codigo,
      nombre: tipo.nombre,
      ppmMaximo: tipo.ppmMaximo,
      seleccionado: indice === 0,
      volumen: null,
    }));
  }

  private validarArchivoComprobante(archivo: File): string {
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(archivo.type)) {
      return 'Selecciona un archivo PDF o una imagen JPG/PNG.';
    }
    if (archivo.size > 5 * 1024 * 1024) {
      return 'El archivo no puede superar los 5 MB.';
    }
    return '';
  }

  private nuevaNota(): NotaForm {
    return {
      serie: 'NC01',
      numero: '',
      fechaEmision: this.fechaLocal(),
      alcance: 'TOTAL',
      volumenAfectadoM3: null,
      motivo: '',
    };
  }

  private fechaLocal(): string {
    const fecha = new Date();
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  private mesDesdeFecha(fecha: string): string {
    const meses = [
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
    return meses[Number(fecha.slice(5, 7)) - 1] || '';
  }
}
