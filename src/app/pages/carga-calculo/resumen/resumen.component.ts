import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

type FormaResumen = 'A' | 'B';

interface ResumenForma {
  codigo: FormaResumen;
  titulo: string;
  descripcion: string;
  total: number;
  validados: number;
  pendientes: number;
  observados: number;
}

interface ResumenMes {
  mes: string;
  volumenM3: number;
  monto: number;
}

interface Observacion {
  comprobante: string;
  estado: string;
  detalle: string;
}

@Component({
  selector: 'app-resumen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './resumen.component.html',
  styleUrl: './resumen.component.scss',
})
export class ResumenComponent {
  formaActiva: FormaResumen = 'A';

  formas: ResumenForma[] = [
    { codigo: 'A', titulo: 'Surtido directo', descripcion: 'Comprobantes con placa', total: 4, validados: 1, pendientes: 0, observados: 3 },
    { codigo: 'B', titulo: 'Consumidor directo', descripcion: 'Compras a granel', total: 2, validados: 2, pendientes: 0, observados: 0 },
  ];

  detalle: Record<FormaResumen, ResumenMes[]> = {
    A: [{ mes: 'Junio', volumenM3: 320.5, monto: 1282 }],
    B: [
      { mes: 'Junio', volumenM3: 1000, monto: 4000 },
      { mes: 'Julio', volumenM3: 500, monto: 2000 },
    ],
  };

  observaciones: Observacion[] = [
    {
      comprobante: 'F001-0001450',
      estado: 'Inhabilitado por N/C',
      detalle: 'Esta factura tiene una nota de crédito activa (F002-0091) que la corrige o anula. Mientras la N/C esté vigente, la factura queda inhabilitada y sus galones no se consideran.',
    },
    {
      comprobante: 'F002-0000087',
      estado: 'Observado',
      detalle: 'El combustible declarado supera 50 ppm de azufre (62 ppm). Solo se subsidia diésel B5/B20 con azufre ≤50 ppm.',
    },
    {
      comprobante: 'F001-0001600',
      estado: 'Observado',
      detalle: 'El grifo emisor no figura inscrito en Osinergmin. Verifica el RUC del grifo o solicita el comprobante a un establecimiento autorizado.',
    },
  ];

  get mesesActivos(): ResumenMes[] {
    return this.detalle[this.formaActiva];
  }

  get subtotalActivo(): number {
    return this.mesesActivos.reduce((total, item) => total + item.monto, 0);
  }

  get totalSubsidio(): number {
    return Object.values(this.detalle).flat().reduce((total, item) => total + item.monto, 0);
  }

  seleccionarForma(forma: FormaResumen): void {
    this.formaActiva = forma;
  }
}
