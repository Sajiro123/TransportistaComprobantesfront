import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
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
  ComprobanteDetalleRequest
} from '../../../core/models/models';
import Swal from 'sweetalert2';

type Forma = 'A' | 'B';

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
  editor: any = null;
  archivoSeleccionado: File | null = null;
  
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
      Swal.fire('Error', 'No se pudo obtener el RUC del transportista. Inicie sesión nuevamente.', 'error');
    }
  }

  cargarCatalogos() {
    this.apiComprobante.listarTiposCombustible().subscribe(res => {
      if (res.data?.lista) this.tiposCombustible = res.data.lista;
    });
    this.apiComprobante.listarEstados().subscribe(res => {
      if (res.data?.lista) this.estados = res.data.lista;
    });
    this.apiComprobante.listarVehiculosAsociados(this.rucTransportista).subscribe(res => {
      if (res.data?.lista) {
        this.vehiculos = res.data.lista;
        this.calcularAcumuladosYAbastecidos();
      }
    });
    this.apiComprobante.listarDistribuidores().subscribe(res => {
      if (res.data?.lista) this.distribuidores = res.data.lista;
    });
  }

  listarComprobantes() {
    this.apiComprobante.listarComprobantes(
      this.rucTransportista, 
      undefined, 
      this.estadoFiltro === 'todos' ? undefined : this.estadoFiltro, 
      this.busqueda ? this.busqueda : undefined
    ).subscribe({
      next: (res) => {
        if (res.data?.lista) {
          this.comprobantes = res.data.lista;
        } else {
          this.comprobantes = [];
        }
      },
      error: () => {
        Swal.fire('Error', 'No se pudieron cargar los comprobantes.', 'error');
        this.comprobantes = [];
      }
    });
  }

  get comprobantesFiltrados(): ComprobanteListResponse[] {
    const termino = this.busqueda.trim().toLocaleLowerCase('es');

    return this.comprobantes.filter(c => {
      const coincideEstado = this.estadoFiltro === 'todos' || c.estadoComprobanteCodigo === this.estadoFiltro;
      if (!coincideEstado) return false;
      if (!termino) return true;
      
      const contenido = [
        c.numero,
        c.placa,
        c.nombreComercialDistribuidor,
        c.distritoDistribuidor,
        c.tipoCombustibleCodigo,
      ].join(' ').toLocaleLowerCase('es');

      return contenido.includes(termino);
    });
  }

  // --- Helpers UI Form B ---
  calcularAcumuladosYAbastecidos() {
    this.acumulados = this.vehiculos.map(v => ({
      placa: v.placa,
      consumido: 0, 
      tope: v.topeGalones
    }));
    this.vehiculosAbastecidos = this.vehiculos.map(v => ({
      placa: v.placa,
      subsidiable: v.esSubsidiable
    }));
  }

  porcentaje(item: any): number {
    if (!item.tope) return 0;
    return Math.min((item.consumido / item.tope) * 100, 100);
  }

  get totalGalonesMayorista(): number {
    return this.comprasMayorista.reduce((total, compra) => total + compra.galones, 0);
  }

  get cantidadSubsidiables(): number {
    return this.vehiculosAbastecidos.filter(v => v.subsidiable).length;
  }

  get factorProrrateo(): number {
    return this.vehiculosAbastecidos.length ? this.cantidadSubsidiables / this.vehiculosAbastecidos.length : 0;
  }

  get galonesSubsidiados(): number {
    return this.totalGalonesMayorista * this.factorProrrateo;
  }

  onFileSelected(event: any) {
    if (event.target.files && event.target.files.length > 0) {
      this.archivoSeleccionado = event.target.files[0];
    }
  }

  // --- Editor ---

  abrirRegistro(): void {
    this.editorModo = 'crear';
    this.archivoSeleccionado = null;
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
      mes: 'Junio',
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

  abrirEditor(item: ComprobanteListResponse): void {
    this.apiComprobante.obtenerComprobante(item.comprobanteUuid).subscribe({
      next: (res) => {
        if (res.data?.lista) {
          const c = res.data.lista;
          this.editorModo = 'editar';
          this.archivoSeleccionado = null;
          
          let p = '';
          if (c.tipoComprobanteCodigo === 'FORMA_A') {
             p = c.placa || (c.detalle && c.detalle.length > 0 ? c.detalle[0].placa : '');
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
      error: () => Swal.fire('Error', 'No se pudo cargar el detalle del comprobante.', 'error')
    });
  }

  cerrarEditor(): void {
    this.editor = null;
    this.editorError = '';
    this.archivoSeleccionado = null;
  }

  guardarEditor(): void {
    if (!this.editor) return;

    const modelo = this.editor;
    if (!modelo.serie || !modelo.numero || !modelo.galones || modelo.galones <= 0) {
      this.editorError = 'Completa la serie, el número y una cantidad válida de galones.';
      return;
    }

    if (this.editorModo === 'crear') {
      if (this.forma === 'A' && !this.archivoSeleccionado) {
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
        placas: []
      };

      if (this.forma === 'A') {
        const v = this.vehiculos.find(x => x.placa === modelo.placa);
        if (v) req.placas.push({ vehiculoUuid: v.vehiculoUuid, galonesAsignados: req.galones });
        
        this.apiComprobante.registrarComprobante(this.rucTransportista, req, this.archivoSeleccionado!).subscribe({
          next: () => {
            Swal.fire('Éxito', 'Comprobante Forma A registrado.', 'success');
            this.cerrarEditor();
            this.listarComprobantes();
          },
          error: (err) => {
            this.editorError = err.error?.data?.lista?.message || 'Error al registrar el comprobante.';
          }
        });
      } else {
        // Para Forma B (Granel)
        const reqB: ComprobanteBRequest = { ...req };
        this.apiComprobante.registrarComprobanteB(this.rucTransportista, reqB, this.archivoSeleccionado!).subscribe({
          next: () => {
            Swal.fire('Éxito', 'Comprobante Forma B registrado.', 'success');
            this.cerrarEditor();
            this.listarComprobantes();
          },
          error: (err) => {
            this.editorError = err.error?.data?.lista?.message || 'Error al registrar el comprobante.';
          }
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
        costo: Number(modelo.costo || 0)
      };

      this.apiComprobante.actualizarComprobante(modelo.uuid, reqActualizar).subscribe({
        next: () => {
          Swal.fire('Éxito', 'Comprobante actualizado.', 'success');
          this.cerrarEditor();
          this.listarComprobantes();
        },
        error: (err) => {
          this.editorError = err.error?.data?.lista?.message || 'Error al actualizar el comprobante.';
        }
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
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        this.apiComprobante.eliminarComprobante(uuid).subscribe({
          next: () => {
            Swal.fire('Eliminado', 'El comprobante ha sido eliminado.', 'success');
            this.listarComprobantes();
          },
          error: (err) => {
            Swal.fire('Error', err.error?.data?.lista?.message || 'Error al eliminar.', 'error');
          }
        });
      }
    });
  }

  @HostListener('document:keydown.escape')
  cerrarConEscape(): void {
    if (this.editor) this.cerrarEditor();
  }
}
