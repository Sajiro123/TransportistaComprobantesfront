import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface MontoForma {
  codigo: 'A' | 'B';
  nombre: string;
  porcentaje: number;
  monto: number;
  tono: 'primary' | 'warn';
}

@Component({
  selector: 'app-declaracion-jurada',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './declaracion-jurada.component.html',
  styleUrl: './declaracion-jurada.component.scss',
})
export class DeclaracionJuradaComponent {
  aceptada = false;
  enviado = false;
  cargoDescargado = false;
  modificacionesRestantes = 1;
  comprobantesRegistrados = 7;
  placasRegistradas = 4;
  volumenRegistrado = '2,120.50 m³';
  razonSocial = 'Transportes Lima Sur S.A.C.';
  ruc = '20512345678';

  montos: MontoForma[] = [
    { codigo: 'A', nombre: 'Surtido directo', porcentaje: 18, monto: 1282, tono: 'primary' },
    { codigo: 'B', nombre: 'Compra a granel', porcentaje: 82, monto: 6000, tono: 'warn' },
  ];

  get totalSubsidio(): number {
    return this.montos.reduce((total, forma) => total + forma.monto, 0);
  }

  enviarDeclaracion(): void {
    if (!this.aceptada || this.enviado) return;
    this.enviado = true;
    this.cargoDescargado = false;
  }

  descargarCargo(): void {
    this.cargoDescargado = true;
  }

  modificarSolicitud(): void {
    if (this.modificacionesRestantes === 0) return;
    this.modificacionesRestantes--;
    this.enviado = false;
    this.aceptada = false;
    this.cargoDescargado = false;
  }
}
